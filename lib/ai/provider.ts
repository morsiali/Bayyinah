// Replaceable model-provider interface. Server-only: keys never reach the browser.
// Provider selection (first match wins):
//   AI_PROVIDER=anthropic|openai|abacus|local   explicit choice
//   ANTHROPIC_API_KEY set                       → anthropic
//   OPENAI_API_KEY set                          → openai (or any OpenAI-compatible endpoint via OPENAI_BASE_URL)
//   ABACUSAI_API_KEY set                        → abacus (OpenAI-compatible RouteLLM endpoint)
//   otherwise                                   → local rules analyzer (no external processing)

import { prisma } from '@/lib/db';
import { newErrorRef } from '@/lib/errors';

export type ProviderKind = 'anthropic' | 'openai' | 'abacus' | 'local';

export type ProviderConfig = {
  kind: ProviderKind;
  model: string;
  label: string;
  external: boolean;
};

export function getProviderConfig(): ProviderConfig {
  const explicit = (process.env.AI_PROVIDER || '').toLowerCase() as ProviderKind | '';
  const kind: ProviderKind =
    explicit && ['anthropic', 'openai', 'abacus', 'local'].includes(explicit)
      ? (explicit as ProviderKind)
      : process.env.ANTHROPIC_API_KEY
        ? 'anthropic'
        : process.env.OPENAI_API_KEY
          ? 'openai'
          : process.env.ABACUSAI_API_KEY
            ? 'abacus'
            : 'local';
  switch (kind) {
    case 'anthropic':
      return { kind, model: process.env.AI_MODEL || 'claude-sonnet-4-5', label: 'Anthropic Claude', external: true };
    case 'openai':
      return { kind, model: process.env.AI_MODEL || 'gpt-4o-mini', label: 'OpenAI-compatible API', external: true };
    case 'abacus':
      return { kind, model: process.env.AI_MODEL || 'gpt-5.4-mini', label: 'Abacus.AI RouteLLM', external: true };
    default:
      return { kind: 'local', model: 'bayyinah-rules-analyzer-2', label: 'Local rules analyzer (no AI provider configured)', external: false };
  }
}

export type CompletionArgs = { system: string; user: string; json: boolean; maxTokens: number; timeoutMs: number };
export type CompletionResult = { text: string; usage: { inputTokens?: number; outputTokens?: number } };

export class ModelCallError extends Error {
  constructor(
    public code: 'TIMEOUT' | 'RATE_LIMITED' | 'AUTH' | 'UPSTREAM_5XX' | 'UPSTREAM_ERROR' | 'NOT_CONFIGURED' | 'INVALID_OUTPUT',
    message: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) {
      // Never surface provider bodies to users; they may echo request content.
      if (res.status === 429) throw new ModelCallError('RATE_LIMITED', 'The model provider is rate-limiting requests.', true);
      if (res.status === 401 || res.status === 403) throw new ModelCallError('AUTH', 'The model provider rejected the API key.', false);
      if (res.status >= 500) throw new ModelCallError('UPSTREAM_5XX', `The model provider returned ${res.status}.`, true);
      throw new ModelCallError('UPSTREAM_ERROR', `The model provider returned ${res.status}.`, false);
    }
    return (await res.json()) as any;
  } catch (e: any) {
    if (e instanceof ModelCallError) throw e;
    if (e?.name === 'AbortError') throw new ModelCallError('TIMEOUT', 'The model call timed out.', true);
    throw new ModelCallError('UPSTREAM_ERROR', 'The model provider could not be reached.', true);
  } finally {
    clearTimeout(t);
  }
}

async function callOnce(cfg: ProviderConfig, a: CompletionArgs): Promise<CompletionResult> {
  if (cfg.kind === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new ModelCallError('NOT_CONFIGURED', 'ANTHROPIC_API_KEY is not set.', false);
    const data = await postJson(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      { model: cfg.model, max_tokens: a.maxTokens, system: a.system, messages: [{ role: 'user', content: a.user }] },
      a.timeoutMs,
    );
    const text = (data?.content ?? []).filter((c: any) => c?.type === 'text').map((c: any) => c.text).join('');
    return { text, usage: { inputTokens: data?.usage?.input_tokens, outputTokens: data?.usage?.output_tokens } };
  }
  if (cfg.kind === 'openai' || cfg.kind === 'abacus') {
    const key = cfg.kind === 'openai' ? process.env.OPENAI_API_KEY : process.env.ABACUSAI_API_KEY;
    if (!key) throw new ModelCallError('NOT_CONFIGURED', 'The provider API key is not set.', false);
    const base = cfg.kind === 'openai' ? (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1') : 'https://apps.abacus.ai/v1';
    const body: any = {
      model: cfg.model,
      max_tokens: a.maxTokens,
      messages: [
        { role: 'system', content: a.system },
        { role: 'user', content: a.user },
      ],
    };
    if (a.json) body.response_format = { type: 'json_object' };
    const data = await postJson(`${base.replace(/\/$/, '')}/chat/completions`, { authorization: `Bearer ${key}` }, body, a.timeoutMs);
    const text = data?.choices?.[0]?.message?.content ?? '';
    const u = data?.usage ?? {};
    return { text, usage: { inputTokens: u.prompt_tokens ?? u.input_tokens, outputTokens: u.completion_tokens ?? u.output_tokens } };
  }
  throw new ModelCallError('NOT_CONFIGURED', 'No external model provider is configured.', false);
}

/** One call with at most one retry for transient failures. Logs sanitized metadata only. */
export async function complete(
  cfg: ProviderConfig,
  args: CompletionArgs,
  meta: { orgId?: string; purpose: 'analysis' | 'review_summary' },
): Promise<CompletionResult> {
  const started = Date.now();
  let lastErr: ModelCallError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await callOnce(cfg, args);
      if (!r.text.trim()) throw new ModelCallError('INVALID_OUTPUT', 'The model returned an empty response.', true);
      await prisma.modelCallLog
        .create({ data: { orgId: meta.orgId, purpose: meta.purpose, provider: cfg.kind, model: cfg.model, status: 'SUCCESS', durationMs: Date.now() - started, inputTokens: r.usage.inputTokens ?? null, outputTokens: r.usage.outputTokens ?? null } })
        .catch(() => undefined);
      return r;
    } catch (e: any) {
      lastErr = e instanceof ModelCallError ? e : new ModelCallError('UPSTREAM_ERROR', 'Unexpected model error.', false);
      if (!lastErr.retryable || attempt === 1) break;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  const ref = newErrorRef();
  console.error(`[model] ${ref} provider=${cfg.kind} model=${cfg.model} purpose=${meta.purpose} code=${lastErr?.code}`);
  await prisma.modelCallLog
    .create({ data: { orgId: meta.orgId, purpose: meta.purpose, provider: cfg.kind, model: cfg.model, status: 'FAILED', errorCode: lastErr?.code, errorRef: ref, durationMs: Date.now() - started } })
    .catch(() => undefined);
  (lastErr as any).ref = ref;
  throw lastErr!;
}

/** Pulls the first JSON object out of a model response (tolerates code fences). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new ModelCallError('INVALID_OUTPUT', 'The model response did not contain JSON.', false);
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new ModelCallError('INVALID_OUTPUT', 'The model response was not valid JSON.', false);
  }
}

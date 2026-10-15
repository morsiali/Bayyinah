// Runs the labeled evaluation set through the configured analyzer (or AI_PROVIDER=local).
// Reports per-case pass/fail on explicit expectations only. It does not compute accuracy metrics.
//   npm run eval            (uses the configured provider)
//   AI_PROVIDER=local npm run eval
import './load-env';
import { readFileSync } from 'node:fs';
import { analysisOutputSchema } from '../lib/analysis/schema';
import { analyzeLocally } from '../lib/analysis/local-analyzer';
import { SYSTEM_PROMPT, verifyCitations, normalizeFields } from '../lib/services/analysis';
import { complete, extractJson, getProviderConfig } from '../lib/ai/provider';
import { cleanFields } from '../lib/analysis/schema';
import { prisma } from '../lib/db';

type Case = { id: string; lang: string; requestType: string; text: string; expect: { type: string | null; fields: Record<string, string | null>; mustFlag: string[]; mustNotFlag: string[] } };

async function analyze(c: Case) {
  const cfg = getProviderConfig();
  const sources = [{ id: 'doc', alias: 'S1', kind: 'pasted_text', text: c.text }];
  if (cfg.kind === 'local') return { cfg, out: analyzeLocally([{ id: 'S1', text: c.text }], c.requestType as any) };
  const user = `<case_context>\nCase type declared by the preparer: ${c.requestType.toLowerCase()}\nSupplier name on file: (evaluation)\n</case_context>\n\n<source id="S1" kind="pasted_text">\n${c.text}\n</source>\n\nReturn the JSON object now.`;
  const r = await complete(cfg, { system: SYSTEM_PROMPT, user, json: true, maxTokens: 2500, timeoutMs: 60000 }, { purpose: 'analysis' });
  const out = analysisOutputSchema.parse(extractJson(r.text));
  const { kept, rejected } = verifyCitations(out, sources);
  return { cfg, out: { ...out, findings: kept as any }, rejected };
}

async function main() {
  const cases: Case[] = JSON.parse(readFileSync('evals/cases.json', 'utf8'));
  let pass = 0;
  for (const c of cases) {
    const problems: string[] = [];
    try {
      const { cfg, out, rejected } = (await analyze(c)) as any;
      const fields = normalizeFields(cleanFields(out.extractedFields));
      if (c.expect.type && out.requestType !== c.expect.type) problems.push(`type ${out.requestType} ≠ ${c.expect.type}`);
      for (const [k, v] of Object.entries(c.expect.fields)) {
        const got = (fields as any)[k] ?? null;
        if (v === null ? got !== null : got !== v) problems.push(`${k}: got ${JSON.stringify(got)}, expected ${JSON.stringify(v)}`);
      }
      const cats = new Set(out.findings.map((f: any) => f.category));
      for (const m of c.expect.mustFlag) if (!cats.has(m)) problems.push(`missing flag ${m}`);
      for (const m of c.expect.mustNotFlag) if (cats.has(m)) problems.push(`unexpected flag ${m}`);
      console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${c.id.padEnd(26)} [${cfg.kind}/${cfg.model}] flags=${[...cats].join(',') || '—'}${rejected ? ` rejectedCitations=${rejected}` : ''}${problems.length ? `\n      ${problems.join('\n      ')}` : ''}`);
    } catch (e: any) {
      problems.push(e?.message ?? 'error');
      console.log(`FAIL  ${c.id.padEnd(26)} error: ${e?.message}`);
    }
    if (!problems.length) pass++;
  }
  console.log(`\n${pass} of ${cases.length} labeled cases met every expectation. (Small hand-written set — not an accuracy measurement.)`);
}
main().finally(() => prisma.$disconnect());

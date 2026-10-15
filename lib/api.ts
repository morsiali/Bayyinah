import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, newErrorRef } from '@/lib/errors';

/** Hosts this deployment answers on: the request host, any proxy-forwarded host, APP_URL and a GitHub Codespaces forward. */
function allowedHosts(req: Request): Set<string> {
  const hosts = new Set<string>();
  const add = (h: string | null | undefined) => h && h.split(',').forEach((x) => hosts.add(x.trim().toLowerCase()));
  add(req.headers.get('host'));
  add(req.headers.get('x-forwarded-host'));
  if (process.env.APP_URL) {
    try {
      add(new URL(process.env.APP_URL).host);
    } catch {
      /* ignore malformed APP_URL */
    }
  }
  if (process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
    add(`${process.env.CODESPACE_NAME}-${process.env.PORT || 3000}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`);
  }
  return hosts;
}

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite=Lax cookies). */
function checkOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw new AppError('FORBIDDEN', 'Cross-site request rejected.');
  }
  if (!allowedHosts(req).has(originHost)) throw new AppError('FORBIDDEN', 'Cross-site request rejected.');
}

export function errorResponse(e: unknown) {
  if (e instanceof AppError) return NextResponse.json({ error: e.message, code: e.code, details: e.details ?? [] }, { status: e.status });
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid input.', code: 'VALIDATION', details: e.issues.map((i) => i.message), field: first?.path.join('.') }, { status: 400 });
  }
  const ref = newErrorRef();
  console.error(`[api] ${ref}`, e instanceof Error ? `${e.name}: ${e.message}` : 'unknown error');
  return NextResponse.json({ error: `Something went wrong on our side. Your saved work is unaffected. Reference ${ref}.`, code: 'INTERNAL', ref }, { status: 500 });
}

type Handler<P> = (req: Request, params: P) => Promise<unknown>;

export function route<P = Record<string, string>>(fn: Handler<P>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') checkOrigin(req);
      const params = (ctx?.params ? await ctx.params : {}) as P;
      const out = await fn(req, params);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    throw new AppError('VALIDATION', 'The request body must be JSON.');
  }
}

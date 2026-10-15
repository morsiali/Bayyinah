'use client';
import { translateText } from '@/lib/i18n/core';

/** Interface language of the current page (set on <html lang>). */
const tr = (s: string) => (typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? translateText('ar', s) : s);

export class ApiError extends Error {
  constructor(message: string, public code?: string, public details: string[] = [], public field?: string) {
    super(message);
  }
}

/** JSON (or multipart) call to our own API. Throws ApiError with the server's user-facing message. */
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? 'POST',
      headers: opts.form ? undefined : { 'content-type': 'application/json' },
      body: opts.form ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(tr('Could not reach the server. Check your connection and try again.'), 'NETWORK');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(tr(data?.error ?? `Request failed (${res.status}).`), data?.code, (data?.details ?? []).map(tr), data?.field);
  return data as T;
}

import { LOCALE_COOKIE, isLocale } from '@/lib/i18n/core';
import { safeNextPath } from '@/lib/i18n/next-path';

// GET /api/locale?set=ar&next=/app — stores the interface language and returns to the same page.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const set = url.searchParams.get('set');
  const next = safeNextPath(url.searchParams.get('next'));
  const headers = new Headers({ Location: next, 'Cache-Control': 'no-store' });
  if (isLocale(set)) {
    const secure = url.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
    headers.append('Set-Cookie', `${LOCALE_COOKIE}=${set}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`);
  }
  // Relative Location keeps the visitor on the address they used (proxies, Codespaces).
  return new Response(null, { status: 303, headers });
}

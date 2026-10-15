import { DEFAULT_LOCALE, isLocale, type Locale } from './core';

/** Locale from raw Cookie / Accept-Language headers (route handlers, tests). The cookie wins. */
export function localeFromHeaders(cookieHeader: string | null, acceptLanguage: string | null): Locale {
  const m = /(?:^|;\s*)bayyinah_locale=(en|ar)\b/.exec(cookieHeader ?? '');
  if (m && isLocale(m[1])) return m[1];
  return /^\s*ar\b/i.test(acceptLanguage ?? '') ? 'ar' : DEFAULT_LOCALE;
}
export const localeOf = (req: Request) => localeFromHeaders(req.headers.get('cookie'), req.headers.get('accept-language'));

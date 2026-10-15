// Request locale for server components and route handlers.
import { cookies, headers } from 'next/headers';
import { IS_STATIC_SITE } from '@/lib/site';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale } from './core';
import { localeFromHeaders } from './headers';

export async function getLocale(): Promise<Locale> {
  // The static showcase is built once per language; never read request data there.
  if (IS_STATIC_SITE) return isLocale(process.env.NEXT_PUBLIC_STATIC_LOCALE) ? process.env.NEXT_PUBLIC_STATIC_LOCALE : DEFAULT_LOCALE;
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  return localeFromHeaders(null, (await headers()).get('accept-language'));
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}

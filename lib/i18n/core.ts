// Translation core. English text is the key (gettext style); Arabic lives in ./ar.ts.
// Pure module: safe for server components, client components, services and tests.
import { AR } from './ar';
import { AR_PATTERNS } from './ar-patterns';

export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'bayyinah_locale';
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', ar: 'العربية' };

export const isLocale = (v: unknown): v is Locale => v === 'en' || v === 'ar';
export const dirOf = (l: Locale) => (l === 'ar' ? 'rtl' : 'ltr');

export type Vars = Record<string, string | number | null | undefined>;
export type T = (key: string, vars?: Vars) => string;

export function fill(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}

/** Translate a known UI string. Unknown keys fall back to English (never to an empty string). */
export function translate(locale: Locale, key: string, vars?: Vars) {
  return fill(locale === 'ar' ? (AR[key] ?? key) : key, vars);
}

export const makeT = (locale: Locale): T => (key, vars) => translate(locale, key, vars);

/**
 * Translate free text produced on the server (error messages, rule explanations, requirement details,
 * agent summaries). Exact matches first, then parameterised patterns. Unknown text is returned unchanged.
 */
export function translateText(locale: Locale, text: string | null | undefined): string {
  if (!text) return text ?? '';
  if (locale === 'en') return text;
  const exact = AR[text];
  if (exact) return exact;
  for (const p of AR_PATTERNS) {
    const m = text.match(p.re);
    if (m) return p.to(m, (s) => translateText(locale, s));
  }
  return text;
}

const INTL: Record<Locale, string> = { en: 'en-GB', ar: 'ar-AE-u-nu-latn' };
export const intlLocale = (l: Locale) => INTL[l];

/** Dates are always shown in UAE time. Digits stay Latin in Arabic so they match amounts and IBANs. */
export function formatDate(locale: Locale, d: Date | string | number, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) {
  return new Date(d).toLocaleString(INTL[locale], { timeZone: 'Asia/Dubai', ...opts });
}
export function formatNumber(locale: Locale, n: number) {
  return n.toLocaleString(locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-US');
}

/** Marks a string as translatable where it is defined (translated later with t(value)). Identity at runtime. */
export const msg = <S extends string>(s: S): S => s;

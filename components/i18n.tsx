'use client';

import { createContext, useContext, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';
import { DEFAULT_LOCALE, formatDate, makeT, translateText, type Locale, type T } from '@/lib/i18n/core';
import { cx } from '@/lib/cx';

type Ctx = { locale: Locale; t: T; tx: (text: string | null | undefined) => string; date: (d: Date | string | number, o?: Intl.DateTimeFormatOptions) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<Ctx>(
    () => ({ locale, t: makeT(locale), tx: (s) => translateText(locale, s), date: (d, o) => formatDate(locale, d, o) }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (c) return c;
  // Outside the provider (isolated tests): English.
  return { locale: DEFAULT_LOCALE, t: makeT(DEFAULT_LOCALE), tx: (s) => s ?? '', date: (d, o) => formatDate(DEFAULT_LOCALE, d, o) };
}
export const useT = () => useI18n().t;

const STATIC = process.env.NEXT_PUBLIC_STATIC_SITE === '1';
const ALT_BASE = process.env.NEXT_PUBLIC_ALT_BASE_PATH ?? '';

/** Switches between English and Arabic. Server mode stores a cookie; the static showcase has one build per language. */
export function LanguageSwitch({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  const { locale } = useI18n();
  const pathname = usePathname() || '/';
  const next: Locale = locale === 'ar' ? 'en' : 'ar';
  const label = next === 'ar' ? 'العربية' : 'English';
  const href = STATIC ? `${ALT_BASE}${pathname}` : `/api/locale?set=${next}&next=${encodeURIComponent(pathname)}`;
  return (
    <a
      href={href}
      hrefLang={next}
      lang={next}
      aria-label={label}
      data-testid="language-switch"
      onClick={(e) => {
        // Keep the query (e.g. a Demo Mode scenario) and anchor when switching.
        e.preventDefault();
        const tail = window.location.search + window.location.hash;
        if (STATIC) window.location.href = `${ALT_BASE}${pathname}${tail}`;
        else window.location.href = `/api/locale?set=${next}&next=${encodeURIComponent(window.location.pathname + tail)}`;
      }}
      className={cx(
        'inline-flex h-10 shrink-0 items-center gap-2 border px-2.5 font-mono sm:px-3 text-[13px] uppercase tracking-[0.06em] transition-colors',
        tone === 'light' ? 'border-white/60 text-white hover:bg-white/10' : 'border-line-strong text-ink hover:border-ink',
        className,
      )}
    >
      <Languages className="h-4 w-4" aria-hidden />
      <span className={cx('hidden sm:inline', next === 'ar' && 'font-arabic normal-case tracking-normal')}>{label}</span>
      <span className={cx('sm:hidden', next === 'ar' && 'font-arabic')} aria-hidden>{next === 'ar' ? 'ع' : 'EN'}</span>
    </a>
  );
}

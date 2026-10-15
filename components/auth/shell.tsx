import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Logo, cx, flipRtl } from '@/components/ui';
import { LanguageSwitch } from '@/components/i18n';
import { getT } from '@/lib/i18n/server';

export async function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  const { t } = await getT();
  return (
    <div className="panel-hero min-h-screen">
      <div className="dot-field pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative border-b border-white/30">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between gap-3 px-5 md:px-8">
          <Link href="/" aria-label={t('Bayyinah home')}>
            <Logo tone="light" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitch tone="light" />
            <Link href="/demo" className="btn hidden h-10 items-center gap-2 border border-white/60 px-4 text-[12.5px] font-bold uppercase tracking-[0.08em] text-white hover:bg-white/10 sm:inline-flex">
              {t('Explore the demo')}
              <ArrowUpRight className={cx('h-4 w-4', flipRtl)} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
      <main id="main" className="relative mx-auto grid max-w-[1100px] items-start gap-10 px-5 pb-16 pt-10 md:px-8 md:pt-16 lg:grid-cols-[1fr_460px]">
        <div className="hidden pt-4 text-white lg:block">
          <h1 className="t-display text-[clamp(2.6rem,4vw,3.6rem)] text-white">{title}</h1>
          {subtitle && <div className="mt-5 max-w-md text-[18px] leading-7 text-white/85">{subtitle}</div>}
          {aside}
        </div>
        <div className="float-panel w-full p-6 sm:p-8">
          <h1 className="t-headline text-[28px] lg:hidden">{title}</h1>
          {subtitle && <div className="mt-2 text-[15px] text-ink-muted lg:hidden">{subtitle}</div>}
          <div className="mt-6 lg:mt-0">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Only allow same-site relative redirect targets. */
export function safeNext(next: string | string[] | undefined, fallback = '/app') {
  const n = Array.isArray(next) ? next[0] : next;
  return n && n.startsWith('/') && !n.startsWith('//') ? n : fallback;
}

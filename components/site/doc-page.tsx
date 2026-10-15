import type { ReactNode } from 'react';
import { SiteHeader } from './header';
import { SiteFooter } from './footer';
import { Notice } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

function Hero({ title, eyebrow, children }: { title: string; eyebrow: string; children?: ReactNode }) {
  return (
    <div className="panel-hero">
      <div className="dot-field pointer-events-none absolute inset-0" aria-hidden />
      <SiteHeader />
      <div className="relative mx-auto max-w-[1240px] px-5 pb-16 pt-14 md:px-8 md:pb-20">
        <p className="t-eyebrow !text-white/75">/ {eyebrow}</p>
        <h1 className="t-display mt-5 text-[clamp(2.3rem,4.6vw,3.8rem)] text-white">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export async function DocPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const { t } = await getT();
  return (
    <>
      <Hero title={title} eyebrow={t('Trust')}>
        <p className="mt-4 font-mono text-[13px] uppercase tracking-[0.06em] text-white/80">{t('Last updated {date}', { date: updated })}</p>
      </Hero>
      <main id="main" className="mx-auto max-w-[760px] px-5 py-16 md:px-8">
        <Notice tone="review" title={t('Draft for owner and legal review')}>
          {t('This text was prepared with the product and has not been reviewed by a lawyer. It does not certify compliance with any law or regulation, including the UAE Personal Data Protection Law. Replace it with reviewed text before commercial use.')}
        </Notice>
        <div className="prose-doc mt-10 space-y-10 text-[16px] leading-7 text-ink-muted [&_h2]:mb-3 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:text-ink [&_li]:ms-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>
      </main>
      <SiteFooter cta={false} />
    </>
  );
}

/** Same chrome as DocPage, without the legal-draft notice and prose styling. */
export async function DocPageShell({ title, subtitle, eyebrow, children }: { title: string; subtitle?: string; eyebrow?: string; children: ReactNode }) {
  const { t } = await getT();
  return (
    <>
      <Hero title={title} eyebrow={eyebrow ?? t('Bayyinah')}>
        {subtitle && <p className="mt-4 max-w-2xl text-[18px] leading-7 text-white/85">{subtitle}</p>}
      </Hero>
      <main id="main" className="mx-auto max-w-[1240px] px-5 py-16 md:px-8">{children}</main>
      <SiteFooter cta={false} />
    </>
  );
}

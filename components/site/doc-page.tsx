import type { ReactNode } from 'react';
import { SiteHeader } from './header';
import { SiteFooter } from './footer';
import { Notice } from '@/components/ui';

export function DocPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <div className="px-2 pt-2 md:px-3 md:pt-3">
        <div className="panel-hero">
          <SiteHeader />
          <div className="relative mx-auto max-w-[1240px] px-5 pb-14 pt-10 md:px-8">
            <h1 className="t-display text-[clamp(2.4rem,5vw,4rem)]">{title}</h1>
            <p className="mt-3 text-[15px] text-ink-muted">Last updated {updated}</p>
          </div>
        </div>
      </div>
      <main id="main" className="mx-auto max-w-[760px] px-5 py-16 md:px-8">
        <Notice tone="review" title="Draft for owner and legal review">
          This text was prepared with the product and has not been reviewed by a lawyer. It does not certify compliance with any law or regulation, including the UAE Personal Data Protection Law. Replace it with reviewed text before commercial use.
        </Notice>
        <div className="prose-doc mt-10 space-y-8 text-[16px] leading-7 text-ink-soft [&_h2]:mb-2 [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:tracking-[-0.02em] [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { WorkflowMap } from '@/components/workflow/workflow-map';
import { getT } from '@/lib/i18n/server';
import { STEPS } from '@/lib/workflow';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Workflow — every step from request to decision') };
}

export default async function WorkflowPage() {
  const { t } = await getT();
  return (
    <>
      <div className="panel-hero">
        <div className="dot-field pointer-events-none absolute inset-0" aria-hidden />
        <SiteHeader />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-16 pt-14 md:px-8 md:pb-20">
          <p className="t-eyebrow !text-white/80">/ {t('Workflow')}</p>
          <h1 className="t-display mt-5 max-w-4xl text-white">
            {t('From request to decision.')} <span className="text-white/70">{t('Step by step.')}</span>
          </h1>
          <p className="mt-6 max-w-3xl text-[18px] leading-7 text-white/90">
            {t('Every case moves through {n} steps across four lanes. Click a step to see who acts, on which screen and what it produces — or pick a scenario and press play to watch a real path, including the loops back.', { n: STEPS.length })}
          </p>
        </div>
      </div>
      <main id="main" className="mx-auto max-w-[1400px] px-5 py-12 md:px-8 md:py-16">
        <WorkflowMap />
      </main>
      <SiteFooter />
    </>
  );
}

import Link from 'next/link';
import { Logo, LinkButton } from '@/components/ui';
import { getT } from '@/lib/i18n/server';
import { liveHref } from '@/lib/site';

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="panel-hero flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="dot-field pointer-events-none absolute inset-0" aria-hidden />
      <Link href="/" className="relative mb-10" aria-label={t('Bayyinah home')}><Logo tone="light" /></Link>
      <p className="relative font-mono text-[13px] uppercase tracking-[0.08em] text-white/80" dir="ltr">[ 404 ]</p>
      <h1 className="t-display relative mt-3 text-[clamp(2.2rem,5vw,3.6rem)] text-white">{t('This page has no evidence.')}</h1>
      <p className="relative mt-4 max-w-md text-[18px] leading-7 text-white/85">{t('The link may be mistyped, or the record belongs to an organization you are not a member of.')}</p>
      <div className="relative mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton href="/" variant="outline-light">{t('Back to the homepage')}</LinkButton>
        <LinkButton href={liveHref('/app')} arrow>{t('Open your workspace')}</LinkButton>
      </div>
    </div>
  );
}

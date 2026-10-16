import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Logo, cx, flipRtl } from '@/components/ui';
import { getT } from '@/lib/i18n/server';
import { liveHref, site } from '@/lib/site';
import { CopyEmail } from './copy-email';

export async function SiteFooter({ cta = true }: { cta?: boolean }) {
  const { t } = await getT();
  const COLS = [
    { title: t('Product'), links: [{ href: '/workflow', label: t('Full workflow') }, { href: '/#workflow', label: t('How it works') }, { href: '/#types', label: t('Request types') }, { href: '/#ai', label: t('What the AI does') }, { href: '/#example', label: t('Illustrative example') }] },
    { title: t('Try it'), links: [{ href: '/demo', label: t('Demo mode') }, { href: liveHref('/signup'), label: t('Register an organization') }, { href: liveHref('/login'), label: t('Sign in') }, { href: liveHref('/forgot-password'), label: t('Reset password') }] },
    { title: t('Trust'), links: [{ href: '/privacy', label: t('Privacy notice (draft)') }, { href: '/terms', label: t('Terms of use (draft)') }, { href: '/#faq', label: t('Questions & limits') }] },
  ];
  return (
    <footer>
      {cta && (
        <section className="panel-hero" aria-labelledby="cta-title">
          <div className="dot-field pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto grid max-w-[1240px] gap-10 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <p className="t-eyebrow !text-white/75">/ {t('Start here')}</p>
              <h2 id="cta-title" className="t-headline mt-5 text-white">
                {t('Can a fake invoice get past your team?')} <span className="text-white/70">{t('Check one today.')}</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href={liveHref('/signup')} className="btn inline-flex h-12 items-center gap-2 rounded-lg bg-navy px-6 text-[12.5px] font-bold uppercase tracking-[0.08em] text-white hover:bg-navy-700">
                {t('Register your organization')}
              </Link>
              <Link href="/demo" className="btn inline-flex h-12 items-center gap-2 rounded-lg border border-white/70 px-6 text-[12.5px] font-bold uppercase tracking-[0.08em] text-white hover:bg-white/10">
                {t('Explore the demo')}
                <ArrowUpRight className={cx('h-4 w-4', flipRtl)} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}
      <div className="panel-dark">
        <div className="mx-auto max-w-[1240px] px-5 pb-10 pt-16 md:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
            <div>
              <Logo tone="light" />
              <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/60">{t('Questions about a pilot for your business? Write to us — we reply to every message.')}</p>
              <div className="mt-6">
                <CopyEmail email={site.contactEmail} />
              </div>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {COLS.map((c) => (
                <div key={c.title}>
                  <p className="t-eyebrow !text-white/45">{c.title}</p>
                  <ul className="mt-4 space-y-2.5">
                    {c.links.map((l) => (
                      <li key={l.label}>
                        <Link href={l.href} className="text-[15px] text-white/80 hover:text-white">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-[13px] text-white/50 md:flex-row md:items-center md:justify-between">
            <p>{t('© {year} Bayyinah (working name). Built for small businesses in the UAE.', { year: new Date().getFullYear() })}</p>
            <p className="max-w-xl md:text-end">{t('Bayyinah does not execute payments, authorize transfers or prove account ownership.')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

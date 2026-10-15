import Link from 'next/link';
import { ArrowUpRight, Menu } from 'lucide-react';
import { Logo, cx, flipRtl } from '@/components/ui';
import { LanguageSwitch } from '@/components/i18n';
import { getCurrentUser } from '@/lib/auth/session';
import { getT } from '@/lib/i18n/server';
import { IS_STATIC_SITE, liveHref } from '@/lib/site';

/** Public header. `tone="light"` sits on the gradient hero; `tone="dark"` on white pages. */
export async function SiteHeader({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { t } = await getT();
  // The static showcase has no sessions; never read cookies there.
  const user = IS_STATIC_SITE ? null : await getCurrentUser();
  const light = tone === 'light';
  const NAV = [
    { href: '/#workflow', label: t('How it works') },
    { href: '/#example', label: t('Example') },
    { href: '/#types', label: t('Request types') },
    { href: '/demo', label: t('Demo') },
    { href: '/#faq', label: t('FAQ') },
  ];
  const navLink = cx('px-3 py-2 font-mono text-[14px] font-medium uppercase tracking-[0.04em] transition-opacity hover:opacity-70', light ? 'text-white' : 'text-ink');
  return (
    <header className={cx('relative z-20 border-b', light ? 'border-white/30' : 'border-line bg-white')}>
      <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between gap-3 px-5 md:px-8">
        <Link href="/" aria-label={t('Bayyinah home')}>
          <Logo tone={light ? 'light' : 'dark'} />
        </Link>
        <nav aria-label={t('Main')} className="hidden items-center gap-1 xl:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={navLink}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitch tone={light ? 'light' : 'dark'} className="hidden sm:inline-flex" />
          {user ? (
            <Link href={liveHref('/app')} className={cx('btn inline-flex h-10 items-center gap-2 px-4 text-[12.5px] font-bold uppercase tracking-[0.08em]', light ? 'bg-white text-ink' : 'bg-navy text-white')}>
              {t('Open workspace')}
              <ArrowUpRight className={cx('h-4 w-4', flipRtl)} aria-hidden />
            </Link>
          ) : (
            <>
              <Link href={liveHref('/login')} className={cx('btn hidden h-10 items-center border px-4 text-[12.5px] font-bold uppercase tracking-[0.08em] md:inline-flex', light ? 'border-white/60 text-white hover:bg-white/10' : 'border-line-strong text-ink hover:border-ink')}>
                {t('Sign in')}
              </Link>
              <Link href={liveHref('/signup')} className={cx('btn hidden h-10 items-center gap-2 px-4 text-[12.5px] font-bold uppercase tracking-[0.08em] sm:inline-flex', light ? 'bg-white text-ink hover:bg-white/90' : 'bg-navy text-white hover:bg-navy-700')}>
                {t('Register')}
                <ArrowUpRight className={cx('h-4 w-4', flipRtl)} aria-hidden />
              </Link>
            </>
          )}
          <details className="relative xl:hidden">
            <summary className={cx('flex h-10 w-10 cursor-pointer list-none items-center justify-center border [&::-webkit-details-marker]:hidden', light ? 'border-white/60 text-white' : 'border-line-strong bg-white text-ink')} aria-label={t('Open menu')}>
              <Menu className="h-5 w-5" aria-hidden />
            </summary>
            <div className="card absolute end-0 top-12 w-64 p-2 text-ink shadow-lift">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="block px-3 py-2 text-[15px] font-semibold hover:bg-mist">
                  {n.label}
                </Link>
              ))}
              <div className="my-2 border-t border-line" />
              {user ? (
                <Link href={liveHref('/app')} className="block px-3 py-2 text-[15px] font-semibold text-brand-700 hover:bg-mist">{t('Open workspace')}</Link>
              ) : (
                <>
                  <Link href={liveHref('/login')} className="block px-3 py-2 text-[15px] font-semibold hover:bg-mist">{t('Sign in')}</Link>
                  <Link href={liveHref('/signup')} className="block px-3 py-2 text-[15px] font-semibold text-brand-700 hover:bg-mist">{t('Register your organization')}</Link>
                </>
              )}
              <div className="mt-2 border-t border-line px-1 pt-2 sm:hidden">
                <LanguageSwitch className="w-full justify-center" />
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

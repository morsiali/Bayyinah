import Link from 'next/link';
import { Menu } from 'lucide-react';
import { LinkButton, Logo } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { IS_STATIC_SITE, liveHref } from '@/lib/site';

const NAV = [
  { href: '/#workflow', label: 'How it works' },
  { href: '/#example', label: 'Example' },
  { href: '/#types', label: 'Request types' },
  { href: '/demo', label: 'Demo' },
  { href: '/#faq', label: 'FAQ' },
];

export async function SiteHeader() {
  // The static showcase has no sessions; never read cookies there.
  const user = IS_STATIC_SITE ? null : await getCurrentUser();
  return (
    <header className="relative z-20">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-5 md:px-8">
        <Link href="/" aria-label="Bayyinah home" className="rounded-lg">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-[15px] font-semibold text-ink-soft transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <LinkButton href={liveHref('/app')} size="md" arrow>
              Open workspace
            </LinkButton>
          ) : (
            <>
              <Link href={liveHref('/login')} className="hidden rounded-full px-3.5 py-2 text-[15px] font-semibold text-ink-muted hover:text-ink sm:inline-flex">
                Sign in
              </Link>
              <LinkButton href={liveHref('/signup')} size="md" arrow className="hidden sm:inline-flex">
                Register your organization
              </LinkButton>
            </>
          )}
          <details className="relative lg:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-white shadow-pill [&::-webkit-details-marker]:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" aria-hidden />
            </summary>
            <div className="card absolute right-0 top-12 w-60 p-2">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-[15px] font-semibold hover:bg-zinc-50">
                  {n.label}
                </Link>
              ))}
              <div className="my-2 border-t border-line" />
              {user ? (
                <Link href={liveHref('/app')} className="block rounded-lg px-3 py-2 text-[15px] font-semibold text-brand-700 hover:bg-zinc-50">Open workspace</Link>
              ) : (
                <>
                  <Link href={liveHref('/login')} className="block rounded-lg px-3 py-2 text-[15px] font-semibold hover:bg-zinc-50">Sign in</Link>
                  <Link href={liveHref('/signup')} className="block rounded-lg px-3 py-2 text-[15px] font-semibold text-brand-700 hover:bg-zinc-50">Register your organization</Link>
                </>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

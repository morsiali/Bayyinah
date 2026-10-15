import Link from 'next/link';
import { ArrowUpRight, FlaskConical, KeyRound } from 'lucide-react';
import { Logo } from '@/components/ui';
import { liveHref, site } from '@/lib/site';
import { CopyEmail } from './copy-email';

const COLS = [
  { title: 'Product', links: [{ href: '/#workflow', label: 'How it works' }, { href: '/#types', label: 'Request types' }, { href: '/#ai', label: 'What the AI does' }, { href: '/#example', label: 'Illustrative example' }] },
  { title: 'Try it', links: [{ href: '/demo', label: 'Demo mode' }, { href: liveHref('/signup'), label: 'Register an organization' }, { href: liveHref('/login'), label: 'Sign in' }, { href: liveHref('/forgot-password'), label: 'Reset password' }] },
  { title: 'Trust', links: [{ href: '/privacy', label: 'Privacy notice (draft)' }, { href: '/terms', label: 'Terms of use (draft)' }, { href: '/#faq', label: 'Questions & limits' }] },
];

export function SiteFooter() {
  return (
    <footer className="px-2 pb-2 md:px-3 md:pb-3">
      <div className="panel-dark">
        <div className="mx-auto max-w-[1240px] px-6 pb-10 pt-14 md:px-12 md:pt-20">
          <Logo tone="light" />
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <div>
              <h2 className="t-display text-[clamp(2.4rem,5vw,4rem)]">
                Every payment.
                <br />
                <span className="text-white/45">Starts with evidence.</span>
              </h2>
              <p className="mt-5 max-w-md text-[16px] leading-7 text-white/65">Questions about a pilot for your business? Write to us — we reply to every message.</p>
              <div className="mt-6">
                <CopyEmail email={site.contactEmail} />
              </div>
            </div>
            <div className="grid gap-3">
              <Link href={liveHref('/signup')} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 pr-4 hover:bg-white/[0.07]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-[0_8px_20px_-8px_rgba(21,126,252,.9)]">
                  <KeyRound className="h-5 w-5" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="t-caption block text-white/50">Live mode</span>
                  <span className="block text-[16px] font-semibold">Register your organization</span>
                </span>
                <ArrowUpRight className="h-5 w-5 text-white/50 group-hover:text-white" aria-hidden />
              </Link>
              <Link href="/demo" className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 pr-4 hover:bg-white/[0.07]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <FlaskConical className="h-5 w-5" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="t-caption block text-white/50">Fictional data, no sign-in</span>
                  <span className="block text-[16px] font-semibold">Explore demo mode</span>
                </span>
                <ArrowUpRight className="h-5 w-5 text-white/50 group-hover:text-white" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-8 border-t border-white/10 pt-10 sm:grid-cols-3">
            {COLS.map((c) => (
              <div key={c.title}>
                <p className="t-caption text-white/45">{c.title}</p>
                <ul className="mt-3 space-y-2">
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

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-[13px] text-white/50 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Bayyinah (working name). Built for small businesses in the UAE.</p>
            <p className="max-w-xl md:text-right">Bayyinah does not execute payments, authorize transfers or prove account ownership.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

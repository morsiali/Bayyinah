import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui';

export function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="min-h-screen px-2 py-2 md:px-3 md:py-3">
      <div className="panel-hero min-h-[calc(100vh-1rem)] md:min-h-[calc(100vh-1.5rem)]">
        <div className="dot-field pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-5 md:px-8">
          <Link href="/" aria-label="Bayyinah home" className="rounded-lg">
            <Logo />
          </Link>
          <Link href="/demo" className="text-[14px] font-semibold text-ink-muted hover:text-ink">
            Explore the demo
          </Link>
        </div>
        <main id="main" className="relative mx-auto grid max-w-[1040px] items-start gap-10 px-5 pb-16 pt-8 md:px-8 md:pt-14 lg:grid-cols-[1fr_440px]">
          <div className="hidden pt-6 lg:block">
            <h1 className="t-display text-[56px]">{title}</h1>
            {subtitle && <div className="t-lead mt-5 max-w-md">{subtitle}</div>}
            {aside}
          </div>
          <div className="card w-full p-6 shadow-lift sm:p-8">
            <h1 className="t-headline text-[30px] lg:hidden">{title}</h1>
            {subtitle && <div className="mt-2 text-[15px] text-ink-muted lg:hidden">{subtitle}</div>}
            <div className="lg:mt-0 mt-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Only allow same-site relative redirect targets. */
export function safeNext(next: string | string[] | undefined, fallback = '/app') {
  const n = Array.isArray(next) ? next[0] : next;
  return n && n.startsWith('/') && !n.startsWith('//') ? n : fallback;
}

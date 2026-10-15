import Link from 'next/link';
import { Logo, LinkButton } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen p-2 md:p-3">
      <div className="panel-hero flex min-h-[calc(100vh-1rem)] flex-col items-center justify-center px-6 text-center">
        <div className="dot-field pointer-events-none absolute inset-0" aria-hidden />
        <Link href="/" className="relative mb-10" aria-label="Bayyinah home"><Logo /></Link>
        <p className="relative font-mono text-[14px] font-semibold text-brand-600">404</p>
        <h1 className="t-display relative mt-2 text-[clamp(2.2rem,5vw,3.6rem)]">This page has no evidence.</h1>
        <p className="t-lead relative mt-4 max-w-md">The link may be mistyped, or the record belongs to an organization you are not a member of.</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton href="/" variant="secondary">Back to the homepage</LinkButton>
          <LinkButton href="/app" arrow>Open your workspace</LinkButton>
        </div>
      </div>
    </div>
  );
}

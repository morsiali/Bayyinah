'use client';
import Link from 'next/link';
import { Button, Notice } from '@/components/ui';
import { liveHref } from '@/lib/site';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="t-headline">This page could not load.</h1>
      <Notice tone="danger" className="mt-5">
        Your saved work is unaffected. Try again; if it keeps happening, share this reference with support: <code className="font-mono">{error.digest ?? 'n/a'}</code>
      </Notice>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href={liveHref('/app')} className="inline-flex h-10 items-center rounded-full px-4 font-semibold text-ink-soft hover:text-ink">Go to workspace</Link>
      </div>
    </div>
  );
}

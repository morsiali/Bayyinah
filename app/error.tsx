'use client';
import Link from 'next/link';
import { Button, Notice, buttonClass } from '@/components/ui';
import { useT } from '@/components/i18n';
import { liveHref } from '@/lib/site';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="t-headline">{t('This page could not load.')}</h1>
      <Notice tone="danger" className="mt-5">
        {t('Your saved work is unaffected. Try again; if it keeps happening, share this reference with support:')} <code className="font-mono">{error.digest ?? 'n/a'}</code>
      </Notice>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>{t('Try again')}</Button>
        <Link href={liveHref('/app')} className={buttonClass('ghost', 'md')}>{t('Go to workspace')}</Link>
      </div>
    </div>
  );
}

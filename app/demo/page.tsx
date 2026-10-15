import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { Suspense } from 'react';
import { DemoFromParams } from '@/components/demo/demo-from-params';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Demo Mode — fictional data') };
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
      <DemoFromParams />
    </Suspense>
  );
}

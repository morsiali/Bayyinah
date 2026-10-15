import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DemoFromParams } from '@/components/demo/demo-from-params';

export const metadata: Metadata = { title: 'Demo Mode — fictional data' };

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
      <DemoFromParams />
    </Suspense>
  );
}

import type { Metadata } from 'next';
import { DemoApp } from '@/components/demo/demo-app';
import { getDemoScenario } from '@/lib/demo-data';

export const metadata: Metadata = { title: 'Demo Mode — fictional data' };

export default async function DemoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const scenario = getDemoScenario(typeof sp.scenario === 'string' ? sp.scenario : null).id;
  const p = sp.persona;
  const persona = p === 'reviewer' || p === 'admin' ? p : 'preparer';
  return <DemoApp key={`${scenario}-${persona}`} initialScenario={scenario} initialPersona={persona} />;
}

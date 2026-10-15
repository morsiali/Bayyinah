'use client';
import { useSearchParams } from 'next/navigation';
import { DemoApp } from './demo-app';
import { getDemoScenario } from '@/lib/demo-data';

/** Reads ?scenario= and ?persona= in the browser, so Demo Mode also works as a static page. */
export function DemoFromParams() {
  const sp = useSearchParams();
  const scenario = getDemoScenario(sp.get('scenario')).id;
  const p = sp.get('persona');
  const persona = p === 'reviewer' || p === 'admin' ? p : 'preparer';
  return <DemoApp key={`${scenario}-${persona}`} initialScenario={scenario} initialPersona={persona} />;
}

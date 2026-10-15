import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { redirect } from 'next/navigation';
import { AuthShell, safeNext } from '@/components/auth/shell';
import { LoginForm } from '@/components/auth/login-form';
import { getCurrentUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { msg } from '@/lib/i18n/core';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Sign in') };
}

const SEED = [
  { email: 'layla@alwaha.example', role: msg('Organization admin') },
  { email: 'omar@alwaha.example', role: msg('Preparer') },
  { email: 'sara@alwaha.example', role: msg('Reviewer') },
  { email: 'hana@desertrose.example', role: msg('Second organization') },
  { email: 'ops@bayyinah.example', role: msg('Platform operations') },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);
  const { t } = await getT();
  return (
    <AuthShell title={t('Welcome back.')} subtitle={t('Sign in with your own account. Your organization and role decide what you can see and do.')}>
      <LoginForm next={next} demoAccounts={env.showDemoAccounts() ? SEED : undefined} />
    </AuthShell>
  );
}

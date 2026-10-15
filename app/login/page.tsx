import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell, safeNext } from '@/components/auth/shell';
import { LoginForm } from '@/components/auth/login-form';
import { getCurrentUser } from '@/lib/auth/session';
import { env } from '@/lib/env';

export const metadata: Metadata = { title: 'Sign in' };

const SEED = [
  { email: 'layla@alwaha.example', role: 'Organization admin' },
  { email: 'omar@alwaha.example', role: 'Preparer' },
  { email: 'sara@alwaha.example', role: 'Reviewer' },
  { email: 'hana@desertrose.example', role: 'Second organization' },
  { email: 'ops@bayyinah.example', role: 'Platform operations' },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthShell title="Welcome back." subtitle="Sign in with your own account. Your organization and role decide what you can see and do.">
      <LoginForm next={next} demoAccounts={env.showDemoAccounts() ? SEED : undefined} />
    </AuthShell>
  );
}

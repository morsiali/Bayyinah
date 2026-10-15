import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { redirect } from 'next/navigation';
import { Check } from 'lucide-react';
import { AuthShell, safeNext } from '@/components/auth/shell';
import { SignupForm } from '@/components/auth/signup-form';
import { getCurrentUser } from '@/lib/auth/session';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Create your account') };
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);
  const email = typeof sp.email === 'string' ? sp.email : undefined;
  const { t } = await getT();
  return (
    <AuthShell
      title={t('Register in two steps.')}
      subtitle={t('Create your personal account, then name your organization. You become its first administrator and can invite your team.')}
      aside={
        <ul className="mt-8 space-y-3 text-[15px] text-white/90">
          {[t('Every person signs in with their own account'), t('Invite preparers and reviewers with single-use links'), t('No payment details or bank logins are ever requested')].map((x) => (
            <li key={x} className="flex gap-3">
              <Check className="mt-1 h-4 w-4 shrink-0 text-white" aria-hidden />
              {x}
            </li>
          ))}
        </ul>
      }
    >
      <SignupForm next={next} presetEmail={email} />
    </AuthShell>
  );
}

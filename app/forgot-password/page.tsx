import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { AuthShell } from '@/components/auth/shell';
import { ForgotForm } from '@/components/auth/forgot-form';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Reset your password') };
}

export default async function ForgotPage() {
  const { t } = await getT();
  return (
    <AuthShell title={t('Reset your password.')} subtitle={t('Enter the email you sign in with. Resetting signs you out everywhere else.')}>
      <ForgotForm />
    </AuthShell>
  );
}

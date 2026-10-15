import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/shell';
import { ResetForm } from '@/components/auth/reset-form';
import { Notice } from '@/components/ui';
import { resetTokenState } from '@/lib/services/accounts';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Choose a new password') };
}

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = await resetTokenState(token);
  const { t } = await getT();
  return (
    <AuthShell title={t('Choose a new password.')} subtitle={t('All other sessions for this account will be signed out.')}>
      {state === 'valid' ? (
        <ResetForm token={token} />
      ) : (
        <div className="space-y-4">
          <Notice tone="danger" title={t('This reset link can’t be used')}>{t('It is invalid, already used or older than 60 minutes.')}</Notice>
          <Link href="/forgot-password" className="link text-[14px]">{t('Request a new link')}</Link>
        </div>
      )}
    </AuthShell>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/shell';
import { ResetForm } from '@/components/auth/reset-form';
import { Notice } from '@/components/ui';
import { resetTokenState } from '@/lib/services/accounts';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = await resetTokenState(token);
  return (
    <AuthShell title="Choose a new password." subtitle="All other sessions for this account will be signed out.">
      {state === 'valid' ? (
        <ResetForm token={token} />
      ) : (
        <div className="space-y-4">
          <Notice tone="danger" title="This reset link can’t be used">It is invalid, already used or older than 60 minutes.</Notice>
          <Link href="/forgot-password" className="link text-[14px]">Request a new link</Link>
        </div>
      )}
    </AuthShell>
  );
}

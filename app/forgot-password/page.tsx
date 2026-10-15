import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/shell';
import { ForgotForm } from '@/components/auth/forgot-form';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password." subtitle="Enter the email you sign in with. Resetting signs you out everywhere else.">
      <ForgotForm />
    </AuthShell>
  );
}

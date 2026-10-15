'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button, Field, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/client';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (sent)
    return (
      <div className="space-y-4">
        <Notice tone="info" title="Request received">
          If an account exists for that address, a reset link valid for 60 minutes has been issued. This version has no email delivery: your organization administrator can also issue you a reset link from the Members page.
        </Notice>
        <Link href="/login" className="link text-[14px]">Back to sign in</Link>
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
          await api('/api/auth/forgot', { body: { email } });
          setSent(true);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Something went wrong.');
        } finally {
          setLoading(false);
        }
      }}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="Account email" htmlFor="email">
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" autoComplete="email" />
      </Field>
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Request reset link
      </Button>
      <p className="text-center text-[14px]">
        <Link href="/login" className="link">Back to sign in</Link>
      </p>
    </form>
  );
}

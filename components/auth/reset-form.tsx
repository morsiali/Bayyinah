'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/client';
import { useT } from '@/components/i18n';

export function ResetForm({ token }: { token: string }) {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) return setError(t('The two passwords do not match.'));
        setLoading(true);
        try {
          await api('/api/auth/reset', { body: { token, password } });
          router.replace('/app');
          router.refresh();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : t('Reset failed.'));
          setLoading(false);
        }
      }}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label={t('New password')} htmlFor="pw" hint={t('At least 10 characters, with letters and numbers.')}>
        <input id="pw" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
      </Field>
      <Field label={t('Repeat new password')} htmlFor="pw2">
        <input id="pw2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field-input" />
      </Field>
      <Button type="submit" size="lg" loading={loading} className="w-full">
        {t('Set new password')}
      </Button>
    </form>
  );
}

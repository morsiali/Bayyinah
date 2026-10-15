'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Field, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/client';
import { useT } from '@/components/i18n';

export function SignupForm({ next, presetEmail }: { next: string; presetEmail?: string }) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(presetEmail ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/api/auth/register', { body: { name, email, password } });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('Registration failed.'));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label={t('Full name')} htmlFor="name">
        <input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
      </Field>
      <Field label={t('Work email')} htmlFor="email" hint={presetEmail ? t('Use the address your invitation was sent to.') : undefined}>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" dir="ltr" placeholder="you@company.ae" />
      </Field>
      <Field label={t('Password')} htmlFor="password" hint={t('At least 10 characters, with letters and numbers.')}>
        <input id="password" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
      </Field>
      <Button type="submit" size="lg" loading={loading} className="w-full" arrow>
        {t('Create account')}
      </Button>
      <p className="text-[13px] leading-5 text-ink-muted">
        {t('By creating an account you accept the draft')} <Link href="/terms" className="link">{t('terms of use')}</Link> {t('and')} <Link href="/privacy" className="link">{t('privacy notice')}</Link>.
      </p>
      <p className="text-center text-[14px] text-ink-muted">
        {t('Already registered?')}{' '}
        <Link href={`/login${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">
          {t('Sign in')}
        </Link>
      </p>
    </form>
  );
}

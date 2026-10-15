'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Field, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/client';
import { useT } from '@/components/i18n';

export function LoginForm({ next, demoAccounts }: { next: string; demoAccounts?: { email: string; role: string }[] }) {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/api/auth/login', { body: { email, password } });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('Sign-in failed.'));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label={t('Work email')} htmlFor="email">
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" dir="ltr" placeholder="you@company.ae" />
      </Field>
      <Field label={t('Password')} htmlFor="password">
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" dir="ltr" />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="link text-[14px]">
          {t('Forgot password?')}
        </Link>
      </div>
      <Button type="submit" size="lg" loading={loading} className="w-full" arrow>
        {t('Sign in')}
      </Button>
      <p className="text-center text-[14px] text-ink-muted">
        {t('New to Bayyinah?')}{' '}
        <Link href={`/signup${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">
          {t('Create an account')}
        </Link>
      </p>
      {demoAccounts && demoAccounts.length > 0 && (
        <div className="rounded-md border border-dashed border-line-strong bg-mist p-3 text-[13px]">
          <p className="font-semibold">{t('Local seed accounts (development only)')}</p>
          <p className="text-ink-muted">{t('Password for all:')} <code className="font-mono" dir="ltr">Bayyinah!2026</code></p>
          <ul className="mt-2 space-y-1">
            {demoAccounts.map((a) => (
              <li key={a.email}>
                <button type="button" dir="ltr" className="link" onClick={() => { setEmail(a.email); setPassword('Bayyinah!2026'); }}>
                  {a.email}
                </button>{' '}
                <span className="text-ink-muted">— {t(a.role)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

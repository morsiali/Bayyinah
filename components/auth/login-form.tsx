'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Field, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/client';

export function LoginForm({ next, demoAccounts }: { next: string; demoAccounts?: { email: string; role: string }[] }) {
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
      setError(err instanceof ApiError ? err.message : 'Sign-in failed.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="Work email" htmlFor="email">
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" placeholder="you@company.ae" />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="link text-[14px]">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" loading={loading} className="w-full" arrow>
        Sign in
      </Button>
      <p className="text-center text-[14px] text-ink-muted">
        New to Bayyinah?{' '}
        <Link href={`/signup${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">
          Create an account
        </Link>
      </p>
      {demoAccounts && demoAccounts.length > 0 && (
        <div className="rounded-xl border border-dashed border-line-strong bg-zinc-50 p-3 text-[13px]">
          <p className="font-semibold">Local seed accounts (development only)</p>
          <p className="text-ink-muted">Password for all: <code className="font-mono">Bayyinah!2026</code></p>
          <ul className="mt-2 space-y-1">
            {demoAccounts.map((a) => (
              <li key={a.email}>
                <button type="button" className="link" onClick={() => { setEmail(a.email); setPassword('Bayyinah!2026'); }}>
                  {a.email}
                </button>{' '}
                <span className="text-ink-muted">— {a.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

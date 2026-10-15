'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Field, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/client';

export function SignupForm({ next, presetEmail }: { next: string; presetEmail?: string }) {
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
      setError(err instanceof ApiError ? err.message : 'Registration failed.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="Full name" htmlFor="name">
        <input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
      </Field>
      <Field label="Work email" htmlFor="email" hint={presetEmail ? 'Use the address your invitation was sent to.' : undefined}>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" placeholder="you@company.ae" />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters, with letters and numbers.">
        <input id="password" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
      </Field>
      <Button type="submit" size="lg" loading={loading} className="w-full" arrow>
        Create account
      </Button>
      <p className="text-[13px] leading-5 text-ink-muted">
        By creating an account you accept the draft <Link href="/terms" className="link">terms of use</Link> and <Link href="/privacy" className="link">privacy notice</Link>.
      </p>
      <p className="text-center text-[14px] text-ink-muted">
        Already registered?{' '}
        <Link href={`/login${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">
          Sign in
        </Link>
      </p>
    </form>
  );
}

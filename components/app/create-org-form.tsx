'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/client';

export function CreateOrgForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
          const r = await api<{ id: string }>('/api/orgs', { body: { name } });
          router.push(`/app/${r.id}/admin`);
          router.refresh();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Could not create the organization.');
          setLoading(false);
        }
      }}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="Organization name" htmlFor="org-name" hint="For example the trade name on your licence.">
        <input id="org-name" required value={name} onChange={(e) => setName(e.target.value)} className="field-input" placeholder="Al Waha Trading LLC" />
      </Field>
      <Button type="submit" loading={loading} arrow>
        Create organization
      </Button>
    </form>
  );
}

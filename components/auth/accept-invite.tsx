'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/client';

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-3">
      {error && <Notice tone="danger">{error}</Notice>}
      <Button
        size="lg"
        className="w-full"
        loading={loading}
        arrow
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const r = await api<{ orgId: string }>('/api/invitations/accept', { body: { token } });
            router.replace(`/app/${r.orgId}`);
            router.refresh();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not accept the invitation.');
            setLoading(false);
          }
        }}
      >
        Accept invitation
      </Button>
    </div>
  );
}

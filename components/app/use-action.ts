'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/client';

/** Runs an API action with consistent feedback: success toast, user-facing errors, blocked reasons, refresh. */
export function useAction() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  async function run<T = any>(key: string, path: string, opts: { body?: unknown; form?: FormData; method?: string; success?: string; refresh?: boolean } = {}): Promise<T | null> {
    setPending(key);
    try {
      const r = await api<T>(path, opts);
      if (opts.success) toast.success(opts.success);
      if (opts.refresh !== false) router.refresh();
      return r;
    } catch (e) {
      if (e instanceof ApiError) {
        const desc = e.details?.length ? e.details.join(' • ') : undefined;
        if (e.code === 'STALE_VERSION') toast.warning(e.message, { action: { label: 'Reload', onClick: () => router.refresh() } });
        else toast.error(e.message, { description: desc, duration: 9000 });
      } else toast.error('Something went wrong.');
      return null;
    } finally {
      setPending(null);
    }
  }
  return { run, pending };
}

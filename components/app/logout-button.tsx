'use client';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui';
import { useT } from '@/components/i18n';

export function LogoutButton({ redirectTo = '/', label, compact }: { redirectTo?: string; label?: string; compact?: boolean }) {
  const t = useT();
  label = label ?? t('Sign out');
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant={compact ? 'ghost' : 'secondary'}
      size={compact ? 'sm' : 'md'}
      loading={loading}
      aria-label={label}
      onClick={async () => {
        setLoading(true);
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
        window.location.assign(redirectTo);
      }}
    >
      {!loading && <LogOut className="h-4 w-4" aria-hidden />}
      <span className={compact ? 'hidden sm:inline' : undefined}>{label}</span>
    </Button>
  );
}

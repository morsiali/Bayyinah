'use client';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { useT } from '@/components/i18n';
import { msg } from '@/lib/i18n/core';

export function OrgStatusControl({ orgId, status }: { orgId: string; status: string }) {
  const { run, pending } = useAction();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const next = status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  if (!open) return <Button size="sm" variant={next === 'SUSPENDED' ? 'danger' : 'secondary'} onClick={() => setOpen(true)}>{next === 'SUSPENDED' ? t('Suspend') : t('Reactivate')}</Button>;
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await run('s', `/api/platform/orgs/${orgId}`, { body: { status: next, reason }, success: next === 'SUSPENDED' ? msg('Organization suspended') : msg('Organization reactivated') }); if (r) setOpen(false); }}>
      <label htmlFor={`r-${orgId}`} className="sr-only">{t('Reason')}</label>
      <input id={`r-${orgId}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Reason (10+ characters)')} className="field-input h-8 w-56 py-1 text-[13px]" />
      <Button size="sm" type="submit" loading={pending === 's'} disabled={reason.trim().length < 10}>{t('Confirm')}</Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
    </form>
  );
}

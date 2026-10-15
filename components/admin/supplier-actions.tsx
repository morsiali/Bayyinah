'use client';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { useT } from '@/components/i18n';
import { msg } from '@/lib/i18n/core';

export function SupplierActions({ orgId, supplierId, reviewed, active }: { orgId: string; supplierId: string; reviewed: boolean; active: boolean }) {
  const { run, pending } = useAction();
  const t = useT();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {!reviewed && active && (
        <Button size="sm" loading={pending === 'r'} onClick={() => run('r', `/api/orgs/${orgId}/suppliers/${supplierId}/review`, { success: msg('Marked as reviewed by the business') })}>
          {t('Mark reference as reviewed')}
        </Button>
      )}
      {active && !confirm && <Button size="sm" variant="danger" onClick={() => setConfirm(true)}>{t('Deactivate')}</Button>}
      {active && confirm && (
        <span className="flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-1 text-[13px]">
          {t('New cases won’t be able to use this supplier.')}
          <Button size="sm" variant="danger" loading={pending === 'd'} onClick={() => run('d', `/api/orgs/${orgId}/suppliers/${supplierId}/active`, { body: { isActive: false }, success: msg('Supplier deactivated') }).then(() => setConfirm(false))}>{t('Confirm')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>{t('Cancel')}</Button>
        </span>
      )}
      {!active && (
        <Button size="sm" variant="secondary" loading={pending === 'a'} onClick={() => run('a', `/api/orgs/${orgId}/suppliers/${supplierId}/active`, { body: { isActive: true }, success: msg('Supplier reactivated') })}>
          {t('Reactivate')}
        </Button>
      )}
    </div>
  );
}

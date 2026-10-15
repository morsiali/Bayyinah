'use client';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { useAction } from '@/components/app/use-action';

export function SupplierActions({ orgId, supplierId, reviewed, active }: { orgId: string; supplierId: string; reviewed: boolean; active: boolean }) {
  const { run, pending } = useAction();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {!reviewed && active && (
        <Button size="sm" loading={pending === 'r'} onClick={() => run('r', `/api/orgs/${orgId}/suppliers/${supplierId}/review`, { success: 'Marked as reviewed by the business' })}>
          Mark reference as reviewed
        </Button>
      )}
      {active && !confirm && <Button size="sm" variant="danger" onClick={() => setConfirm(true)}>Deactivate</Button>}
      {active && confirm && (
        <span className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[13px]">
          New cases won’t be able to use this supplier.
          <Button size="sm" variant="danger" loading={pending === 'd'} onClick={() => run('d', `/api/orgs/${orgId}/suppliers/${supplierId}/active`, { body: { isActive: false }, success: 'Supplier deactivated' }).then(() => setConfirm(false))}>Confirm</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
        </span>
      )}
      {!active && (
        <Button size="sm" variant="secondary" loading={pending === 'a'} onClick={() => run('a', `/api/orgs/${orgId}/suppliers/${supplierId}/active`, { body: { isActive: true }, success: 'Supplier reactivated' })}>
          Reactivate
        </Button>
      )}
    </div>
  );
}

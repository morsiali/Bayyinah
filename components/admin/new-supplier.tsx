'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { SupplierForm } from './supplier-form';

export function NewSupplier({ orgId, startOpen }: { orgId: string; startOpen?: boolean }) {
  const [open, setOpen] = useState(!!startOpen);
  if (!open)
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden /> Add supplier
      </Button>
    );
  return (
    <div className="card w-full p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="t-sub text-[19px]">New supplier reference</h2>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <SupplierForm orgId={orgId} />
    </div>
  );
}

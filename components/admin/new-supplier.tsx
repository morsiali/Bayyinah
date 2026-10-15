'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { SupplierForm } from './supplier-form';
import { useT } from '@/components/i18n';

export function NewSupplier({ orgId, startOpen }: { orgId: string; startOpen?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(!!startOpen);
  if (!open)
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden /> {t('Add supplier')}
      </Button>
    );
  return (
    <div className="card w-full p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="t-sub text-[19px]">{t('New supplier reference')}</h2>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
      </div>
      <SupplierForm orgId={orgId} />
    </div>
  );
}

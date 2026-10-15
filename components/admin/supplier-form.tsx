'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Field, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/client';
import { useT } from '@/components/i18n';
import { msg } from '@/lib/i18n/core';

type S = { name?: string; expectedBeneficiaryName?: string | null; referenceIban?: string | null; referenceBankAccount?: string | null; recordedEmail?: string | null; recordedPhone?: string | null; usualCurrency?: string | null; referenceSource?: string | null };
const FIELDS: { k: keyof S; label: string; hint?: string; ltr?: boolean; placeholder?: string }[] = [
  { k: 'name', label: msg('Supplier name'), placeholder: 'Gulf Supplies Co.' },
  { k: 'expectedBeneficiaryName', label: msg('Expected beneficiary name'), hint: msg('The account holder name payments should go to.') },
  { k: 'referenceIban', label: msg('Reference IBAN'), ltr: true, hint: msg('Checked for format and checksum when saved.'), placeholder: 'AE07 0331 2345 6789 0123 456' },
  { k: 'referenceBankAccount', label: msg('Reference account number'), ltr: true },
  { k: 'recordedEmail', label: msg('Previously recorded email'), ltr: true, placeholder: 'finance@supplier.ae' },
  { k: 'recordedPhone', label: msg('Previously recorded phone'), ltr: true, hint: msg('Used for independent verification calls.'), placeholder: '+971 4 555 0202' },
  { k: 'usualCurrency', label: msg('Usual currency'), ltr: true, placeholder: 'AED' },
  { k: 'referenceSource', label: msg('Source of this reference information'), hint: msg('Where these details came from, e.g. the signed supplier agreement.') },
];

export function SupplierForm({ orgId, supplierId, initial, onDone }: { orgId: string; supplierId?: string; initial?: S; onDone?: () => void }) {
  const router = useRouter();
  const t = useT();
  const [v, setV] = useState<S>({ usualCurrency: 'AED', ...initial });
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
          if (supplierId) {
            const r = await api<{ version: number; openCasesAffected: number }>(`/api/orgs/${orgId}/suppliers/${supplierId}`, { method: 'PATCH', body: { ...v, reason } });
            toast.success(`${t('Saved as version {v}.', { v: r.version })}${r.openCasesAffected ? ` ${t('Open cases that can now apply the updated reference: {n}.', { n: r.openCasesAffected })}` : ''}`);
            setReason('');
          } else {
            const r = await api<{ id: string }>(`/api/orgs/${orgId}/suppliers`, { body: v });
            toast.success(t('Supplier reference created'));
            router.push(`/app/${orgId}/admin/suppliers/${r.id}`);
          }
          router.refresh();
          onDone?.();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : t('Could not save.'));
        } finally {
          setLoading(false);
        }
      }}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <Field key={f.k} label={t(f.label)} htmlFor={`sf-${f.k}`} hint={f.hint ? t(f.hint) : undefined} className={f.k === 'referenceSource' ? 'md:col-span-2' : undefined}>
            <input id={`sf-${f.k}`} dir={f.ltr ? 'ltr' : 'auto'} required={f.k === 'name'} value={v[f.k] ?? ''} placeholder={f.placeholder} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} className="field-input" />
          </Field>
        ))}
      </div>
      {supplierId && (
        <Field label={t('Reason for this change')} htmlFor="sf-reason" hint={t('Recorded in the version history. Changes reset the reference to “not yet reviewed”.')}>
          <input id="sf-reason" required minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} className="field-input" placeholder={t('e.g. Phone number confirmed from signed agreement')} />
        </Field>
      )}
      <Button type="submit" loading={loading}>{supplierId ? t('Save new version') : t('Create supplier reference')}</Button>
    </form>
  );
}

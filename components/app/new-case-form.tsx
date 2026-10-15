'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Landmark, UserPlus } from 'lucide-react';
import { Button, Field, Notice, cx } from '@/components/ui';
import { api, ApiError } from '@/lib/client';
import { REQUEST_TYPE_LABELS, type RequestType } from '@/lib/constants';
import { msg } from '@/lib/i18n/core';
import { useT } from '@/components/i18n';

const TYPES: { v: RequestType; icon: typeof FileText; d: string }[] = [
  { v: 'INVOICE_PAYMENT', icon: FileText, d: msg('Pay an invoice from this supplier') },
  { v: 'BANK_ACCOUNT_CHANGE', icon: Landmark, d: msg('The supplier asks to be paid into a different account') },
  { v: 'NEW_BENEFICIARY', icon: UserPlus, d: msg('Add a beneficiary you have not paid before') },
];

export function NewCaseForm({ orgId, suppliers }: { orgId: string; suppliers: { id: string; name: string; reviewStatus: string; usualCurrency: string | null }[] }) {
  const t = useT();
  const router = useRouter();
  const [supplierId, setSupplierId] = useState('');
  const [type, setType] = useState<RequestType | ''>('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supplier = suppliers.find((s) => s.id === supplierId);

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!supplierId || !type) return setError(t('Choose a supplier and a request type.'));
        setLoading(true);
        try {
          const r = await api<{ id: string; caseNumber: string }>(`/api/orgs/${orgId}/cases`, { body: { supplierId, requestType: type, expectedAmount: amount || null, expectedCurrency: supplier?.usualCurrency ?? null, note: note || null } });
          router.push(`/app/${orgId}/cases/${r.id}`);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : t('Could not create the case.'));
          setLoading(false);
        }
      }}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label={t('Supplier')} htmlFor="supplier" hint={<>{t('The case keeps a snapshot of this supplier’s reference. Missing a supplier? An organization admin adds them under')} <Link href={`/app/${orgId}/admin/suppliers`} className="link">{t('Suppliers')}</Link>.</>}>
        <select id="supplier" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="field-input">
          <option value="">{t('Choose a supplier…')}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.reviewStatus !== 'REVIEWED' ? ` ${t('(reference not yet reviewed)')}` : ''}</option>
          ))}
        </select>
      </Field>
      {supplier && supplier.reviewStatus !== 'REVIEWED' && <Notice tone="review">{t('This supplier’s reference has not been marked as reviewed by the business. The case will show this as a finding.')}</Notice>}
      <fieldset>
        <legend className="mb-2 text-[14px] font-semibold">{t('What was requested?')}</legend>
        <div className="grid gap-2.5 md:grid-cols-3" role="radiogroup">
          {TYPES.map((ty) => (
            <button type="button" key={ty.v} role="radio" aria-checked={type === ty.v} onClick={() => setType(ty.v)} className={cx('rounded-md border p-3.5 text-start', type === ty.v ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-100' : 'border-line bg-white hover:border-line-strong')}>
              <ty.icon className={cx('h-5 w-5', type === ty.v ? 'text-brand-600' : 'text-ink-muted')} aria-hidden />
              <span className="mt-2 block text-[15px] font-semibold">{t(REQUEST_TYPE_LABELS[ty.v])}</span>
              <span className="block text-[13px] text-ink-muted">{t(ty.d)}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {(type === 'BANK_ACCOUNT_CHANGE' || type === 'NEW_BENEFICIARY') && <Notice tone="review">{t('This request type always requires a recorded independent verification and a reviewer other than you.')}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={`${t('Expected amount')}${supplier?.usualCurrency ? ` (${supplier.usualCurrency})` : ''} — ${t('optional')}`} htmlFor="amount" hint={t('From your purchase order or contract. The rules compare it with the request using exact decimals.')}>
          <input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="field-input" dir="ltr" placeholder="18,750.00" />
        </Field>
        <Field label={`${t('Internal note')} — ${t('optional')}`} htmlFor="note">
          <input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="field-input" placeholder={t('e.g. Received by email on Monday')} />
        </Field>
      </div>
      <Button type="submit" size="lg" loading={loading} arrow>
        {t('Create case')}
      </Button>
    </form>
  );
}

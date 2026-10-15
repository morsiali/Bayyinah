'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Landmark, UserPlus } from 'lucide-react';
import { Button, Field, Notice, cx } from '@/components/ui';
import { api, ApiError } from '@/lib/client';
import { REQUEST_TYPE_LABELS, type RequestType } from '@/lib/constants';

const TYPES: { v: RequestType; icon: typeof FileText; d: string }[] = [
  { v: 'INVOICE_PAYMENT', icon: FileText, d: 'Pay an invoice from this supplier' },
  { v: 'BANK_ACCOUNT_CHANGE', icon: Landmark, d: 'The supplier asks to be paid into a different account' },
  { v: 'NEW_BENEFICIARY', icon: UserPlus, d: 'Add a beneficiary you have not paid before' },
];

export function NewCaseForm({ orgId, suppliers }: { orgId: string; suppliers: { id: string; name: string; reviewStatus: string; usualCurrency: string | null }[] }) {
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
        if (!supplierId || !type) return setError('Choose a supplier and a request type.');
        setLoading(true);
        try {
          const r = await api<{ id: string; caseNumber: string }>(`/api/orgs/${orgId}/cases`, { body: { supplierId, requestType: type, expectedAmount: amount || null, expectedCurrency: supplier?.usualCurrency ?? null, note: note || null } });
          router.push(`/app/${orgId}/cases/${r.id}`);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Could not create the case.');
          setLoading(false);
        }
      }}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="Supplier" htmlFor="supplier" hint={<>The case keeps a snapshot of this supplier’s reference. Missing a supplier? An organization admin adds them under <Link href={`/app/${orgId}/admin/suppliers`} className="link">Suppliers</Link>.</>}>
        <select id="supplier" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="field-input">
          <option value="">Choose a supplier…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.reviewStatus !== 'REVIEWED' ? ' (reference not yet reviewed)' : ''}</option>
          ))}
        </select>
      </Field>
      {supplier && supplier.reviewStatus !== 'REVIEWED' && <Notice tone="review">This supplier’s reference has not been marked as reviewed by the business. The case will show this as a finding.</Notice>}
      <fieldset>
        <legend className="mb-2 text-[14px] font-semibold">What was requested?</legend>
        <div className="grid gap-2.5 md:grid-cols-3" role="radiogroup">
          {TYPES.map((t) => (
            <button type="button" key={t.v} role="radio" aria-checked={type === t.v} onClick={() => setType(t.v)} className={cx('rounded-xl border p-3.5 text-left', type === t.v ? 'border-brand-500 bg-brand-50/60 ring-4 ring-brand-100' : 'border-line bg-white hover:border-line-strong')}>
              <t.icon className={cx('h-5 w-5', type === t.v ? 'text-brand-600' : 'text-ink-muted')} aria-hidden />
              <span className="mt-2 block text-[15px] font-bold">{REQUEST_TYPE_LABELS[t.v]}</span>
              <span className="block text-[13px] text-ink-muted">{t.d}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {(type === 'BANK_ACCOUNT_CHANGE' || type === 'NEW_BENEFICIARY') && <Notice tone="review">This request type always requires a recorded independent verification and a reviewer other than you.</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={`Expected amount${supplier?.usualCurrency ? ` (${supplier.usualCurrency})` : ''} — optional`} htmlFor="amount" hint="From your purchase order or contract. The rules compare it with the request using exact decimals.">
          <input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="field-input" placeholder="18,750.00" />
        </Field>
        <Field label="Internal note — optional" htmlFor="note">
          <input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="field-input" placeholder="e.g. Received by email on Monday" />
        </Field>
      </div>
      <Button type="submit" size="lg" loading={loading} arrow>
        Create case
      </Button>
    </form>
  );
}

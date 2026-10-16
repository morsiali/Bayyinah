'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Ban, FilePlus2, MessageSquareText, PhoneOff } from 'lucide-react';
import { Button, Field, Ltr, Notice, SeverityBadge, cx, flipRtl } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { useI18n } from '@/components/i18n';
import { REQUEST_TYPES, REQUEST_TYPE_LABELS, type RequestType } from '@/lib/constants';
import { msg } from '@/lib/i18n/core';

export type InboxSupplier = { id: string; name: string; recordedPhone: string | null; usualCurrency: string | null; reviewStatus: string };
export type InboxRow = {
  id: string;
  provider: string;
  fromNumber: string;
  toNumber: string | null;
  body: string | null;
  receivedAt: string;
  status: string;
  caseId: string | null;
  caseNumber: string | null;
  dismissedReason: string | null;
  handlerName: string | null;
  handledAt: string | null;
  detectedType: string;
  suggestedSupplierId: string | null;
  indicators: { category: string; severity: string }[];
};

const PROVIDER_LABEL: Record<string, string> = { TWILIO: msg('Twilio number'), FORWARDER: msg('Forwarding phone'), TEST: msg('Test message') };

export function SmsInbox({ orgId, rows, suppliers, canPrepare }: { orgId: string; rows: InboxRow[]; suppliers: InboxSupplier[]; canPrepare: boolean }) {
  return (
    <ul className="space-y-4" data-testid="sms-list">
      {rows.map((r) => (
        <li key={r.id}>
          <MessageCard orgId={orgId} m={r} suppliers={suppliers} canPrepare={canPrepare} />
        </li>
      ))}
    </ul>
  );
}

function MessageCard({ orgId, m, suppliers, canPrepare }: { orgId: string; m: InboxRow; suppliers: InboxSupplier[]; canPrepare: boolean }) {
  const { t, date } = useI18n();
  const [mode, setMode] = useState<'none' | 'case' | 'dismiss'>('none');
  const match = suppliers.find((s) => s.id === m.suggestedSupplierId);
  const isNew = m.status === 'NEW';
  return (
    <article className={cx('card p-5 md:p-6', isNew && 'border-s-[3px] border-s-brand-600')} data-testid="sms-message" aria-label={t('Message from {from}', { from: m.fromNumber })}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
            <MessageSquareText className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <Ltr mono>{m.fromNumber}</Ltr>
            <span className="rounded-sm border border-line-strong bg-mist px-1.5 py-px font-mono text-[10.5px] font-semibold uppercase tracking-[0.04em] text-ink-muted">{PROVIDER_LABEL[m.provider] ? t(PROVIDER_LABEL[m.provider]) : m.provider}</span>
          </p>
          <p className="mt-1 text-[13px] text-ink-muted">
            {t('Received {date}', { date: date(m.receivedAt, { dateStyle: 'medium', timeStyle: 'short' }) })}
            {m.toNumber ? <> · {t('to')} <Ltr mono>{m.toNumber}</Ltr></> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {m.detectedType !== 'UNKNOWN' && (
            <span className="rounded-sm border border-brand-200 bg-brand-50 px-2 py-0.5 text-[12px] font-semibold text-brand-800">{t('Looks like: {type}', { type: t(REQUEST_TYPE_LABELS[m.detectedType as RequestType]) })}</span>
          )}
        </div>
      </header>

      {m.body === null ? (
        <p className="mt-4 text-[14px] italic text-ink-muted">{t('Text removed under the organization’s retention policy.')}</p>
      ) : (
        <p className="mt-4 whitespace-pre-wrap break-words border border-line bg-mist px-4 py-3 text-[15px] leading-7" dir="auto" data-testid="sms-body">
          {m.body}
        </p>
      )}

      {m.indicators.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label={t('Language indicators')}>
          <span className="t-caption text-ink-muted">{t('Language indicators')}:</span>
          {m.indicators.map((i) => (
            <span key={i.category} className="inline-flex items-center gap-1.5 text-[13px]">
              <SeverityBadge severity={i.severity} /> {t(i.category.replace(/_/g, ' '))}
            </span>
          ))}
        </div>
      )}

      {isNew && (
        <div className="mt-4">
          {match ? (
            <Notice tone="review" title={t('Sender number matches the recorded phone of {name}', { name: `\u2068${match.name}\u2069` })}>
              {t('This is not verification: a sender number can be forged. Never call back or reply to a number from a message — use the supplier reference only.')}
            </Notice>
          ) : (
            <p className="flex items-center gap-2 text-[13px] text-ink-muted">
              <PhoneOff className="h-4 w-4 shrink-0" aria-hidden />
              {t('The sender number is not a phone you hold for any supplier.')}
            </p>
          )}
        </div>
      )}

      {isNew ? (
        <div className="mt-5 border-t border-line pt-4">
          {mode === 'none' && (
            <div className="flex flex-wrap gap-2">
              {canPrepare && (
                <Button size="sm" onClick={() => setMode('case')} data-testid="sms-open-case">
                  <FilePlus2 className="h-4 w-4" aria-hidden /> {t('Create case from this SMS')}
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setMode('dismiss')}>
                <Ban className="h-4 w-4" aria-hidden /> {t('Dismiss')}
              </Button>
            </div>
          )}
          {mode === 'case' && <CaseForm orgId={orgId} m={m} suppliers={suppliers} onCancel={() => setMode('none')} />}
          {mode === 'dismiss' && <DismissForm orgId={orgId} id={m.id} onCancel={() => setMode('none')} />}
        </div>
      ) : (
        <div className="mt-4 border-t border-line pt-3 text-[14px]">
          {m.status === 'CASE_CREATED' && m.caseId ? (
            <p>
              {t('Case created')}:{' '}
              <Link href={`/app/${orgId}/cases/${m.caseId}`} className="link inline-flex items-center gap-1 font-semibold">
                <Ltr mono>{m.caseNumber ?? m.caseId}</Ltr>
                <ArrowUpRight className={cx('h-3.5 w-3.5', flipRtl)} aria-hidden />
              </Link>
            </p>
          ) : (
            <p>
              {t('Dismissed')}: <span dir="auto">{m.dismissedReason}</span>
            </p>
          )}
          {m.handlerName && m.handledAt && <p className="mt-0.5 text-[13px] text-ink-muted">{t('by {name}, {date}', { name: m.handlerName, date: date(m.handledAt, { dateStyle: 'medium', timeStyle: 'short' }) })}</p>}
        </div>
      )}
    </article>
  );
}

function CaseForm({ orgId, m, suppliers, onCancel }: { orgId: string; m: InboxRow; suppliers: InboxSupplier[]; onCancel: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const { run, pending } = useAction();
  const [supplierId, setSupplierId] = useState(m.suggestedSupplierId ?? '');
  const [type, setType] = useState<string>(m.detectedType !== 'UNKNOWN' ? m.detectedType : '');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const supplier = suppliers.find((s) => s.id === supplierId);
  const idp = `sms-${m.id}`;
  return (
    <form
      className="space-y-4"
      data-testid="sms-case-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!supplierId || !type) return setError(t('Choose a supplier and a request type.'));
        const r = await run<{ id: string }>('case', `/api/orgs/${orgId}/inbox/${m.id}/case`, { body: { supplierId, requestType: type, expectedAmount: amount || null }, success: msg('Case created from the SMS'), refresh: false });
        if (r) router.push(`/app/${orgId}/cases/${r.id}`);
      }}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      {suppliers.length === 0 ? (
        <Notice tone="review">{t('Ask an organization admin to add the supplier reference first.')}</Notice>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={t('Supplier')} htmlFor={`${idp}-supplier`} hint={t('The supplier the message claims to come from.')}>
            <select id={`${idp}-supplier`} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="field-input">
              <option value="">{t('Choose a supplier…')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label={t('Request type')} htmlFor={`${idp}-type`}>
            <select id={`${idp}-type`} value={type} onChange={(e) => setType(e.target.value)} className="field-input">
              <option value="">{t('Choose a request type.')}</option>
              {REQUEST_TYPES.map((r) => (
                <option key={r} value={r}>{t(REQUEST_TYPE_LABELS[r])}</option>
              ))}
            </select>
          </Field>
          <Field label={`${t('Expected amount')}${supplier?.usualCurrency ? ` (${supplier.usualCurrency})` : ''} — ${t('optional')}`} htmlFor={`${idp}-amount`}>
            <input id={`${idp}-amount`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="field-input" dir="ltr" placeholder="18,750.00" />
          </Field>
        </div>
      )}
      <p className="text-[13px] text-ink-muted">{t('The SMS becomes the case’s first source, exactly as received, with its sender and time.')}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={pending === 'case'} disabled={suppliers.length === 0} data-testid="sms-create-case">
          {t('Create case')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t('Cancel')}
        </Button>
      </div>
    </form>
  );
}

function DismissForm({ orgId, id, onCancel }: { orgId: string; id: string; onCancel: () => void }) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const [reason, setReason] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await run('dismiss', `/api/orgs/${orgId}/inbox/${id}/dismiss`, { body: { reason }, success: msg('Message dismissed') });
      }}
    >
      <Field label={t('Why does this message need no case?')} htmlFor={`dismiss-${id}`} hint={t('For example: personal message, marketing, already handled in case BAY-…')}>
        <input id={`dismiss-${id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="field-input" required minLength={3} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="danger" loading={pending === 'dismiss'}>
          {t('Dismiss message')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t('Cancel')}
        </Button>
      </div>
    </form>
  );
}

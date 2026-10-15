'use client';
import { useState } from 'react';
import { Check, ChevronDown, CircleDashed, History, Paperclip, Pencil } from 'lucide-react';
import { Button, Ltr, Notice, SeverityBadge, cx } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { useI18n } from '@/components/i18n';
import { RULE_DESCRIPTIONS, type SupplierSnapshot } from '@/lib/analysis/rules';
import { CHANNEL_LABELS, DECISION_LABELS, EXTRACTED_FIELDS, FIELD_LABELS, OUTCOME_LABELS, REQUEST_TYPE_LABELS, TASK_TYPE_LABELS, isEditable, type Channel, type Decision, type ExtractedFieldKey, type ExtractedFields, type RequestType, type VerificationOutcome } from '@/lib/constants';
import { msg } from '@/lib/i18n/core';
import { maskAccount, compactIban } from '@/lib/iban';
import { emailDomain, namesEquivalent } from '@/lib/text';
import type { CaseData, Me } from './types';

const TASK_STATUS: Record<string, string> = { OPEN: msg('open'), COMPLETED: msg('completed'), SUPERSEDED: msg('superseded'), CANCELLED: msg('cancelled') };

function Section({ k, title, children, aside }: { k: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="card p-5" aria-labelledby={`sec-${k}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`sec-${k}`} className="flex items-center gap-2.5 text-[16px] font-semibold">
          <span className="flex h-7 w-7 items-center justify-center bg-navy font-mono text-[13px] text-white" aria-hidden>{k}</span>
          {title}
        </h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Passport({ data, orgId, me, onFocusFinding, activeQuote }: { data: CaseData; orgId: string; me: Me; onFocusFinding: (id: string | null) => void; activeQuote: string | null }) {
  const { t, tx, date } = useI18n();
  const c = data.case;
  const a = data.analysis;
  const fields = ((a?.effectiveFields ?? a?.extractedFields) ?? {}) as ExtractedFields;
  const original = (a?.extractedFields ?? {}) as ExtractedFields;
  const supplier = (data.currentVersion?.supplierSnapshot ?? {}) as unknown as SupplierSnapshot;
  const canCorrect = !!a && me.roles.includes('PREPARER') && isEditable(c.status);
  const names = data.names;
  const versionCorrections = data.corrections.filter((x) => x.caseInputVersionId === c.currentInputVersionId);
  const readable = c.sourceDocuments.filter((s) => s.extractionStatus === 'COMPLETED').length;

  return (
    <div className="space-y-4">
      {/* A. Request */}
      <Section k="A" title={t('Request')} aside={a ? <span className="t-eyebrow">{a.provider === 'local' ? t('Local rules analyzer') : <>{t('AI')} · <span dir="ltr">{a.model}</span></>}</span> : null}>
        {!a ? (
          <p className="text-[14px] text-ink-muted">
            {data.latestAnalysisAttempt?.status === 'FAILED' ? t('The last analysis failed ({ref}). Your evidence is saved; run it again.', { ref: data.latestAnalysisAttempt.errorRef ?? t('no reference') }) : t('What the request asks for appears here after analysis.')}
          </p>
        ) : (
          <>
            <p className="text-[15px] leading-6" dir="auto">{tx(a.summary)}</p>
            {a.detectedRequestType && a.detectedRequestType !== 'UNKNOWN' && a.detectedRequestType !== c.requestType && (
              <Notice tone="review" className="mt-3">{t('The document reads like a {detected}, but this case is a {type}.', { detected: t(REQUEST_TYPE_LABELS[a.detectedRequestType as RequestType]).toLowerCase(), type: t(REQUEST_TYPE_LABELS[c.requestType as RequestType]).toLowerCase() })}</Notice>
            )}
            <dl className="mt-4 divide-y divide-line border border-line">
              {EXTRACTED_FIELDS.map((k) => (
                <FieldRow key={k} k={k} value={fields[k] ?? null} original={original[k] ?? null} canCorrect={canCorrect} orgId={orgId} caseId={c.id} revision={c.revision} />
              ))}
            </dl>
            {versionCorrections.length > 0 && (
              <details className="mt-3 text-[13px]">
                <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-ink-soft"><History className="h-3.5 w-3.5" aria-hidden /> {t('Corrections on this version: {n}', { n: versionCorrections.length })}</summary>
                <ul className="mt-2 space-y-2">
                  {versionCorrections.map((x) => (
                    <li key={x.id} className="bg-mist p-2.5">
                      <span className="font-semibold">{t(FIELD_LABELS[x.fieldName as ExtractedFieldKey])}</span>: <Ltr>{x.originalValue ?? t('empty')}</Ltr> <span className="inline-block rtl:-scale-x-100">→</span> <Ltr className="font-semibold">{x.correctedValue ?? t('empty')}</Ltr>
                      <span className="block text-ink-muted">“{x.note}” — {names[x.correctedBy]?.name ?? t('member')}, {date(x.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </Section>

      {/* B. Evidence */}
      <Section k="B" title={t('Evidence and findings')} aside={a ? <span className="t-eyebrow">{t('Findings: {n}', { n: data.findings.length })}</span> : null}>
        <p className="text-[13px] text-ink-muted">
          {t('Readable sources: {r} · unreadable: {u}.', { r: readable, u: c.sourceDocuments.length - readable })}{' '}
          {a?.rejectedCitations ? t('AI indicators discarded because their quotes were not found in the source: {n}.', { n: a.rejectedCitations }) : ''}
        </p>
        {!a ? (
          <p className="mt-3 text-[14px] text-ink-muted">{t('Findings appear after analysis.')}</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {data.findings.map((f) => (
              <FindingItem key={f.id} f={f} sourceIndex={c.sourceDocuments.findIndex((s) => s.id === f.sourceDocumentId)} active={activeQuote === f.id} onFocus={onFocusFinding} />
            ))}
          </ul>
        )}
        {a && Array.isArray(a.missingInformation) && (a.missingInformation as string[]).length > 0 && (
          <div className="mt-4">
            <p className="text-[13px] font-semibold">{t('Still missing')}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {(a.missingInformation as string[]).map((m) => (
                <li key={m} className="border border-dashed border-amber-300 bg-amber-50/60 px-2 py-1 text-[12.5px] text-amber-900">{tx(m)}</li>
              ))}
            </ul>
          </div>
        )}
        {a && Array.isArray(a.suggestedQuestions) && (a.suggestedQuestions as string[]).length > 0 && (
          <details className="mt-4 text-[13.5px]">
            <summary className="cursor-pointer font-semibold">{t('Suggested questions for verification')}</summary>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-ink-soft">
              {(a.suggestedQuestions as string[]).map((q) => <li key={q} dir="auto">{tx(q)}</li>)}
            </ul>
            <p className="t-caption mt-2 text-ink-muted">{t('Suggestions only — ask through the reference channel.')}</p>
          </details>
        )}
      </Section>

      {/* C. Differences */}
      <Section k="C" title={t('Differences from the supplier reference')}>
        {!a ? <p className="text-[14px] text-ink-muted">{t('Compared after analysis.')}</p> : <DiffTable fields={fields} supplier={supplier} expected={c.expectedAmount ? `${c.expectedCurrency ?? ''} ${c.expectedAmount}` : null} />}
        <p className="t-caption mt-3 text-ink-muted">{t('Reference information reviewed by the business · supplier version {v}. Matching details do not prove authenticity.', { v: data.currentVersion?.supplierVersionNumber })}</p>
      </Section>

      {/* D. Verification */}
      <Section k="D" title={t('Independent verification')}>
        <Verification data={data} orgId={orgId} />
      </Section>

      {/* E. Decision */}
      <Section k="E" title={t('Decision')}>
        {c.reviews.length === 0 ? (
          <p className="text-[14px] text-ink-muted">{t('No decision recorded yet.')}</p>
        ) : (
          <ul className="space-y-3">
            {c.reviews.map((r, i) => {
              const v = c.inputVersions.find((x) => x.id === r.caseInputVersionId);
              return (
                <li key={r.id} className={cx('border p-3.5', i === 0 ? 'border-line-strong bg-white' : 'border-line bg-mist opacity-80')}>
                  <p className="text-[15px] font-semibold">{t(DECISION_LABELS[r.decision as Decision])}</p>
                  <p className="mt-1 text-[14px] leading-6" dir="auto">{r.rationale}</p>
                  <p className="t-caption mt-2 text-ink-muted">
                    {names[r.reviewerId]?.name ?? t('Reviewer')} · {date(r.createdAt)} · {t('evidence version {n}', { n: v?.versionNumber ?? '?' })}
                    {i > 0 ? ` · ${t('earlier decision')}` : ''}
                  </p>
                  {r.decision === 'APPROVED' && <p className="t-caption mt-1 text-ink-muted">{t('An authorized reviewer recorded approval within this workflow. This does not execute or authorize a bank transfer.')}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function FieldRow({ k, value, original, canCorrect, orgId, caseId, revision }: { k: ExtractedFieldKey; value: string | null; original: string | null; canCorrect: boolean; orgId: string; caseId: string; revision: number }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value ?? '');
  const [note, setNote] = useState('');
  const { run, pending } = useAction();
  const corrected = (value ?? null) !== (original ?? null);
  return (
    <div className="px-3.5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <dt className="pt-0.5 text-[13px] text-ink-muted">{t(FIELD_LABELS[k])}</dt>
        <dd className="flex min-w-0 items-center gap-2 text-end text-[14px] font-semibold">
          {value ? <Ltr mono={k === 'iban' || k === 'accountNumber'} className="break-all">{value}</Ltr> : <span className="font-normal text-amber-700">{t('Not found')}</span>}
          {corrected && <span className="rounded-sm bg-brand-50 px-1.5 text-[11px] font-bold text-brand-800">{t('Corrected')}</span>}
          {canCorrect && !editing && (
            <button onClick={() => setEditing(true)} className="p-1 text-ink-faint hover:bg-mist hover:text-ink" aria-label={t('Correct {field}', { field: t(FIELD_LABELS[k]) })}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </dd>
      </div>
      {editing && (
        <form
          className="mt-2 grid gap-2 bg-mist p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run<{ material: boolean }>('c', `/api/orgs/${orgId}/cases/${caseId}/correct`, { body: { fieldName: k, value: v.trim() || null, note, expectedRevision: revision } });
            if (r) {
              const { toast } = await import('sonner');
              toast.success(r.material ? t('Correction saved. Rules re-ran; verification and agent steps must be repeated.') : t('Correction saved.'));
              setEditing(false);
              setNote('');
            }
          }}
        >
          <label className="text-[12.5px] font-semibold" htmlFor={`fv-${k}`}>{t('Corrected value (leave empty if absent)')}</label>
          <input id={`fv-${k}`} value={v} onChange={(e) => setV(e.target.value)} className="field-input py-2 text-[14px]" dir="auto" />
          <label className="text-[12.5px] font-semibold" htmlFor={`fn-${k}`}>{t('Why — what in the source shows this?')}</label>
          <input id={`fn-${k}`} value={note} onChange={(e) => setNote(e.target.value)} required minLength={5} className="field-input py-2 text-[14px]" />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={pending === 'c'}>{t('Save correction')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('Cancel')}</Button>
          </div>
          {original !== null && <p className="t-caption text-ink-muted">{t('Original extraction kept:')} <Ltr>{original}</Ltr></p>}
        </form>
      )}
    </div>
  );
}

function FindingItem({ f, sourceIndex, active, onFocus }: { f: CaseData['findings'][number]; sourceIndex: number; active: boolean; onFocus: (id: string | null) => void }) {
  const { t, tx } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <li className={cx('border border-s-[3px] p-3.5', active ? 'border-brand-300 border-s-brand-600 bg-brand-50/40' : 'border-line bg-white', !active && (f.severity === 'critical' || f.severity === 'warning' ? 'border-s-signal-red' : f.severity === 'review' ? 'border-s-signal-amber' : 'border-s-line-strong'))}>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={f.severity} />
        <span className="text-[12.5px] font-semibold text-ink-muted">{f.source === 'RULE' ? <>{t('Business rule')} <Ltr mono>{f.ruleId}</Ltr></> : `${t('AI indicator')} · ${t(f.category.replace(/_/g, ' '))}`}</span>
      </div>
      <p className="mt-1.5 text-[14px] leading-6" dir="auto">{tx(f.explanation)}</p>
      {f.evidenceQuote && (
        <blockquote className="mt-2 border-s-2 border-brand-300 ps-3 text-[13px] italic text-ink-soft">
          <span dir="auto">“{f.evidenceQuote}”</span> <span className="not-italic text-ink-muted">— {t('source')} S{sourceIndex + 1}</span>
        </blockquote>
      )}
      {(f.referenceValue || f.submittedValue) && (
        <p className="mt-2 text-[13px]">
          <span className="text-ink-muted">{t('Reference')} </span><Ltr mono>{f.referenceValue ?? '—'}</Ltr>
          <span className="text-ink-muted"> · {t('submitted')} </span><Ltr mono className="text-red-700">{f.submittedValue ?? '—'}</Ltr>
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="link inline-flex items-center gap-1">
          {t('Explain this finding')} <ChevronDown className={cx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {f.evidenceQuote && (
          <button onClick={() => onFocus(active ? null : f.id)} className="link">
            {active ? t('Clear highlight') : t('Show in source')}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 bg-mist p-3 text-[13px] leading-5 text-ink-soft">
          {f.source === 'RULE' ? (
            <>
              <p className="font-semibold text-ink">{t('Deterministic rule')} <Ltr mono>{f.ruleId}</Ltr></p>
              <p>{RULE_DESCRIPTIONS[f.ruleId ?? ''] ? t(RULE_DESCRIPTIONS[f.ruleId ?? '']) : t('A fixed business rule evaluated on the extracted values and the supplier snapshot.')}</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-ink">{t('Language indicator from analysis')}</p>
              <p>
                {f.evidenceQuote
                  ? t('The quoted words were checked against the source text and found there. The indicator is a reason for a person to look closer — it is not a conclusion about the request.')
                  : t('This note concerns information that is absent from the source; nothing is quoted because nothing was found.')}
              </p>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function DiffTable({ fields, supplier, expected }: { fields: ExtractedFields; supplier: SupplierSnapshot; expected: string | null }) {
  const { t } = useI18n();
  type Row = { key: string; label: string; ref: string | null | undefined; sub: string | null | undefined; state: 'match' | 'differs' | 'missing' | 'noref' };
  const state = (ref: string | null | undefined, sub: string | null | undefined, eq: (a: string, b: string) => boolean): Row['state'] => (!sub ? 'missing' : !ref ? 'noref' : eq(ref, sub) ? 'match' : 'differs');
  const rows: Row[] = [
    { key: 'ben', label: t('Beneficiary'), ref: supplier.expectedBeneficiaryName, sub: fields.beneficiaryName, state: state(supplier.expectedBeneficiaryName, fields.beneficiaryName, namesEquivalent) },
    { key: 'iban', label: t('IBAN'), ref: maskAccount(supplier.referenceIban), sub: fields.iban, state: state(supplier.referenceIban, fields.iban, (x, y) => compactIban(x) === compactIban(y)) },
    { key: 'acc', label: t('Account number'), ref: maskAccount(supplier.referenceBankAccount), sub: fields.accountNumber, state: state(supplier.referenceBankAccount, fields.accountNumber, (x, y) => x.replace(/\W/g, '') === y.replace(/\W/g, '')) },
    { key: 'dom', label: t('Email domain'), ref: emailDomain(supplier.recordedEmail), sub: emailDomain(fields.senderEmail), state: state(emailDomain(supplier.recordedEmail), emailDomain(fields.senderEmail), (x, y) => x === y) },
    { key: 'cur', label: t('Currency'), ref: supplier.usualCurrency, sub: fields.currency, state: state(supplier.usualCurrency, fields.currency, (x, y) => x.toUpperCase() === y.toUpperCase()) },
  ];
  if (expected) rows.push({ key: 'amt', label: t('Amount (expected)'), ref: expected, sub: fields.amount, state: fields.amount ? 'noref' : 'missing' });
  const badge = { match: [t('Matches'), 'text-ink-muted'], differs: [t('Differs'), 'text-red-700 font-bold'], missing: [t('Missing in request'), 'text-amber-700'], noref: [t('Not on reference'), 'text-ink-muted'] } as const;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-[13.5px]">
        <thead>
          <tr className="text-start text-[12px] text-ink-muted">
            <th className="pb-2 text-start font-semibold">{t('Field')}</th>
            <th className="pb-2 text-start font-semibold">{t('Reference')}</th>
            <th className="pb-2 text-start font-semibold">{t('Submitted')}</th>
            <th className="pb-2 text-end font-semibold">{t('Result')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-line">
              <td className="py-2 pe-3 font-semibold">{r.label}</td>
              <td className="py-2 pe-3">{r.ref ? <Ltr mono>{r.ref}</Ltr> : <span className="text-ink-faint">—</span>}</td>
              <td className={cx('py-2 pe-3', r.state === 'differs' && 'text-red-700')}>{r.sub ? <Ltr mono>{r.sub}</Ltr> : <span className="text-ink-faint">—</span>}</td>
              <td className={cx('py-2 text-end text-[12.5px]', badge[r.state][1])}>{r.key === 'amt' && r.state === 'noref' ? <>{t('See rule')} <Ltr mono>R-AMOUNT</Ltr></> : badge[r.state][0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Verification({ data, orgId }: { data: CaseData; orgId: string }) {
  const { t, tx, date } = useI18n();
  const c = data.case;
  const current = data.currentTasks;
  const history = data.tasks.filter((x) => !current.some((y) => y.id === x.id));
  const names = data.names;
  const req = data.requirements.find((r) => r.key === 'VERIFICATION_RECORDED');
  return (
    <div className="space-y-3">
      {!req && <p className="text-[14px] text-ink-muted">{data.analysis ? t('No independent verification is required by the rules for this invoice. You may still verify before paying.') : t('Determined after analysis and the preparation agent.')}</p>}
      {req && current.length === 0 && <p className="text-[14px] text-ink-muted">{t('Required. Run the preparation agent to create the verification task.')}</p>}
      {current.map((task) => (
        <div key={task.id} className="border border-line p-3.5">
          <div className="flex items-start gap-2">
            {task.status === 'COMPLETED' ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--done)]" aria-label={t('step completed')} /> : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label={t('open')} />}
            <div className="min-w-0">
              <p className="text-[14px] font-semibold">{TASK_TYPE_LABELS[task.taskType] ? t(TASK_TYPE_LABELS[task.taskType]) : task.taskType}</p>
              <p className="text-[13px] text-ink-soft">{tx(task.requirement)}</p>
              {task.suggestedChannel && (
                <p className="mt-1 text-[13px]"><span className="text-ink-muted">{t('Channel:')} </span><span className="font-semibold">{tx(task.suggestedChannel)}</span> <span className="text-ink-muted">— {tx(task.channelSource)}</span></p>
              )}
            </div>
          </div>
          {task.results.map((r) => (
            <div key={r.id} className="mt-3 bg-mist p-3 text-[13px]">
              <p className="font-semibold">{t(OUTCOME_LABELS[r.outcome as VerificationOutcome])}</p>
              <p className="text-ink-soft">{t('Checked:')} {tx(r.requirementChecked)}</p>
              <p className="text-ink-soft">{t('Channel:')} {CHANNEL_LABELS[r.channelUsed as Channel] ? t(CHANNEL_LABELS[r.channelUsed as Channel]) : tx(r.channelUsed)} — {tx(r.channelSource)}</p>
              {r.notes && <p className="mt-1" dir="auto">“{r.notes}”</p>}
              {r.attachmentKey && (
                <a className="link mt-1 inline-flex items-center gap-1" href={`/api/orgs/${orgId}/attachments/${r.id}`}><Paperclip className="h-3.5 w-3.5" aria-hidden /> {r.attachmentName ?? t('Attachment')}</a>
              )}
              <p className="t-caption mt-1.5 text-ink-muted">{t('Verification outcome recorded by {name} on {date}.', { name: names[r.performedBy]?.name ?? t('a member'), date: date(r.performedAt) })}</p>
            </div>
          ))}
        </div>
      ))}
      {history.length > 0 && (
        <details className="text-[13px]">
          <summary className="cursor-pointer font-semibold text-ink-soft">{t('Earlier tasks (superseded or from earlier versions): {n}', { n: history.length })}</summary>
          <ul className="mt-2 space-y-1.5">
            {history.map((task) => (
              <li key={task.id} className="bg-mist p-2.5 text-ink-muted">
                {TASK_TYPE_LABELS[task.taskType] ? t(TASK_TYPE_LABELS[task.taskType]) : task.taskType} — {t(TASK_STATUS[task.status] ?? task.status.toLowerCase())}
                {task.results[0] ? ` · ${t(OUTCOME_LABELS[task.results[0].outcome as VerificationOutcome])} (${names[task.results[0].performedBy]?.name ?? t('member')})` : ''}
                {' · '}{t('version {n}', { n: c.inputVersions.find((v) => v.id === task.caseInputVersionId)?.versionNumber ?? '?' })}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

'use client';
import { useState } from 'react';
import { Check, ChevronDown, CircleDashed, History, Paperclip, Pencil } from 'lucide-react';
import { Button, Ltr, Notice, SeverityBadge, cx } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { RULE_DESCRIPTIONS, type SupplierSnapshot } from '@/lib/analysis/rules';
import { DECISION_LABELS, EXTRACTED_FIELDS, FIELD_LABELS, OUTCOME_LABELS, REQUEST_TYPE_LABELS, TASK_TYPE_LABELS, isEditable, type Decision, type ExtractedFieldKey, type ExtractedFields, type RequestType, type VerificationOutcome } from '@/lib/constants';
import { maskAccount, compactIban } from '@/lib/iban';
import { emailDomain, namesEquivalent } from '@/lib/text';
import type { CaseData, Me } from './types';

const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dubai' });

function Section({ k, title, children, aside }: { k: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="card p-5" aria-labelledby={`sec-${k}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`sec-${k}`} className="flex items-center gap-2.5 text-[16px] font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy text-[13px] text-white" aria-hidden>{k}</span>
          {title}
        </h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Passport({ data, orgId, me, onFocusFinding, activeQuote }: { data: CaseData; orgId: string; me: Me; onFocusFinding: (id: string | null) => void; activeQuote: string | null }) {
  const c = data.case;
  const a = data.analysis;
  const fields = ((a?.effectiveFields ?? a?.extractedFields) ?? {}) as ExtractedFields;
  const original = (a?.extractedFields ?? {}) as ExtractedFields;
  const supplier = (data.currentVersion?.supplierSnapshot ?? {}) as unknown as SupplierSnapshot;
  const canCorrect = !!a && me.roles.includes('PREPARER') && isEditable(c.status);
  const names = data.names;
  const versionCorrections = data.corrections.filter((x) => x.caseInputVersionId === c.currentInputVersionId);

  return (
    <div className="space-y-4">
      {/* A. Request */}
      <Section k="A" title="Request" aside={a ? <span className="t-caption text-ink-muted">{a.provider === 'local' ? 'Local rules analyzer' : `AI · ${a.model}`}</span> : null}>
        {!a ? (
          <p className="text-[14px] text-ink-muted">
            {data.latestAnalysisAttempt?.status === 'FAILED' ? `The last analysis failed (${data.latestAnalysisAttempt.errorRef ?? 'no reference'}). Your evidence is saved; run it again.` : 'What the request asks for appears here after analysis.'}
          </p>
        ) : (
          <>
            <p className="text-[15px] leading-6">{a.summary}</p>
            {a.detectedRequestType && a.detectedRequestType !== 'UNKNOWN' && a.detectedRequestType !== c.requestType && (
              <Notice tone="review" className="mt-3">The document reads like a {REQUEST_TYPE_LABELS[a.detectedRequestType as RequestType].toLowerCase()}, but this case is a {REQUEST_TYPE_LABELS[c.requestType as RequestType].toLowerCase()}.</Notice>
            )}
            <dl className="mt-4 divide-y divide-line rounded-xl border border-line">
              {EXTRACTED_FIELDS.map((k) => (
                <FieldRow key={k} k={k} value={fields[k] ?? null} original={original[k] ?? null} canCorrect={canCorrect} orgId={orgId} caseId={c.id} revision={c.revision} />
              ))}
            </dl>
            {versionCorrections.length > 0 && (
              <details className="mt-3 text-[13px]">
                <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-ink-soft"><History className="h-3.5 w-3.5" aria-hidden /> {versionCorrections.length} correction{versionCorrections.length > 1 ? 's' : ''} on this version</summary>
                <ul className="mt-2 space-y-2">
                  {versionCorrections.map((x) => (
                    <li key={x.id} className="rounded-lg bg-zinc-50 p-2.5">
                      <span className="font-semibold">{FIELD_LABELS[x.fieldName as ExtractedFieldKey]}</span>: <Ltr>{x.originalValue ?? 'empty'}</Ltr> → <Ltr className="font-semibold">{x.correctedValue ?? 'empty'}</Ltr>
                      <span className="block text-ink-muted">“{x.note}” — {names[x.correctedBy]?.name ?? 'member'}, {fmt(x.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </Section>

      {/* B. Evidence */}
      <Section k="B" title="Evidence and findings" aside={a ? <span className="t-caption text-ink-muted">{data.findings.length} finding{data.findings.length === 1 ? '' : 's'}</span> : null}>
        <p className="text-[13px] text-ink-muted">
          {c.sourceDocuments.filter((s) => s.extractionStatus === 'COMPLETED').length} readable source(s), {c.sourceDocuments.filter((s) => s.extractionStatus !== 'COMPLETED').length} unreadable.{' '}
          {a?.rejectedCitations ? `${a.rejectedCitations} AI indicator(s) were discarded because their quotes were not found in the source.` : ''}
        </p>
        {!a ? (
          <p className="mt-3 text-[14px] text-ink-muted">Findings appear after analysis.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {data.findings.map((f) => (
              <FindingItem key={f.id} f={f} sourceIndex={c.sourceDocuments.findIndex((s) => s.id === f.sourceDocumentId)} active={activeQuote === f.id} onFocus={onFocusFinding} />
            ))}
          </ul>
        )}
        {a && Array.isArray(a.missingInformation) && (a.missingInformation as string[]).length > 0 && (
          <div className="mt-4">
            <p className="text-[13px] font-semibold">Still missing</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {(a.missingInformation as string[]).map((m) => (
                <li key={m} className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-2 py-1 text-[12.5px] text-amber-900">{m}</li>
              ))}
            </ul>
          </div>
        )}
        {a && Array.isArray(a.suggestedQuestions) && (a.suggestedQuestions as string[]).length > 0 && (
          <details className="mt-4 text-[13.5px]">
            <summary className="cursor-pointer font-semibold">Suggested questions for verification</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
              {(a.suggestedQuestions as string[]).map((q) => <li key={q}>{q}</li>)}
            </ul>
            <p className="t-caption mt-2 text-ink-muted">Suggestions only — ask through the reference channel.</p>
          </details>
        )}
      </Section>

      {/* C. Differences */}
      <Section k="C" title="Differences from the supplier reference">
        {!a ? <p className="text-[14px] text-ink-muted">Compared after analysis.</p> : <DiffTable fields={fields} supplier={supplier} expected={c.expectedAmount ? `${c.expectedCurrency ?? ''} ${c.expectedAmount}` : null} />}
        <p className="t-caption mt-3 text-ink-muted">Reference information reviewed by the business · supplier version {data.currentVersion?.supplierVersionNumber}. Matching details do not prove authenticity.</p>
      </Section>

      {/* D. Verification */}
      <Section k="D" title="Independent verification">
        <Verification data={data} orgId={orgId} />
      </Section>

      {/* E. Decision */}
      <Section k="E" title="Decision">
        {c.reviews.length === 0 ? (
          <p className="text-[14px] text-ink-muted">No decision recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {c.reviews.map((r, i) => {
              const v = c.inputVersions.find((x) => x.id === r.caseInputVersionId);
              return (
                <li key={r.id} className={cx('rounded-xl border p-3.5', i === 0 ? 'border-line-strong bg-white' : 'border-line bg-zinc-50 opacity-80')}>
                  <p className="text-[15px] font-bold">{DECISION_LABELS[r.decision as Decision]}</p>
                  <p className="mt-1 text-[14px] leading-6">{r.rationale}</p>
                  <p className="t-caption mt-2 text-ink-muted">
                    {names[r.reviewerId]?.name ?? 'Reviewer'} · {fmt(r.createdAt)} · evidence version {v?.versionNumber ?? '?'}
                    {i > 0 ? ' · earlier decision' : ''}
                  </p>
                  {r.decision === 'APPROVED' && <p className="t-caption mt-1 text-ink-muted">An authorized reviewer recorded approval within this workflow. This does not execute or authorize a bank transfer.</p>}
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
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value ?? '');
  const [note, setNote] = useState('');
  const { run, pending } = useAction();
  const corrected = (value ?? null) !== (original ?? null);
  return (
    <div className="px-3.5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <dt className="pt-0.5 text-[13px] text-ink-muted">{FIELD_LABELS[k]}</dt>
        <dd className="flex min-w-0 items-center gap-2 text-right text-[14px] font-semibold">
          {value ? <Ltr mono={k === 'iban' || k === 'accountNumber'} className="break-all">{value}</Ltr> : <span className="font-normal text-amber-700">Not found</span>}
          {corrected && <span className="rounded bg-brand-50 px-1.5 text-[11px] font-bold text-brand-800">Corrected</span>}
          {canCorrect && !editing && (
            <button onClick={() => setEditing(true)} className="rounded-md p-1 text-ink-faint hover:bg-zinc-100 hover:text-ink" aria-label={`Correct ${FIELD_LABELS[k]}`}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </dd>
      </div>
      {editing && (
        <form
          className="mt-2 grid gap-2 rounded-lg bg-zinc-50 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run<{ material: boolean }>('c', `/api/orgs/${orgId}/cases/${caseId}/correct`, { body: { fieldName: k, value: v.trim() || null, note, expectedRevision: revision } });
            if (r) {
              const { toast } = await import('sonner');
              toast.success(r.material ? 'Correction saved. Rules re-ran; verification and agent steps must be repeated.' : 'Correction saved.');
              setEditing(false);
              setNote('');
            }
          }}
        >
          <label className="text-[12.5px] font-semibold" htmlFor={`fv-${k}`}>Corrected value (leave empty if absent)</label>
          <input id={`fv-${k}`} value={v} onChange={(e) => setV(e.target.value)} className="field-input py-2 text-[14px]" dir="auto" />
          <label className="text-[12.5px] font-semibold" htmlFor={`fn-${k}`}>Why — what in the source shows this?</label>
          <input id={`fn-${k}`} value={note} onChange={(e) => setNote(e.target.value)} required minLength={5} className="field-input py-2 text-[14px]" />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={pending === 'c'}>Save correction</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
          {original !== null && <p className="t-caption text-ink-muted">Original extraction kept: <Ltr>{original}</Ltr></p>}
        </form>
      )}
    </div>
  );
}

function FindingItem({ f, sourceIndex, active, onFocus }: { f: CaseData['findings'][number]; sourceIndex: number; active: boolean; onFocus: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={cx('rounded-xl border p-3.5', active ? 'border-brand-300 bg-brand-50/40' : 'border-line bg-white')}>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={f.severity} />
        <span className="text-[12.5px] font-semibold text-ink-muted">{f.source === 'RULE' ? `Business rule ${f.ruleId}` : `AI indicator · ${f.category.replace(/_/g, ' ')}`}</span>
      </div>
      <p className="mt-1.5 text-[14px] leading-6">{f.explanation}</p>
      {f.evidenceQuote && (
        <blockquote className="mt-2 border-l-2 border-brand-300 pl-3 text-[13px] italic text-ink-soft">
          “{f.evidenceQuote}” <span className="not-italic text-ink-muted">— source S{sourceIndex + 1}</span>
        </blockquote>
      )}
      {(f.referenceValue || f.submittedValue) && (
        <p className="mt-2 text-[13px]">
          <span className="text-ink-muted">Reference </span><Ltr mono>{f.referenceValue ?? '—'}</Ltr>
          <span className="text-ink-muted"> · submitted </span><Ltr mono className="text-red-700">{f.submittedValue ?? '—'}</Ltr>
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="link inline-flex items-center gap-1">
          Explain this finding <ChevronDown className={cx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {f.evidenceQuote && (
          <button onClick={() => onFocus(active ? null : f.id)} className="link">
            {active ? 'Clear highlight' : 'Show in source'}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 rounded-lg bg-zinc-50 p-3 text-[13px] leading-5 text-ink-soft">
          {f.source === 'RULE' ? (
            <>
              <p className="font-semibold text-ink">Deterministic rule {f.ruleId}</p>
              <p>{RULE_DESCRIPTIONS[f.ruleId ?? ''] ?? 'A fixed business rule evaluated on the extracted values and the supplier snapshot.'}</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-ink">Language indicator from analysis</p>
              <p>
                {f.evidenceQuote
                  ? 'The quoted words were checked against the source text and found there. The indicator is a reason for a person to look closer — it is not a conclusion about the request.'
                  : 'This note concerns information that is absent from the source; nothing is quoted because nothing was found.'}
              </p>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function DiffTable({ fields, supplier, expected }: { fields: ExtractedFields; supplier: SupplierSnapshot; expected: string | null }) {
  type Row = { label: string; ref: string | null | undefined; sub: string | null | undefined; state: 'match' | 'differs' | 'missing' | 'noref' };
  const state = (ref: string | null | undefined, sub: string | null | undefined, eq: (a: string, b: string) => boolean): Row['state'] => (!sub ? 'missing' : !ref ? 'noref' : eq(ref, sub) ? 'match' : 'differs');
  const rows: Row[] = [
    { label: 'Beneficiary', ref: supplier.expectedBeneficiaryName, sub: fields.beneficiaryName, state: state(supplier.expectedBeneficiaryName, fields.beneficiaryName, namesEquivalent) },
    { label: 'IBAN', ref: maskAccount(supplier.referenceIban), sub: fields.iban, state: state(supplier.referenceIban, fields.iban, (x, y) => compactIban(x) === compactIban(y)) },
    { label: 'Account number', ref: maskAccount(supplier.referenceBankAccount), sub: fields.accountNumber, state: state(supplier.referenceBankAccount, fields.accountNumber, (x, y) => x.replace(/\W/g, '') === y.replace(/\W/g, '')) },
    { label: 'Email domain', ref: emailDomain(supplier.recordedEmail), sub: emailDomain(fields.senderEmail), state: state(emailDomain(supplier.recordedEmail), emailDomain(fields.senderEmail), (x, y) => x === y) },
    { label: 'Currency', ref: supplier.usualCurrency, sub: fields.currency, state: state(supplier.usualCurrency, fields.currency, (x, y) => x.toUpperCase() === y.toUpperCase()) },
  ];
  if (expected) rows.push({ label: 'Amount (expected)', ref: expected, sub: fields.amount, state: fields.amount ? 'noref' : 'missing' });
  const badge = { match: ['Matches', 'text-ink-muted'], differs: ['Differs', 'text-red-700 font-bold'], missing: ['Missing in request', 'text-amber-700'], noref: ['Not on reference', 'text-ink-muted'] } as const;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-[13.5px]">
        <thead>
          <tr className="text-left text-[12px] text-ink-muted">
            <th className="pb-2 font-semibold">Field</th>
            <th className="pb-2 font-semibold">Reference</th>
            <th className="pb-2 font-semibold">Submitted</th>
            <th className="pb-2 text-right font-semibold">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-line">
              <td className="py-2 pr-3 font-semibold">{r.label}</td>
              <td className="py-2 pr-3">{r.ref ? <Ltr mono>{r.ref}</Ltr> : <span className="text-ink-faint">—</span>}</td>
              <td className={cx('py-2 pr-3', r.state === 'differs' && 'text-red-700')}>{r.sub ? <Ltr mono>{r.sub}</Ltr> : <span className="text-ink-faint">—</span>}</td>
              <td className={cx('py-2 text-right text-[12.5px]', badge[r.state][1])}>{r.label === 'Amount (expected)' && r.state === 'noref' ? 'See rule R-AMOUNT' : badge[r.state][0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Verification({ data, orgId }: { data: CaseData; orgId: string }) {
  const c = data.case;
  const current = data.currentTasks;
  const history = data.tasks.filter((t) => !current.some((x) => x.id === t.id));
  const names = data.names;
  const req = data.requirements.find((r) => r.key === 'VERIFICATION_RECORDED');
  return (
    <div className="space-y-3">
      {!req && <p className="text-[14px] text-ink-muted">{data.analysis ? 'No independent verification is required by the rules for this invoice. You may still verify before paying.' : 'Determined after analysis and the preparation agent.'}</p>}
      {req && current.length === 0 && <p className="text-[14px] text-ink-muted">Required. Run the preparation agent to create the verification task.</p>}
      {current.map((t) => (
        <div key={t.id} className="rounded-xl border border-line p-3.5">
          <div className="flex items-start gap-2">
            {t.status === 'COMPLETED' ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="step completed" /> : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="open" />}
            <div className="min-w-0">
              <p className="text-[14px] font-bold">{TASK_TYPE_LABELS[t.taskType] ?? t.taskType}</p>
              <p className="text-[13px] text-ink-soft">{t.requirement}</p>
              {t.suggestedChannel && (
                <p className="mt-1 text-[13px]"><span className="text-ink-muted">Channel: </span><Ltr className="font-semibold">{t.suggestedChannel}</Ltr> <span className="text-ink-muted">— {t.channelSource}</span></p>
              )}
            </div>
          </div>
          {t.results.map((r) => (
            <div key={r.id} className="mt-3 rounded-lg bg-zinc-50 p-3 text-[13px]">
              <p className="font-bold">{OUTCOME_LABELS[r.outcome as VerificationOutcome]}</p>
              <p className="text-ink-soft">Checked: {r.requirementChecked}</p>
              <p className="text-ink-soft">Channel: {r.channelUsed} — {r.channelSource}</p>
              {r.notes && <p className="mt-1">“{r.notes}”</p>}
              {r.attachmentKey && (
                <a className="link mt-1 inline-flex items-center gap-1" href={`/api/orgs/${orgId}/attachments/${r.id}`}><Paperclip className="h-3.5 w-3.5" aria-hidden /> {r.attachmentName ?? 'Attachment'}</a>
              )}
              <p className="t-caption mt-1.5 text-ink-muted">Verification outcome recorded by {names[r.performedBy]?.name ?? 'a member'} on {fmt(r.performedAt)}.</p>
            </div>
          ))}
        </div>
      ))}
      {history.length > 0 && (
        <details className="text-[13px]">
          <summary className="cursor-pointer font-semibold text-ink-soft">{history.length} earlier task{history.length > 1 ? 's' : ''} (superseded or from earlier versions)</summary>
          <ul className="mt-2 space-y-1.5">
            {history.map((t) => (
              <li key={t.id} className="rounded-lg bg-zinc-50 p-2.5 text-ink-muted">
                {TASK_TYPE_LABELS[t.taskType] ?? t.taskType} — {t.status.toLowerCase()}
                {t.results[0] ? ` · ${OUTCOME_LABELS[t.results[0].outcome as VerificationOutcome]} (${names[t.results[0].performedBy]?.name ?? 'member'})` : ''}
                {' · version '}{c.inputVersions.find((v) => v.id === t.caseInputVersionId)?.versionNumber ?? '?'}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

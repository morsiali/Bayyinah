import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guardPage } from '@/lib/page-guard';
import { getCaseDetail } from '@/lib/services/cases';
import { PrintButton } from '@/components/case/print-button';
import { Logo, Ltr } from '@/components/ui';
import { DECISION_LABELS, FIELD_LABELS, OUTCOME_LABELS, REPORT_NOTICE, REQUEST_TYPE_LABELS, SEVERITY_LABELS, STATUS_LABELS, TASK_TYPE_LABELS, EXTRACTED_FIELDS, type CaseStatus, type Decision, type ExtractedFields, type RequestType, type Severity, type VerificationOutcome } from '@/lib/constants';
import { maskAccount } from '@/lib/iban';
import type { SupplierSnapshot } from '@/lib/analysis/rules';

export const metadata: Metadata = { title: 'Decision report' };
export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Dubai' }) + ' (GST)';

export default async function ReportPage({ params }: { params: Promise<{ orgId: string; caseId: string }> }) {
  const { orgId, caseId } = await params;
  const { user } = await guardPage(orgId, `/app/${orgId}/cases/${caseId}/report`);
  const d = await getCaseDetail(user, orgId, caseId).catch(() => notFound());
  const c = d.case;
  const a = d.analysis;
  const fields = ((a?.effectiveFields ?? a?.extractedFields) ?? {}) as ExtractedFields;
  const ref = (d.currentVersion?.supplierSnapshot ?? {}) as unknown as SupplierSnapshot;
  const latest = c.reviews[0];
  const decisionVersion = latest ? c.inputVersions.find((v) => v.id === latest.caseInputVersionId) : null;
  const rows = [
    ['Case ID', <Ltr key="n" mono>{c.caseNumber}</Ltr>],
    ['Organization', d.ctx.orgName],
    ['Supplier', c.supplier.name],
    ['Request type', REQUEST_TYPE_LABELS[c.requestType as RequestType]],
    ['Status', STATUS_LABELS[c.status as CaseStatus]],
    ['Evidence version', `${d.currentVersion?.versionNumber ?? 1} (supplier reference v${d.currentVersion?.supplierVersionNumber ?? 1})`],
    ['Prepared by', d.names[c.createdBy]?.name ?? '—'],
    ['Created', fmt(c.createdAt)],
    ...(c.closedAt ? [['Closed', fmt(c.closedAt)] as const] : []),
  ] as const;

  return (
    <article className="mx-auto max-w-[820px]">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/app/${orgId}/cases/${caseId}`} className="text-[14px] font-semibold text-ink-muted hover:text-ink">← Back to case</Link>
        <PrintButton />
      </div>
      <div className="card print-plain p-8 md:p-10">
        <header className="flex items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <Logo size="sm" />
            <h1 className="mt-5 text-[30px] font-bold tracking-[-0.03em]">Decision report</h1>
            <p className="text-[14px] text-ink-muted">Generated {fmt(new Date())}</p>
          </div>
          <span className="rounded-full border border-line-strong px-3 py-1 text-[12px] font-bold">LIVE MODE</span>
        </header>

        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[14px] leading-6 text-amber-900">{REPORT_NOTICE}</p>

        <section className="mt-8">
          <h2 className="text-[18px] font-bold">Case</h2>
          <table className="mt-3 w-full text-[14px]">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} className="border-t border-line"><th className="w-48 py-2 pr-4 text-left font-medium text-ink-muted">{k}</th><td className="py-2">{v}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h2 className="text-[18px] font-bold">A. Request summary</h2>
          <p className="mt-2 text-[14px] leading-6">{a?.summary ?? 'No completed analysis on the current evidence version.'}</p>
          {a && <p className="mt-1 text-[12.5px] text-ink-muted">Analysis by {a.provider === 'local' ? 'local rules analyzer' : `${a.provider} · ${a.model}`} (schema {a.schemaVersion}) on {fmt(a.createdAt)}.</p>}
          {a && (
            <table className="mt-3 w-full text-[14px]">
              <tbody>
                {EXTRACTED_FIELDS.map((k) => (
                  <tr key={k} className="border-t border-line"><th className="w-48 py-1.5 pr-4 text-left font-medium text-ink-muted">{FIELD_LABELS[k]}</th><td className="py-1.5">{fields[k] ? <Ltr mono={k === 'iban'}>{fields[k]}</Ltr> : <em className="text-amber-700">Not found</em>}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {d.corrections.length > 0 && <p className="mt-2 text-[12.5px] text-ink-muted">{d.corrections.length} field correction(s) recorded; original extractions are preserved in the case record.</p>}
        </section>

        <section className="mt-8">
          <h2 className="text-[18px] font-bold">B. Evidence references</h2>
          <ul className="mt-2 space-y-1 text-[14px]">
            {c.sourceDocuments.map((s, i) => (
              <li key={s.id}>S{i + 1} — {s.kind === 'PDF' ? `PDF “${s.fileName}”` : 'Pasted text'}, added {fmt(s.createdAt)} by {d.names[s.uploadedBy]?.name ?? 'member'}{s.sha256 ? <>, SHA-256 <Ltr mono>{s.sha256.slice(0, 16)}…</Ltr></> : null}{s.extractionStatus === 'FAILED' ? ' — unreadable, not analyzed' : ''}</li>
            ))}
          </ul>
          <h3 className="mt-4 text-[15px] font-bold">Findings</h3>
          {d.findings.length === 0 ? <p className="text-[14px] text-ink-muted">None recorded.</p> : (
            <ul className="mt-2 space-y-2 text-[14px]">
              {d.findings.map((f) => (
                <li key={f.id} className="border-t border-line pt-2">
                  <strong>[{SEVERITY_LABELS[f.severity as Severity]}]</strong> {f.source === 'RULE' ? `Rule ${f.ruleId}` : `AI indicator (${f.category.replace(/_/g, ' ')})`}: {f.explanation}
                  {f.evidenceQuote && <span className="block italic text-ink-muted">“{f.evidenceQuote}”</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-[18px] font-bold">C. Differences from the supplier reference</h2>
          <table className="mt-3 w-full text-[14px]">
            <thead><tr className="text-left text-[12.5px] text-ink-muted"><th className="pb-1">Field</th><th className="pb-1">Reference</th><th className="pb-1">Submitted</th></tr></thead>
            <tbody>
              {[
                ['Beneficiary', ref.expectedBeneficiaryName, fields.beneficiaryName],
                ['IBAN', maskAccount(ref.referenceIban), fields.iban],
                ['Account', maskAccount(ref.referenceBankAccount), fields.accountNumber],
                ['Email domain', ref.recordedEmail?.split('@')[1], fields.senderEmail?.split('@')[1]],
                ['Currency', ref.usualCurrency, fields.currency],
              ].map(([k, r, s]) => (
                <tr key={k as string} className="border-t border-line"><td className="py-1.5 pr-3 font-medium">{k}</td><td className="py-1.5 pr-3"><Ltr mono>{r ?? '—'}</Ltr></td><td className="py-1.5"><Ltr mono>{s ?? '—'}</Ltr></td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h2 className="text-[18px] font-bold">D. Independent verification</h2>
          {d.currentTasks.length === 0 ? <p className="mt-2 text-[14px] text-ink-muted">No verification task on this evidence version.</p> : (
            <ul className="mt-2 space-y-3 text-[14px]">
              {d.currentTasks.map((t) => (
                <li key={t.id} className="border-t border-line pt-2">
                  <strong>{TASK_TYPE_LABELS[t.taskType] ?? t.taskType}</strong> — {t.status.toLowerCase()}
                  {t.results.map((r) => (
                    <span key={r.id} className="block text-ink-soft">
                      {OUTCOME_LABELS[r.outcome as VerificationOutcome]} via {r.channelUsed} ({r.channelSource}). {r.notes ? `Notes: ${r.notes}. ` : ''}Verification outcome recorded by {d.names[r.performedBy]?.name ?? 'member'} on {fmt(r.performedAt)}.
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-[18px] font-bold">E. Decision</h2>
          {!latest ? <p className="mt-2 text-[14px] text-ink-muted">No decision recorded.</p> : (
            <div className="mt-2 text-[14px] leading-6">
              <p><strong>{DECISION_LABELS[latest.decision as Decision]}</strong> by {d.names[latest.reviewerId]?.name ?? 'reviewer'} on {fmt(latest.createdAt)}.</p>
              <p>Rationale: {latest.rationale}</p>
              <p className="text-ink-muted">Decision based on evidence version {decisionVersion?.versionNumber ?? '?'}, case revision {latest.caseRevision}.</p>
              {latest.decision === 'APPROVED' && <p className="text-ink-muted">An authorized reviewer recorded approval within this workflow. This does not execute or authorize a bank transfer.</p>}
              {c.reviews.length > 1 && <p className="mt-2 text-ink-muted">{c.reviews.length - 1} earlier decision(s) are preserved in the case history.</p>}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-line pt-5 text-[12.5px] leading-5 text-ink-muted">{REPORT_NOTICE}</footer>
      </div>
    </article>
  );
}

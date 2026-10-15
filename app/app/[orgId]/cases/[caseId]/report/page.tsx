import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guardPage } from '@/lib/page-guard';
import { getCaseDetail } from '@/lib/services/cases';
import { PrintButton } from '@/components/case/print-button';
import { Logo, Ltr } from '@/components/ui';
import { CHANNEL_LABELS, DECISION_LABELS, FIELD_LABELS, OUTCOME_LABELS, REPORT_NOTICE, REQUEST_TYPE_LABELS, SEVERITY_LABELS, STATUS_LABELS, TASK_TYPE_LABELS, EXTRACTED_FIELDS, type CaseStatus, type Channel, type Decision, type ExtractedFields, type RequestType, type Severity, type VerificationOutcome } from '@/lib/constants';
import { formatDate, translateText } from '@/lib/i18n/core';
import { maskAccount } from '@/lib/iban';
import type { SupplierSnapshot } from '@/lib/analysis/rules';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Decision report') };
}
export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ orgId: string; caseId: string }> }) {
  const { orgId, caseId } = await params;
  const { user } = await guardPage(orgId, `/app/${orgId}/cases/${caseId}/report`);
  const { t, locale } = await getT();
  const tx = (s: string | null | undefined) => translateText(locale, s);
  const fmt = (d: Date) => `${formatDate(locale, d, { dateStyle: 'long', timeStyle: 'short' })} (${t('GST')})`;
  const d = await getCaseDetail(user, orgId, caseId).catch(() => notFound());
  const c = d.case;
  const a = d.analysis;
  const fields = ((a?.effectiveFields ?? a?.extractedFields) ?? {}) as ExtractedFields;
  const ref = (d.currentVersion?.supplierSnapshot ?? {}) as unknown as SupplierSnapshot;
  const latest = c.reviews[0];
  const decisionVersion = latest ? c.inputVersions.find((v) => v.id === latest.caseInputVersionId) : null;
  const rows: [string, React.ReactNode][] = [
    [t('Case ID'), <Ltr key="n" mono>{c.caseNumber}</Ltr>],
    [t('Organization'), d.ctx.orgName],
    [t('Supplier'), c.supplier.name],
    [t('Request type'), t(REQUEST_TYPE_LABELS[c.requestType as RequestType])],
    [t('Status'), t(STATUS_LABELS[c.status as CaseStatus])],
    [t('Evidence version'), t('{v} (supplier reference v{s})', { v: d.currentVersion?.versionNumber ?? 1, s: d.currentVersion?.supplierVersionNumber ?? 1 })],
    [t('Prepared by'), d.names[c.createdBy]?.name ?? '—'],
    [t('Created'), fmt(c.createdAt)],
    ...(c.closedAt ? [[t('Closed'), fmt(c.closedAt)] as [string, React.ReactNode]] : []),
  ];

  return (
    <article className="mx-auto max-w-[820px]">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/app/${orgId}/cases/${caseId}`} className="t-eyebrow hover:!text-ink"><span className="inline-block rtl:-scale-x-100">←</span> {t('Back to case')}</Link>
        <PrintButton />
      </div>
      <div className="card print-plain p-8 md:p-10">
        <header className="flex items-start justify-between gap-4 border-b border-ink pb-6">
          <div>
            <Logo size="sm" />
            <h1 className="t-headline mt-5 text-[30px]">{t('Decision report')}</h1>
            <p className="text-[14px] text-ink-muted">{t('Generated {date}', { date: fmt(new Date()) })}</p>
          </div>
          <span className="rounded-sm border border-line-strong px-3 py-1 font-mono text-[11.5px] font-semibold uppercase tracking-[0.08em]">{t('Live mode')}</span>
        </header>

        <p className="mt-6 border-s-[3px] border-signal-amber bg-amber-50 p-4 text-[14px] leading-6 text-amber-950">{t(REPORT_NOTICE)}</p>

        <section className="mt-8">
          <h2 className="t-eyebrow !text-ink">{t('Case')}</h2>
          <table className="mt-3 w-full text-[14px]">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} className="border-t border-line"><th className="w-48 py-2 pe-4 text-start font-medium text-ink-muted">{k}</th><td className="py-2">{v}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h2 className="t-eyebrow !text-ink">{t('A. Request summary')}</h2>
          <p className="mt-2 text-[14px] leading-6" dir="auto">{a?.summary ? tx(a.summary) : t('No completed analysis on the current evidence version.')}</p>
          {a && <p className="mt-1 text-[12.5px] text-ink-muted">{t('Analysis by {by} (schema {schema}) on {date}.', { by: a.provider === 'local' ? t('local rules analyzer') : `${a.provider} · ${a.model}`, schema: a.schemaVersion, date: fmt(a.createdAt) })}</p>}
          {a && (
            <table className="mt-3 w-full text-[14px]">
              <tbody>
                {EXTRACTED_FIELDS.map((k) => (
                  <tr key={k} className="border-t border-line"><th className="w-48 py-1.5 pe-4 text-start font-medium text-ink-muted">{t(FIELD_LABELS[k])}</th><td className="py-1.5">{fields[k] ? <Ltr mono={k === 'iban'}>{fields[k]}</Ltr> : <em className="text-amber-700">{t('Not found')}</em>}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {d.corrections.length > 0 && <p className="mt-2 text-[12.5px] text-ink-muted">{t('Field corrections recorded: {n}. Original extractions are preserved in the case record.', { n: d.corrections.length })}</p>}
        </section>

        <section className="mt-8">
          <h2 className="t-eyebrow !text-ink">{t('B. Evidence references')}</h2>
          <ul className="mt-2 space-y-1 text-[14px]">
            {c.sourceDocuments.map((s, i) => (
              <li key={s.id}>
                S{i + 1} — {s.kind === 'PDF' ? <>PDF “<Ltr>{s.fileName}</Ltr>”</> : t('Pasted text')}, {t('added {date} by {name}', { date: fmt(s.createdAt), name: d.names[s.uploadedBy]?.name ?? t('member') })}
                {s.sha256 ? <>, SHA-256 <Ltr mono>{s.sha256.slice(0, 16)}…</Ltr></> : null}
                {s.extractionStatus === 'FAILED' ? ` — ${t('unreadable, not analyzed')}` : ''}
              </li>
            ))}
          </ul>
          <h3 className="mt-4 text-[15px] font-semibold">{t('Findings')}</h3>
          {d.findings.length === 0 ? <p className="text-[14px] text-ink-muted">{t('None recorded.')}</p> : (
            <ul className="mt-2 space-y-2 text-[14px]">
              {d.findings.map((f) => (
                <li key={f.id} className="border-t border-line pt-2">
                  <strong>[{t(SEVERITY_LABELS[f.severity as Severity])}]</strong> {f.source === 'RULE' ? <>{t('Rule')} <Ltr mono>{f.ruleId}</Ltr></> : `${t('AI indicator')} (${t(f.category.replace(/_/g, ' '))})`}: <span dir="auto">{tx(f.explanation)}</span>
                  {f.evidenceQuote && <span className="block italic text-ink-muted" dir="auto">“{f.evidenceQuote}”</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="t-eyebrow !text-ink">{t('C. Differences from the supplier reference')}</h2>
          <table className="mt-3 w-full text-[14px]">
            <thead><tr className="text-start text-[12.5px] text-ink-muted"><th className="pb-1 text-start">{t('Field')}</th><th className="pb-1 text-start">{t('Reference')}</th><th className="pb-1 text-start">{t('Submitted')}</th></tr></thead>
            <tbody>
              {[
                [t('Beneficiary'), ref.expectedBeneficiaryName, fields.beneficiaryName],
                [t('IBAN'), maskAccount(ref.referenceIban), fields.iban],
                [t('Account'), maskAccount(ref.referenceBankAccount), fields.accountNumber],
                [t('Email domain'), ref.recordedEmail?.split('@')[1], fields.senderEmail?.split('@')[1]],
                [t('Currency'), ref.usualCurrency, fields.currency],
              ].map(([k, r, s]) => (
                <tr key={k as string} className="border-t border-line"><td className="py-1.5 pe-3 font-medium">{k}</td><td className="py-1.5 pe-3"><Ltr mono>{r ?? '—'}</Ltr></td><td className="py-1.5"><Ltr mono>{s ?? '—'}</Ltr></td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h2 className="t-eyebrow !text-ink">{t('D. Independent verification')}</h2>
          {d.currentTasks.length === 0 ? <p className="mt-2 text-[14px] text-ink-muted">{t('No verification task on this evidence version.')}</p> : (
            <ul className="mt-2 space-y-3 text-[14px]">
              {d.currentTasks.map((task) => (
                <li key={task.id} className="border-t border-line pt-2">
                  <strong>{TASK_TYPE_LABELS[task.taskType] ? t(TASK_TYPE_LABELS[task.taskType]) : task.taskType}</strong> — {t(task.status === 'COMPLETED' ? 'completed' : task.status === 'OPEN' ? 'open' : task.status.toLowerCase())}
                  {task.results.map((r) => (
                    <span key={r.id} className="block text-ink-soft">
                      {t('{outcome} via {channel} ({source}).', { outcome: t(OUTCOME_LABELS[r.outcome as VerificationOutcome]), channel: CHANNEL_LABELS[r.channelUsed as Channel] ? t(CHANNEL_LABELS[r.channelUsed as Channel]) : r.channelUsed, source: tx(r.channelSource) })}{' '}
                      {r.notes ? <>{t('Notes:')} <span dir="auto">{r.notes}</span>. </> : ''}
                      {t('Verification outcome recorded by {name} on {date}.', { name: d.names[r.performedBy]?.name ?? t('member'), date: fmt(r.performedAt) })}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="t-eyebrow !text-ink">{t('E. Decision')}</h2>
          {!latest ? <p className="mt-2 text-[14px] text-ink-muted">{t('No decision recorded.')}</p> : (
            <div className="mt-2 text-[14px] leading-6">
              <p><strong>{t(DECISION_LABELS[latest.decision as Decision])}</strong> — {t('by {name} on {date}.', { name: d.names[latest.reviewerId]?.name ?? t('reviewer'), date: fmt(latest.createdAt) })}</p>
              <p>{t('Rationale:')} <span dir="auto">{latest.rationale}</span></p>
              <p className="text-ink-muted">{t('Decision based on evidence version {v}, case revision {r}.', { v: decisionVersion?.versionNumber ?? '?', r: latest.caseRevision })}</p>
              {latest.decision === 'APPROVED' && <p className="text-ink-muted">{t('An authorized reviewer recorded approval within this workflow. This does not execute or authorize a bank transfer.')}</p>}
              {c.reviews.length > 1 && <p className="mt-2 text-ink-muted">{t('Earlier decisions preserved in the case history: {n}.', { n: c.reviews.length - 1 })}</p>}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-line pt-5 text-[12.5px] leading-5 text-ink-muted">{t(REPORT_NOTICE)}</footer>
      </div>
    </article>
  );
}

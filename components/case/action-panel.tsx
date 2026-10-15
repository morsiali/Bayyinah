'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Bot, Check, CircleDashed, Lock, OctagonX, RefreshCcw } from 'lucide-react';
import { Button, LinkButton, Notice, cx } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { useI18n } from '@/components/i18n';
import { STATUS_LABELS, isClosed, type CaseStatus } from '@/lib/constants';
import { msg, type T } from '@/lib/i18n/core';
import type { CaseData, Me, ProviderInfo } from './types';

const TOOL_LABEL: Record<string, string> = {
  get_case_context: msg('Read case context'),
  get_supplier_snapshot: msg('Read supplier snapshot'),
  get_extracted_evidence: msg('Read extracted evidence'),
  compare_payment_details: msg('Compare payment details'),
  get_missing_requirements: msg('Check missing requirements'),
  create_internal_verification_task: msg('Create verification task'),
  prepare_review_summary: msg('Prepare review summary'),
};

const RUN_STATUS: Record<string, string> = { COMPLETED: msg('completed'), STOPPED: msg('stopped'), FAILED: msg('failed'), RUNNING: msg('running') };
const STOP_REASON: Record<string, string> = {
  TOOL_CALL_LIMIT: msg('tool call limit'),
  TIME_LIMIT: msg('time limit'),
  TOOL_REJECTED: msg('tool rejected'),
  STALE_VERSION: msg('stale version'),
  ANALYSIS_REQUIRED: msg('analysis required'),
  ANALYSIS_STALE: msg('analysis stale'),
};
const REQ_KEY: Record<string, string> = {
  SOURCE: msg('Readable source evidence'),
  ANALYSIS: msg('Current analysis'),
  AGENT: msg('Preparation agent run'),
  VERIFICATION_RECORDED: msg('Independent verification recorded'),
  VERIFICATION_CONFIRMED: msg('Supplier confirmed through a reference channel'),
  REQUIRED_FIELDS: msg('Required details present'),
};

/** Renders a server-written multi-line text (one statement per line) in the reader's language. */
export function Lines({ text, className }: { text: string; className?: string }) {
  const { tx } = useI18n();
  return (
    <div className={className}>
      {text.split('\n').map((l, i) => (
        <p key={i}>{tx(l)}</p>
      ))}
    </div>
  );
}

export function ActionPanel({ data, orgId, me, reviewBlockers, provider }: { data: CaseData; orgId: string; me: Me; reviewBlockers: string[]; provider: ProviderInfo }) {
  const { t, tx } = useI18n();
  const c = data.case;
  const isPreparer = me.roles.includes('PREPARER');
  const isReviewer = me.roles.includes('REVIEWER');
  const req = Object.fromEntries(data.requirements.map((r) => [r.key, r]));
  const showDecision = c.status === 'READY_FOR_REVIEW' && isReviewer;

  return (
    <aside aria-label={t('Next action')} className="space-y-4">
      {showDecision ? (
        <DecisionCard data={data} orgId={orgId} blockers={reviewBlockers} />
      ) : (
        <NextAction data={data} orgId={orgId} me={me} provider={provider} req={req} isPreparer={isPreparer} />
      )}

      <div className="card p-5">
        <h2 className="t-eyebrow !text-ink">{t('Readiness')}</h2>
        <ul className="mt-3 space-y-2.5">
          {data.requirements.map((r) => (
            <li key={r.key} className="flex gap-2.5 text-[13.5px]">
              {r.met ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--done)]" aria-label={t('completed')} /> : <CircleDashed className={cx('mt-0.5 h-4 w-4 shrink-0', r.blocks === 'submit' ? 'text-amber-600' : 'text-ink-faint')} aria-label={t('not completed')} />}
              <span>
                <span className={cx('block font-semibold', !r.met && 'text-ink-soft')}>{tx(r.label)}</span>
                <span className="block text-[12.5px] leading-5 text-ink-muted">{tx(r.detail)}{!r.met && r.blocks === 'approve' ? ` ${t('(needed for approval)')}` : ''}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {data.agentRun && <AgentTrace run={data.agentRun} names={data.names} />}

      <CaseInfo data={data} orgId={orgId} me={me} />
    </aside>
  );
}

function NextAction({ data, orgId, me, provider, req, isPreparer }: { data: CaseData; orgId: string; me: Me; provider: ProviderInfo; req: Record<string, CaseData['requirements'][number]>; isPreparer: boolean }) {
  const { t, tx } = useI18n();
  const c = data.case;
  const { run, pending } = useAction();
  const [note, setNote] = useState('');
  const base = `/api/orgs/${orgId}/cases/${c.id}`;
  const openTask = data.currentTasks.find((x) => x.status === 'OPEN');

  let body: React.ReactNode;
  if (isClosed(c.status)) {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">{t('This case is closed. Its decision and evidence are preserved. Material changes require reopening into a new evidence version.')}</p>
        <LinkButton href={`/app/${orgId}/cases/${c.id}/report`} className="mt-4 w-full">{t('Open printable report')}</LinkButton>
      </>
    );
  } else if (c.status === 'READY_FOR_REVIEW') {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">{t('Waiting for a reviewer who did not create this case. Evidence is locked while the case is in review.')}</p>
        {isPreparer && (
          <Button variant="secondary" className="mt-4 w-full" loading={pending === 'w'} onClick={() => run('w', `${base}/withdraw`, { body: { expectedRevision: c.revision }, success: msg('Withdrawn from review') })}>
            {t('Withdraw to make changes')}
          </Button>
        )}
      </>
    );
  } else if (!isPreparer) {
    body = <p className="text-[14px] text-ink-soft">{t('This case is being prepared. You can follow it here; preparation actions need the Preparer role.')}</p>;
  } else if (data.supplierUpdateAvailable) {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">{t('The supplier reference changed after this case was created. Apply it to start a new evidence version — earlier analysis, verification and decisions stay in the history.')}</p>
        <Button className="mt-4 w-full" loading={pending === 'ref'} onClick={() => run('ref', `${base}/apply-reference`, { body: { expectedRevision: c.revision }, success: msg('New evidence version created with the updated reference') })}>
          <RefreshCcw className="h-4 w-4" aria-hidden /> {t('Apply updated reference')}
        </Button>
      </>
    );
  } else if (!req.SOURCE?.met) {
    body = <p className="text-[14px] text-ink-soft">{t('Add the request as pasted text or a text-based PDF in the Source evidence panel.')}</p>;
  } else if (!req.ANALYSIS?.met) {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">{tx(req.ANALYSIS?.detail)}</p>
        <Notice tone={provider.external ? 'review' : 'info'} className="mt-3 text-[13px]">
          {provider.external ? (
            <>
              {t('Analysis sends the source text and a minimal supplier context to {provider} for processing.', { provider: provider.label })} <span className="text-ink-muted">({t('model')} <code className="font-mono" dir="ltr">{provider.model}</code>)</span>
            </>
          ) : (
            <>{t('Analysis runs on this server with the local rules analyzer. Nothing leaves the server. Configure an AI provider for model-based reading.')}</>
          )}
        </Notice>
        <Button className="mt-4 w-full" loading={pending === 'a'} onClick={() => run('a', `${base}/analyze`, { success: msg('Analysis completed') })}>
          {t('Run analysis')}
        </Button>
      </>
    );
  } else if (!req.AGENT?.met) {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">{t('The preparation agent checks requirements, compares details and creates any verification task the case needs. It stops when a person must act.')}</p>
        <Button className="mt-4 w-full" loading={pending === 'g'} onClick={() => run('g', `${base}/agent`, { success: msg('Preparation agent finished') })}>
          <Bot className="h-4 w-4" aria-hidden /> {t('Run preparation agent')}
        </Button>
      </>
    );
  } else if (openTask && openTask.taskType === 'ESTABLISH_INDEPENDENT_CHANNEL') {
    body = (
      <Notice tone="review" title={t('No established contact channel')}>
        {tx(openTask.description)}
        {me.roles.includes('ORG_ADMIN') && (
          <Link href={`/app/${orgId}/admin/suppliers/${c.supplier.id}`} className="link mt-2 block">{t('Edit the supplier reference')}</Link>
        )}
      </Notice>
    );
  } else if (openTask) {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">{tx(openTask.requirement)}</p>
        <p className="mt-2 text-[13px]">{t('Use:')} <strong>{tx(openTask.suggestedChannel)}</strong></p>
        <LinkButton href={`/app/${orgId}/cases/${c.id}/verify/${openTask.id}`} className="mt-4 w-full" arrow>
          {t('Record verification outcome')}
        </LinkButton>
      </>
    );
  } else {
    const blocked = data.requirements.filter((r) => !r.met && r.blocks === 'submit');
    const approveGaps = data.requirements.filter((r) => !r.met && r.blocks === 'approve');
    body = (
      <>
        <p className="text-[14px] text-ink-soft">{blocked.length ? t('Resolve the items in Readiness before submitting.') : t('Review requirements have been completed. Submit the case to a reviewer.')}</p>
        {approveGaps.length > 0 && !blocked.length && (
          <Notice tone="review" className="mt-3 text-[13px]">
            {t('A reviewer will not be able to approve until: {items}. They can still reject or return it.', { items: approveGaps.map((g) => tx(g.label)).join(t('; ')) })}
          </Notice>
        )}
        <label htmlFor="sub-note" className="mt-3 block text-[13px] font-semibold">{t('Note for the reviewer — optional')}</label>
        <textarea id="sub-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="field-input mt-1 text-[14px]" />
        <Button className="mt-3 w-full" disabled={blocked.length > 0} loading={pending === 's'} arrow onClick={() => run('s', `${base}/submit`, { body: { expectedRevision: c.revision, note: note || null }, success: msg('Submitted for review') })}>
          {t('Submit for review')}
        </Button>
      </>
    );
  }

  return (
    <div className="card border-t-[3px] border-t-brand-600 p-5 shadow-lift">
      <p className="t-eyebrow !text-brand-700">{t('Next action')}</p>
      <div className="mt-2">{body}</div>
    </div>
  );
}

function DecisionCard({ data, orgId, blockers }: { data: CaseData; orgId: string; blockers: string[] }) {
  const { t, tx } = useI18n();
  const c = data.case;
  const { run, pending } = useAction();
  const [rationale, setRationale] = useState('');
  const [confirm, setConfirm] = useState<null | 'APPROVED' | 'REJECTED' | 'CLOSED_INCONCLUSIVE' | 'RETURNED'>(null);
  const approveGaps = data.requirements.filter((r) => !r.met);
  const decide = (decision: string) =>
    run('d', `/api/orgs/${orgId}/cases/${c.id}/decision`, { body: { decision, rationale, expectedRevision: c.revision, caseInputVersionId: c.currentInputVersionId }, success: msg('Decision recorded') }).then(() => setConfirm(null));

  if (blockers.length) {
    return (
      <div className="card p-5">
        <p className="t-eyebrow !text-brand-700">{t('Review')}</p>
        <Notice tone="review" className="mt-2" title={t('You can’t decide this case')}>
          {blockers.map(tx).join(' ')}
        </Notice>
      </div>
    );
  }
  const labels = { APPROVED: t('Approve within workflow'), REJECTED: t('Reject'), CLOSED_INCONCLUSIVE: t('Close as inconclusive'), RETURNED: t('Return for information') } as const;
  return (
    <div className="card border-t-[3px] border-t-brand-600 p-5 shadow-lift">
      <p className="t-eyebrow !text-brand-700">{t('Your decision')}</p>
      <p className="mt-1 text-[13px] text-ink-muted">{t('Reviewing evidence version {v}, revision {r}. If the case changes before you submit, you will be asked to reload.', { v: data.currentVersion?.versionNumber, r: c.revision })}</p>
      <label htmlFor="rationale" className="mt-4 block text-[13px] font-semibold">{t('Rationale')}</label>
      <textarea id="rationale" rows={4} value={rationale} onChange={(e) => setRationale(e.target.value)} maxLength={3000} className="field-input mt-1 text-[14px]" placeholder={t('What did you rely on? At least 20 characters (10 to return).')} />
      {approveGaps.length > 0 && (
        <Notice tone="review" className="mt-3 text-[13px]" title={t('Approval is blocked')}>
          {approveGaps.map((g) => `${tx(g.label)}: ${tx(g.detail)}`).join(' ')}
        </Notice>
      )}
      {confirm ? (
        <div className="mt-4 border border-line-strong bg-mist p-3">
          <p className="text-[14px] font-semibold">{labels[confirm]}{t('?')}</p>
          <p className="text-[13px] text-ink-muted">{confirm === 'RETURNED' ? t('The case goes back to the preparer with your note. Evidence is kept.') : t('This closes the case. Reopening later creates a new version and keeps this decision in the history.')}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" loading={pending === 'd'} variant={confirm === 'REJECTED' ? 'danger' : 'primary'} onClick={() => decide(confirm)}>{t('Confirm')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>{t('Cancel')}</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          <Button disabled={approveGaps.length > 0 || rationale.trim().length < 20} onClick={() => setConfirm('APPROVED')}>{labels.APPROVED}</Button>
          <Button variant="danger" disabled={rationale.trim().length < 20} onClick={() => setConfirm('REJECTED')}>
            <OctagonX className="h-4 w-4" aria-hidden /> {labels.REJECTED}
          </Button>
          <Button variant="secondary" disabled={rationale.trim().length < 10} onClick={() => setConfirm('RETURNED')}>{labels.RETURNED}</Button>
          <Button variant="ghost" disabled={rationale.trim().length < 20} onClick={() => setConfirm('CLOSED_INCONCLUSIVE')}>{labels.CLOSED_INCONCLUSIVE}</Button>
        </div>
      )}
      <p className="t-caption mt-3 text-ink-muted">{t('Approval records a decision within this workflow. It does not execute or authorize a bank transfer.')}</p>
    </div>
  );
}

function AgentTrace({ run, names }: { run: NonNullable<CaseData['agentRun']>; names: CaseData['names'] }) {
  const { t, tx } = useI18n();
  return (
    <div className="border border-white/10 bg-navy-900 p-5 text-white">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Bot className="h-4 w-4" aria-hidden /> {t('Preparation agent')}</h2>
        <span className={cx('rounded-sm px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em]', run.status === 'COMPLETED' ? 'bg-signal-green/15 text-signal-green' : run.status === 'FAILED' ? 'bg-signal-red/20 text-red-300' : 'bg-signal-amber/20 text-amber-300')}>{t(RUN_STATUS[run.status] ?? run.status)}</span>
      </div>
      <p className="t-caption mt-1 text-white/50">{t('Started by {name} · tool calls: {n}', { name: names[run.initiatedBy]?.name ?? t('member'), n: run.toolCallCount })}</p>
      <ol className="mt-3 space-y-1.5">
        {run.toolExecutions.map((x) => (
          <li key={x.id} className="flex items-start gap-2 text-[13px]">
            {x.status === 'SUCCESS' ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-green" aria-label={t('succeeded')} /> : <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-red" aria-label={x.status.toLowerCase()} />}
            <span>
              <span className="font-semibold">{t(TOOL_LABEL[x.toolName] ?? x.toolName)}</span>
              <span className="block text-[12px] text-white/55">{describe(x.toolName, x.output as any, x.status, t, tx)}</span>
            </span>
          </li>
        ))}
      </ol>
      {run.stopReason && <p className="mt-3 text-[13px] text-amber-300">{t('Stopped:')} {STOP_REASON[run.stopReason] ? t(STOP_REASON[run.stopReason]) : tx(run.stopReason)}</p>}
      {run.waitingFor && <p className="mt-2 border-s-[3px] border-signal-amber bg-white/5 p-2.5 text-[13px]"><span className="font-semibold">{t('Waiting for:')} </span>{tx(run.waitingFor)}</p>}
      {run.summary && <Lines text={run.summary} className="mt-2 space-y-1 text-[13px] leading-5 text-white/70" />}
    </div>
  );
}

function describe(tool: string, out: any, status: string, t: T, tx: (s: string) => string) {
  if (status !== 'SUCCESS') return out?.error ? tx(out.error) : status.toLowerCase();
  switch (tool) {
    case 'get_case_context':
      return t('Version {v}, status {s}', { v: out?.inputVersion, s: STATUS_LABELS[out?.status as CaseStatus] ? t(STATUS_LABELS[out?.status as CaseStatus]) : String(out?.status ?? '') });
    case 'get_supplier_snapshot':
      return t('Reference v{v}; phone: {p}, email: {e}', { v: out?.supplierVersion, p: out?.hasReferencePhone ? t('on file') : t('none'), e: out?.hasReferenceEmail ? t('on file') : t('none') });
    case 'get_extracted_evidence':
      return t('Fields present: {f} · language indicators: {i}', { f: out?.fieldsPresent?.length ?? 0, i: out?.aiIndicators?.length ?? 0 });
    case 'compare_payment_details':
      return t('Rule results: {n}', { n: out?.results?.length ?? 0 });
    case 'get_missing_requirements':
      return out?.unmet?.length ? t('Unmet ({n}): {items}', { n: out.unmet.length, items: out.unmet.map((u: any) => (REQ_KEY[u.key] ? t(REQ_KEY[u.key]) : u.key)).join(t(', ')) }) : t('No unmet requirements');
    case 'create_internal_verification_task':
      return out?.created ? t('Created a new internal task') : out?.reason ? tx(out.reason) : t('Task already existed');
    case 'prepare_review_summary':
      return t('Summary prepared');
    default:
      return t('Done');
  }
}

function CaseInfo({ data, orgId, me }: { data: CaseData; orgId: string; me: Me }) {
  const { t, tx } = useI18n();
  const c = data.case;
  const { run, pending } = useAction();
  const [reopen, setReopen] = useState(false);
  const [reason, setReason] = useState('');
  const canReopen = isClosed(c.status) && (me.roles.includes('PREPARER') || me.roles.includes('ORG_ADMIN'));
  return (
    <div className="card p-5 text-[13.5px]">
      <h2 className="t-eyebrow !text-ink">{t('Case record')}</h2>
      <dl className="mt-3 space-y-2">
        <div className="flex justify-between gap-3"><dt className="text-ink-muted">{t('Created by')}</dt><dd className="font-semibold">{data.names[c.createdBy]?.name ?? '—'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-muted">{t('Evidence version')}</dt><dd className="font-semibold">{t('{a} of {b}', { a: data.currentVersion?.versionNumber, b: c.inputVersions.length })}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-muted">{t('Revision')}</dt><dd className="font-semibold">{c.revision}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-muted">{t('Supplier reference')}</dt><dd className="font-semibold" dir="ltr">v{data.currentVersion?.supplierVersionNumber}</dd></div>
        {c.expectedAmount && <div className="flex justify-between gap-3"><dt className="text-ink-muted">{t('Expected amount')}</dt><dd className="font-semibold" dir="ltr">{c.expectedCurrency} {c.expectedAmount}</dd></div>}
        {c.note && <div><dt className="text-ink-muted">{t('Note')}</dt><dd dir="auto">{c.note}</dd></div>}
      </dl>
      {c.inputVersions.length > 1 && (
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold text-ink-soft">{t('Version history')}</summary>
          <ul className="mt-2 space-y-1.5">
            {c.inputVersions.map((v) => (
              <li key={v.id} className="text-[12.5px] text-ink-muted"><span dir="ltr">v{v.versionNumber}</span> · {tx(v.reason)}</li>
            ))}
          </ul>
        </details>
      )}
      {canReopen && !reopen && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => setReopen(true)}>{t('Reopen as new version')}</Button>
      )}
      {canReopen && reopen && (
        <form
          className="mt-4 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run('ro', `/api/orgs/${orgId}/cases/${c.id}/reopen`, { body: { reason, expectedRevision: c.revision }, success: msg('Case reopened into a new version') });
            if (r) setReopen(false);
          }}
        >
          <label htmlFor="reopen-reason" className="block font-semibold">{t('Why reopen?')}</label>
          <textarea id="reopen-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="field-input text-[14px]" placeholder={t('At least 10 characters')} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={pending === 'ro'} disabled={reason.trim().length < 10}>{t('Reopen')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setReopen(false)}>{t('Cancel')}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

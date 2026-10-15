'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Bot, Check, CircleDashed, Lock, OctagonX, RefreshCcw } from 'lucide-react';
import { Button, LinkButton, Notice, cx } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { isClosed, isEditable } from '@/lib/constants';
import type { CaseData, Me, ProviderInfo } from './types';

const TOOL_LABEL: Record<string, string> = {
  get_case_context: 'Read case context',
  get_supplier_snapshot: 'Read supplier snapshot',
  get_extracted_evidence: 'Read extracted evidence',
  compare_payment_details: 'Compare payment details',
  get_missing_requirements: 'Check missing requirements',
  create_internal_verification_task: 'Create verification task',
  prepare_review_summary: 'Prepare review summary',
};

export function ActionPanel({ data, orgId, me, reviewBlockers, provider }: { data: CaseData; orgId: string; me: Me; reviewBlockers: string[]; provider: ProviderInfo }) {
  const c = data.case;
  const isPreparer = me.roles.includes('PREPARER');
  const isReviewer = me.roles.includes('REVIEWER');
  const req = Object.fromEntries(data.requirements.map((r) => [r.key, r]));
  const showDecision = c.status === 'READY_FOR_REVIEW' && isReviewer;

  return (
    <aside aria-label="Next action" className="space-y-4">
      {showDecision ? (
        <DecisionCard data={data} orgId={orgId} blockers={reviewBlockers} />
      ) : (
        <NextAction data={data} orgId={orgId} me={me} provider={provider} req={req} isPreparer={isPreparer} />
      )}

      <div className="card p-5">
        <h2 className="text-[15px] font-bold">Readiness</h2>
        <ul className="mt-3 space-y-2.5">
          {data.requirements.map((r) => (
            <li key={r.key} className="flex gap-2.5 text-[13.5px]">
              {r.met ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="completed" /> : <CircleDashed className={cx('mt-0.5 h-4 w-4 shrink-0', r.blocks === 'submit' ? 'text-amber-600' : 'text-ink-faint')} aria-label="not completed" />}
              <span>
                <span className={cx('block font-semibold', !r.met && 'text-ink-soft')}>{r.label}</span>
                <span className="block text-[12.5px] leading-5 text-ink-muted">{r.detail}{!r.met && r.blocks === 'approve' ? ' (needed for approval)' : ''}</span>
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
  const c = data.case;
  const { run, pending } = useAction();
  const [note, setNote] = useState('');
  const base = `/api/orgs/${orgId}/cases/${c.id}`;
  const openTask = data.currentTasks.find((t) => t.status === 'OPEN');

  let body: React.ReactNode;
  if (isClosed(c.status)) {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">This case is closed. Its decision and evidence are preserved. Material changes require reopening into a new evidence version.</p>
        <LinkButton href={`/app/${orgId}/cases/${c.id}/report`} className="mt-4 w-full">Open printable report</LinkButton>
      </>
    );
  } else if (c.status === 'READY_FOR_REVIEW') {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">Waiting for a reviewer who did not create this case. Evidence is locked while the case is in review.</p>
        {isPreparer && (
          <Button variant="secondary" className="mt-4 w-full" loading={pending === 'w'} onClick={() => run('w', `${base}/withdraw`, { body: { expectedRevision: c.revision }, success: 'Withdrawn from review' })}>
            Withdraw to make changes
          </Button>
        )}
      </>
    );
  } else if (!isPreparer) {
    body = <p className="text-[14px] text-ink-soft">This case is being prepared. You can follow it here; preparation actions need the Preparer role.</p>;
  } else if (data.supplierUpdateAvailable) {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">The supplier reference changed after this case was created. Apply it to start a new evidence version — earlier analysis, verification and decisions stay in the history.</p>
        <Button className="mt-4 w-full" loading={pending === 'ref'} onClick={() => run('ref', `${base}/apply-reference`, { body: { expectedRevision: c.revision }, success: 'New evidence version created with the updated reference' })}>
          <RefreshCcw className="h-4 w-4" aria-hidden /> Apply updated reference
        </Button>
      </>
    );
  } else if (!req.SOURCE?.met) {
    body = <p className="text-[14px] text-ink-soft">Add the request as pasted text or a text-based PDF in the <strong>Source evidence</strong> panel.</p>;
  } else if (!req.ANALYSIS?.met) {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">{req.ANALYSIS?.detail}</p>
        <Notice tone={provider.external ? 'review' : 'info'} className="mt-3 text-[13px]">
          {provider.external ? (
            <>Analysis sends the source text and a minimal supplier context to <strong>{provider.label}</strong> (model <code className="font-mono">{provider.model}</code>) for processing.</>
          ) : (
            <>Analysis runs on this server with the local rules analyzer. Nothing leaves the server. Configure an AI provider for model-based reading.</>
          )}
        </Notice>
        <Button className="mt-4 w-full" loading={pending === 'a'} onClick={() => run('a', `${base}/analyze`, { success: 'Analysis completed' })}>
          Run analysis
        </Button>
      </>
    );
  } else if (!req.AGENT?.met) {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">The preparation agent checks requirements, compares details and creates any verification task the case needs. It stops when a person must act.</p>
        <Button className="mt-4 w-full" loading={pending === 'g'} onClick={() => run('g', `${base}/agent`, { success: 'Preparation agent finished' })}>
          <Bot className="h-4 w-4" aria-hidden /> Run preparation agent
        </Button>
      </>
    );
  } else if (openTask && openTask.taskType === 'ESTABLISH_INDEPENDENT_CHANNEL') {
    body = (
      <Notice tone="review" title="No established contact channel">
        {openTask.description}
        {me.roles.includes('ORG_ADMIN') && (
          <Link href={`/app/${orgId}/admin/suppliers/${c.supplier.id}`} className="link mt-2 block">Edit the supplier reference</Link>
        )}
      </Notice>
    );
  } else if (openTask) {
    body = (
      <>
        <p className="text-[14px] text-ink-soft">{openTask.requirement}</p>
        <p className="mt-2 text-[13px]">Use: <strong>{openTask.suggestedChannel}</strong></p>
        <LinkButton href={`/app/${orgId}/cases/${c.id}/verify/${openTask.id}`} className="mt-4 w-full" arrow>
          Record verification outcome
        </LinkButton>
      </>
    );
  } else {
    const blocked = data.requirements.filter((r) => !r.met && r.blocks === 'submit');
    const approveGaps = data.requirements.filter((r) => !r.met && r.blocks === 'approve');
    body = (
      <>
        <p className="text-[14px] text-ink-soft">{blocked.length ? 'Resolve the items in Readiness before submitting.' : 'Review requirements have been completed. Submit the case to a reviewer.'}</p>
        {approveGaps.length > 0 && !blocked.length && <Notice tone="review" className="mt-3 text-[13px]">A reviewer will not be able to approve until: {approveGaps.map((g) => g.label.toLowerCase()).join('; ')}. They can still reject or return it.</Notice>}
        <label htmlFor="sub-note" className="mt-3 block text-[13px] font-semibold">Note for the reviewer — optional</label>
        <textarea id="sub-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="field-input mt-1 text-[14px]" />
        <Button className="mt-3 w-full" disabled={blocked.length > 0} loading={pending === 's'} arrow onClick={() => run('s', `${base}/submit`, { body: { expectedRevision: c.revision, note: note || null }, success: 'Submitted for review' })}>
          Submit for review
        </Button>
      </>
    );
  }

  return (
    <div className="card border-navy/15 p-5 shadow-lift">
      <p className="t-caption text-brand-700">Next action</p>
      <div className="mt-2">{body}</div>
    </div>
  );
}

function DecisionCard({ data, orgId, blockers }: { data: CaseData; orgId: string; blockers: string[] }) {
  const c = data.case;
  const { run, pending } = useAction();
  const [rationale, setRationale] = useState('');
  const [confirm, setConfirm] = useState<null | 'APPROVED' | 'REJECTED' | 'CLOSED_INCONCLUSIVE' | 'RETURNED'>(null);
  const approveGaps = data.requirements.filter((r) => !r.met);
  const decide = (decision: string) =>
    run('d', `/api/orgs/${orgId}/cases/${c.id}/decision`, { body: { decision, rationale, expectedRevision: c.revision, caseInputVersionId: c.currentInputVersionId }, success: 'Decision recorded' }).then(() => setConfirm(null));

  if (blockers.length) {
    return (
      <div className="card p-5">
        <p className="t-caption text-brand-700">Review</p>
        <Notice tone="review" className="mt-2" title="You can’t decide this case">
          {blockers.join(' ')}
        </Notice>
      </div>
    );
  }
  const labels = { APPROVED: 'Approve within workflow', REJECTED: 'Reject', CLOSED_INCONCLUSIVE: 'Close as inconclusive', RETURNED: 'Return for information' } as const;
  return (
    <div className="card border-navy/15 p-5 shadow-lift">
      <p className="t-caption text-brand-700">Your decision</p>
      <p className="mt-1 text-[13px] text-ink-muted">Reviewing evidence version {data.currentVersion?.versionNumber}, revision {c.revision}. If the case changes before you submit, you will be asked to reload.</p>
      <label htmlFor="rationale" className="mt-4 block text-[13px] font-semibold">Rationale</label>
      <textarea id="rationale" rows={4} value={rationale} onChange={(e) => setRationale(e.target.value)} maxLength={3000} className="field-input mt-1 text-[14px]" placeholder="What did you rely on? At least 20 characters (10 to return)." />
      {approveGaps.length > 0 && (
        <Notice tone="review" className="mt-3 text-[13px]" title="Approval is blocked">
          {approveGaps.map((g) => `${g.label}: ${g.detail}`).join(' ')}
        </Notice>
      )}
      {confirm ? (
        <div className="mt-4 rounded-xl border border-line-strong bg-zinc-50 p-3">
          <p className="text-[14px] font-semibold">{labels[confirm]}?</p>
          <p className="text-[13px] text-ink-muted">{confirm === 'RETURNED' ? 'The case goes back to the preparer with your note. Evidence is kept.' : 'This closes the case. Reopening later creates a new version and keeps this decision in the history.'}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" loading={pending === 'd'} variant={confirm === 'REJECTED' ? 'danger' : 'primary'} onClick={() => decide(confirm)}>Confirm</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
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
      <p className="t-caption mt-3 text-ink-muted">Approval records a decision within this workflow. It does not execute or authorize a bank transfer.</p>
    </div>
  );
}

function AgentTrace({ run, names }: { run: NonNullable<CaseData['agentRun']>; names: CaseData['names'] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-bold"><Bot className="h-4 w-4" aria-hidden /> Preparation agent</h2>
        <span className={cx('rounded-full px-2 py-0.5 text-[11.5px] font-bold', run.status === 'COMPLETED' ? 'bg-zinc-100 text-ink-soft' : run.status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800')}>{run.status.toLowerCase()}</span>
      </div>
      <p className="t-caption mt-1 text-ink-muted">Started by {names[run.initiatedBy]?.name ?? 'member'} · {run.toolCallCount} tool call{run.toolCallCount === 1 ? '' : 's'}</p>
      <ol className="mt-3 space-y-1.5">
        {run.toolExecutions.map((t) => (
          <li key={t.id} className="flex items-start gap-2 text-[13px]">
            {t.status === 'SUCCESS' ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="succeeded" /> : <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" aria-label={t.status.toLowerCase()} />}
            <span>
              <span className="font-semibold">{TOOL_LABEL[t.toolName] ?? t.toolName}</span>
              <span className="block text-[12px] text-ink-muted">{describe(t.toolName, t.output as any, t.status)}</span>
            </span>
          </li>
        ))}
      </ol>
      {run.stopReason && <p className="mt-3 text-[13px] text-amber-800">Stopped: {run.stopReason.replace(/_/g, ' ').toLowerCase()}</p>}
      {run.waitingFor && <p className="mt-2 rounded-lg bg-zinc-50 p-2.5 text-[13px]"><span className="font-semibold">Waiting for: </span>{run.waitingFor}</p>}
      {run.summary && <p className="mt-2 text-[13px] leading-5 text-ink-soft">{run.summary}</p>}
    </div>
  );
}

function describe(tool: string, out: any, status: string) {
  if (status !== 'SUCCESS') return out?.error ?? status.toLowerCase();
  switch (tool) {
    case 'get_case_context':
      return `Version ${out?.inputVersion}, status ${String(out?.status ?? '').toLowerCase().replace(/_/g, ' ')}`;
    case 'get_supplier_snapshot':
      return `Reference v${out?.supplierVersion}; ${out?.hasReferencePhone ? 'phone' : 'no phone'}, ${out?.hasReferenceEmail ? 'email' : 'no email'} on file`;
    case 'get_extracted_evidence':
      return `${out?.fieldsPresent?.length ?? 0} fields present, ${out?.aiIndicators?.length ?? 0} language indicators`;
    case 'compare_payment_details':
      return `${out?.results?.length ?? 0} rule results`;
    case 'get_missing_requirements':
      return out?.unmet?.length ? `${out.unmet.length} unmet: ${out.unmet.map((u: any) => u.key.toLowerCase().replace(/_/g, ' ')).join(', ')}` : 'No unmet requirements';
    case 'create_internal_verification_task':
      return out?.created ? 'Created a new internal task' : out?.reason ?? 'Task already existed';
    case 'prepare_review_summary':
      return 'Summary prepared';
    default:
      return 'Done';
  }
}

function CaseInfo({ data, orgId, me }: { data: CaseData; orgId: string; me: Me }) {
  const c = data.case;
  const { run, pending } = useAction();
  const [reopen, setReopen] = useState(false);
  const [reason, setReason] = useState('');
  const canReopen = isClosed(c.status) && (me.roles.includes('PREPARER') || me.roles.includes('ORG_ADMIN'));
  return (
    <div className="card p-5 text-[13.5px]">
      <h2 className="text-[15px] font-bold">Case record</h2>
      <dl className="mt-3 space-y-2">
        <div className="flex justify-between gap-3"><dt className="text-ink-muted">Created by</dt><dd className="font-semibold">{data.names[c.createdBy]?.name ?? '—'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-muted">Evidence version</dt><dd className="font-semibold">{data.currentVersion?.versionNumber} of {c.inputVersions.length}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-muted">Revision</dt><dd className="font-semibold">{c.revision}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-muted">Supplier reference</dt><dd className="font-semibold">v{data.currentVersion?.supplierVersionNumber}</dd></div>
        {c.expectedAmount && <div className="flex justify-between gap-3"><dt className="text-ink-muted">Expected amount</dt><dd className="font-semibold">{c.expectedCurrency} {c.expectedAmount}</dd></div>}
        {c.note && <div><dt className="text-ink-muted">Note</dt><dd>{c.note}</dd></div>}
      </dl>
      {c.inputVersions.length > 1 && (
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold text-ink-soft">Version history</summary>
          <ul className="mt-2 space-y-1.5">
            {c.inputVersions.map((v) => (
              <li key={v.id} className="text-[12.5px] text-ink-muted">v{v.versionNumber} · {v.reason}</li>
            ))}
          </ul>
        </details>
      )}
      {canReopen && !reopen && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => setReopen(true)}>Reopen as new version</Button>
      )}
      {canReopen && reopen && (
        <form
          className="mt-4 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run('ro', `/api/orgs/${orgId}/cases/${c.id}/reopen`, { body: { reason, expectedRevision: c.revision }, success: 'Case reopened into a new version' });
            if (r) setReopen(false);
          }}
        >
          <label htmlFor="reopen-reason" className="block font-semibold">Why reopen?</label>
          <textarea id="reopen-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="field-input text-[14px]" placeholder="At least 10 characters" />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={pending === 'ro'} disabled={reason.trim().length < 10}>Reopen</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setReopen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

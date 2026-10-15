import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardCheck, FileSearch, Plus } from 'lucide-react';
import { guardPage } from '@/lib/page-guard';
import { prisma } from '@/lib/db';
import { CaseTable } from '@/components/app/case-table';
import { Forbidden } from '@/components/app/forbidden';
import { Empty, LinkButton, Ltr, cx } from '@/components/ui';
import { TASK_TYPE_LABELS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Prepare cases' };
export const dynamic = 'force-dynamic';

export default async function PreparePage({ params, searchParams }: { params: Promise<{ orgId: string }>; searchParams: Promise<{ scope?: string }> }) {
  const { orgId } = await params;
  const { scope } = await searchParams;
  const { user, ctx, allowed } = await guardPage(orgId, `/app/${orgId}/prepare`, ['PREPARER']);
  if (!allowed) return <Forbidden need="Preparer" orgId={orgId} />;
  const mine = scope !== 'all';
  const base = { orgId, ...(mine ? { createdBy: user.id } : {}) };
  const include = { supplier: { select: { name: true } } };
  const [returned, active, submitted, closed, tasks] = await Promise.all([
    prisma.case.findMany({ where: { ...base, status: 'NEEDS_INFORMATION' }, include, orderBy: { updatedAt: 'desc' } }),
    prisma.case.findMany({ where: { ...base, status: { in: ['DRAFT', 'ANALYZED', 'INDEPENDENT_CHECK_REQUIRED'] } }, include, orderBy: { updatedAt: 'desc' } }),
    prisma.case.findMany({ where: { ...base, status: 'READY_FOR_REVIEW' }, include, orderBy: { updatedAt: 'desc' } }),
    prisma.case.findMany({ where: { ...base, status: { startsWith: 'CLOSED_' } }, include, orderBy: { updatedAt: 'desc' }, take: 15 }),
    prisma.verificationTask.findMany({ where: { orgId, status: 'OPEN', case: { ...(mine ? { createdBy: user.id } : {}), status: { in: ['ANALYZED', 'INDEPENDENT_CHECK_REQUIRED', 'NEEDS_INFORMATION'] } } }, include: { case: { select: { id: true, caseNumber: true, currentInputVersionId: true, supplier: { select: { name: true } } } } }, orderBy: { createdAt: 'asc' } }),
  ]);
  const currentTasks = tasks.filter((t) => t.caseInputVersionId === t.case.currentInputVersionId);
  const total = returned.length + active.length + submitted.length + closed.length;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-caption text-ink-muted">{ctx.orgName}</p>
          <h1 className="t-headline">Prepare cases</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-line bg-white p-0.5 text-[13px] font-semibold" role="group" aria-label="Which cases">
            <Link href={`/app/${orgId}/prepare`} aria-current={mine ? 'true' : undefined} className={cx('rounded-full px-3 py-1', mine ? 'bg-navy text-white' : 'text-ink-muted')}>Mine</Link>
            <Link href={`/app/${orgId}/prepare?scope=all`} aria-current={!mine ? 'true' : undefined} className={cx('rounded-full px-3 py-1', !mine ? 'bg-navy text-white' : 'text-ink-muted')}>Whole organization</Link>
          </div>
          <LinkButton href={`/app/${orgId}/prepare/new`}>
            <Plus className="h-4 w-4" aria-hidden /> New case
          </LinkButton>
        </div>
      </div>

      {currentTasks.length > 0 && (
        <section aria-labelledby="tasks-h">
          <h2 id="tasks-h" className="t-sub mb-3 text-[19px]">Verification waiting for you</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {currentTasks.map((t) => (
              <li key={t.id}>
                <Link href={t.taskType === 'ESTABLISH_INDEPENDENT_CHANNEL' ? `/app/${orgId}/cases/${t.case.id}` : `/app/${orgId}/cases/${t.case.id}/verify/${t.id}`} className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 hover:bg-amber-50">
                  <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
                  <span>
                    <span className="block text-[15px] font-bold">{TASK_TYPE_LABELS[t.taskType] ?? t.taskType}</span>
                    <span className="block text-[13px] text-amber-900/80"><Ltr mono>{t.case.caseNumber}</Ltr> · {t.case.supplier.name}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {total === 0 ? (
        <Empty icon={<FileSearch className="h-8 w-8" />} title={mine ? 'You have no cases yet' : 'No cases in this organization yet'} action={<LinkButton href={`/app/${orgId}/prepare/new`} arrow>Create the first case</LinkButton>}>
          Start a case when a payment request, bank account change or new beneficiary request arrives.
        </Empty>
      ) : (
        <>
          {returned.length > 0 && (
            <section aria-labelledby="ret-h">
              <h2 id="ret-h" className="t-sub mb-3 text-[19px]">Returned for more information</h2>
              <CaseTable orgId={orgId} rows={returned} />
            </section>
          )}
          <section aria-labelledby="act-h">
            <h2 id="act-h" className="t-sub mb-3 text-[19px]">Drafts and active cases</h2>
            {active.length ? <CaseTable orgId={orgId} rows={active} /> : <p className="text-[15px] text-ink-muted">Nothing in preparation.</p>}
          </section>
          <section aria-labelledby="sub-h">
            <h2 id="sub-h" className="t-sub mb-3 text-[19px]">Submitted for review</h2>
            {submitted.length ? <CaseTable orgId={orgId} rows={submitted} /> : <p className="text-[15px] text-ink-muted">No cases are waiting for a reviewer.</p>}
          </section>
          {closed.length > 0 && (
            <section aria-labelledby="clo-h">
              <h2 id="clo-h" className="t-sub mb-3 text-[19px]">Recently closed</h2>
              <CaseTable orgId={orgId} rows={closed} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

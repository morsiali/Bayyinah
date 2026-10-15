import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guardPage } from '@/lib/page-guard';
import { prisma } from '@/lib/db';
import { Forbidden } from '@/components/app/forbidden';
import { VerifyForm } from '@/components/case/verify-form';
import { Notice, Ltr } from '@/components/ui';
import { TASK_TYPE_LABELS, isEditable } from '@/lib/constants';

export const metadata: Metadata = { title: 'Record verification' };
export const dynamic = 'force-dynamic';

export default async function VerifyPage({ params }: { params: Promise<{ orgId: string; caseId: string; taskId: string }> }) {
  const { orgId, caseId, taskId } = await params;
  const { user, allowed } = await guardPage(orgId, `/app/${orgId}/cases/${caseId}/verify/${taskId}`, ['PREPARER']);
  if (!allowed) return <Forbidden need="Preparer" orgId={orgId} />;
  const task = await prisma.verificationTask.findFirst({ where: { id: taskId, caseId, orgId }, include: { case: { select: { caseNumber: true, status: true, revision: true, currentInputVersionId: true, supplier: { select: { name: true } } } } } });
  if (!task) notFound();
  const usable = task.status === 'OPEN' && task.caseInputVersionId === task.case.currentInputVersionId && isEditable(task.case.status) && task.taskType !== 'ESTABLISH_INDEPENDENT_CHANNEL';
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/app/${orgId}/cases/${caseId}`} className="text-[14px] font-semibold text-ink-muted hover:text-ink">← Back to case <Ltr mono>{task.case.caseNumber}</Ltr></Link>
      <h1 className="t-headline mt-3">Record verification outcome</h1>
      <p className="t-lead mt-2">You perform the verification outside Bayyinah — by phone, email or in person — then record here what happened. Bayyinah does not make calls or send messages.</p>
      <div className="card mt-6 p-5">
        <p className="t-caption text-ink-muted">{task.case.supplier.name}</p>
        <p className="text-[17px] font-bold">{TASK_TYPE_LABELS[task.taskType] ?? task.taskType}</p>
        <p className="mt-1 text-[15px] text-ink-soft">{task.requirement}</p>
        {task.suggestedChannel && (
          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-[13px] text-ink-muted">Reference channel</p>
            <p className="text-[19px] font-bold"><Ltr>{task.suggestedChannel}</Ltr></p>
            <p className="text-[13px] text-ink-muted">{task.channelSource}</p>
          </div>
        )}
        <Notice tone="review" className="mt-4">Never use a phone number, email address or link that appears in the request itself. If the reference channel is wrong or unreachable, record “Unable to complete” and explain.</Notice>
      </div>
      <div className="card mt-6 p-6">
        {usable ? (
          <VerifyForm orgId={orgId} caseId={caseId} taskId={taskId} revision={task.case.revision} userName={user.name} defaultChannel={task.taskType === 'EMAIL_REFERENCE_ADDRESS' ? 'REFERENCE_EMAIL' : 'REFERENCE_PHONE'} defaultSource={task.channelSource ?? ''} defaultRequirement={task.requirement} />
        ) : (
          <Notice tone="info" title="This task can’t be recorded">
            {task.status !== 'OPEN' ? 'An outcome has already been recorded or the task was superseded.' : task.taskType === 'ESTABLISH_INDEPENDENT_CHANNEL' ? 'This requirement is met by adding a contact channel to the supplier reference.' : 'The case is not currently being prepared.'}{' '}
            <Link href={`/app/${orgId}/cases/${caseId}`} className="link">Return to the case</Link>
          </Notice>
        )}
      </div>
    </div>
  );
}

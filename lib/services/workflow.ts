// The single server-side transition service for case status.
import type { Tx } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { audit } from '@/lib/audit';
import type { CaseStatus } from '@/lib/constants';
import type { Actor } from './access';

export const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  DRAFT: ['ANALYZED', 'DRAFT'],
  ANALYZED: ['ANALYZED', 'INDEPENDENT_CHECK_REQUIRED', 'READY_FOR_REVIEW', 'DRAFT'],
  INDEPENDENT_CHECK_REQUIRED: ['ANALYZED', 'INDEPENDENT_CHECK_REQUIRED', 'READY_FOR_REVIEW', 'DRAFT'],
  NEEDS_INFORMATION: ['ANALYZED', 'INDEPENDENT_CHECK_REQUIRED', 'READY_FOR_REVIEW', 'DRAFT'],
  READY_FOR_REVIEW: ['CLOSED_APPROVED', 'CLOSED_REJECTED', 'CLOSED_INCONCLUSIVE', 'NEEDS_INFORMATION', 'ANALYZED', 'DRAFT'],
  CLOSED_APPROVED: ['DRAFT'],
  CLOSED_REJECTED: ['DRAFT'],
  CLOSED_INCONCLUSIVE: ['DRAFT'],
};

export const canTransition = (from: string, to: string) => (TRANSITIONS[from as CaseStatus] ?? []).includes(to as CaseStatus);

/**
 * Moves a case between states with an optimistic concurrency check on status (and revision when given).
 * Always bumps the revision so any reviewer holding an older revision is rejected.
 */
export async function transitionCase(
  tx: Tx,
  p: {
    caseId: string;
    orgId: string;
    from: string;
    to: CaseStatus;
    actor: Actor | null;
    expectedRevision?: number;
    reason?: string | null;
    versionId?: string | null;
    agentRunId?: string | null;
    extra?: { currentInputVersionId?: string };
  },
) {
  if (!canTransition(p.from, p.to)) {
    throw new AppError('BLOCKED', `A case cannot move from ${p.from.replace(/_/g, ' ').toLowerCase()} to ${p.to.replace(/_/g, ' ').toLowerCase()}.`);
  }
  const res = await tx.case.updateMany({
    where: { id: p.caseId, orgId: p.orgId, status: p.from, ...(p.expectedRevision !== undefined ? { revision: p.expectedRevision } : {}) },
    data: {
      status: p.to,
      revision: { increment: 1 },
      closedAt: p.to.startsWith('CLOSED_') ? new Date() : null,
      ...(p.extra ?? {}),
    },
  });
  if (res.count !== 1) throw new AppError('STALE_VERSION', 'This case changed since you loaded it. Reload to see the latest version.');
  if (p.from !== p.to) {
    await audit(
      { orgId: p.orgId, actor: p.actor, action: 'case.status_changed', entityType: 'case', entityId: p.caseId, changedFields: { from: p.from, to: p.to }, reason: p.reason, caseInputVersionId: p.versionId, agentRunId: p.agentRunId },
      tx,
    );
  }
}

/** Records a material change without a status change; rejects if the case moved underneath the caller. */
export async function bumpRevision(tx: Tx, caseId: string, orgId: string, allowedStatuses: readonly string[]) {
  const res = await tx.case.updateMany({ where: { id: caseId, orgId, status: { in: [...allowedStatuses] } }, data: { revision: { increment: 1 } } });
  if (res.count !== 1) throw new AppError('STALE_VERSION', 'This case changed since you loaded it. Reload to see the latest version.');
}

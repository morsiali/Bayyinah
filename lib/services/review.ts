import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { DECISIONS, type CaseStatus } from '@/lib/constants';
import { loadCase, requireRole, type Actor } from './access';
import { transitionCase } from './workflow';
import { blockers, getRequirements } from './requirements';

export const decisionSchema = z
  .object({
    decision: z.enum(DECISIONS),
    rationale: z.string().trim().max(3000),
    expectedRevision: z.number().int(),
    caseInputVersionId: z.string().min(1),
  })
  .superRefine((d, ctx) => {
    const min = d.decision === 'RETURNED' ? 10 : 20;
    if (d.rationale.length < min) ctx.addIssue({ code: 'custom', path: ['rationale'], message: d.decision === 'RETURNED' ? 'Say what information is needed (at least 10 characters).' : 'Write a rationale of at least 20 characters.' });
  });

const TARGET: Record<(typeof DECISIONS)[number], CaseStatus> = {
  APPROVED: 'CLOSED_APPROVED',
  REJECTED: 'CLOSED_REJECTED',
  RETURNED: 'NEEDS_INFORMATION',
  CLOSED_INCONCLUSIVE: 'CLOSED_INCONCLUSIVE',
};

/** Why the actor cannot decide this case right now (empty = may decide). Used by both UI and server. */
export async function decisionBlockers(actor: Actor, orgId: string, caseId: string) {
  const c = await loadCase(orgId, caseId);
  const reasons: string[] = [];
  if (c.status !== 'READY_FOR_REVIEW') reasons.push('The case is not waiting for review.');
  if (c.createdBy === actor.id) reasons.push('You created this case. A different reviewer must record the decision.');
  return reasons;
}

export async function recordDecision(actor: Actor, orgId: string, caseId: string, input: z.infer<typeof decisionSchema>) {
  await requireRole(actor, orgId, 'REVIEWER');
  const d = decisionSchema.parse(input);
  const c = await loadCase(orgId, caseId);
  if (c.status !== 'READY_FOR_REVIEW') throw new AppError('BLOCKED', 'This case is not waiting for review.');
  // Stale sessions must not decide on a newer version.
  if (c.currentInputVersionId !== d.caseInputVersionId || c.revision !== d.expectedRevision) {
    throw new AppError('STALE_VERSION', 'The case changed after you opened it. Reload to review the current version before deciding.');
  }
  // Separation of duties: the creator can never record the decision on their own case.
  if (c.createdBy === actor.id) throw new AppError('FORBIDDEN', 'You created this case, so you cannot record its review decision. Ask another reviewer.');

  if (d.decision === 'APPROVED') {
    const missing = blockers(await getRequirements(caseId, orgId), 'approve');
    if (missing.length) throw new AppError('BLOCKED', 'Approval is blocked until every requirement is met.', missing.map((m) => `${m.label}: ${m.detail}`));
  }

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: { caseId, orgId, caseInputVersionId: d.caseInputVersionId, caseRevision: d.expectedRevision, reviewerId: actor.id, decision: d.decision, rationale: d.rationale },
    });
    await transitionCase(tx, { caseId, orgId, from: 'READY_FOR_REVIEW', to: TARGET[d.decision], actor, expectedRevision: d.expectedRevision, reason: d.rationale, versionId: d.caseInputVersionId });
    await audit({ orgId, actor, action: `review.${d.decision.toLowerCase()}`, entityType: 'review', entityId: review.id, caseInputVersionId: d.caseInputVersionId, reason: d.rationale }, tx);
    return review;
  });
}

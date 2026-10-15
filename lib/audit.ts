import type { Prisma } from '@prisma/client';
import { prisma, type Tx } from '@/lib/db';

export type AuditInput = {
  orgId: string;
  actor?: { id: string; email: string } | null;
  action: string;
  entityType?: string;
  entityId?: string;
  changedFields?: Prisma.InputJsonValue;
  reason?: string | null;
  caseInputVersionId?: string | null;
  agentRunId?: string | null;
  toolExecutionId?: string | null;
};

/** Append-only. The application exposes no update or delete path for audit events. */
export function audit(input: AuditInput, db: Tx = prisma) {
  return db.auditEvent.create({
    data: {
      orgId: input.orgId,
      actorId: input.actor?.id ?? null,
      actorEmail: input.actor?.email ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      changedFields: input.changedFields,
      reason: input.reason ?? null,
      caseInputVersionId: input.caseInputVersionId ?? null,
      agentRunId: input.agentRunId ?? null,
      toolExecutionId: input.toolExecutionId ?? null,
    },
  });
}

export function platformAudit(
  actor: { id: string; email: string },
  action: string,
  target?: { type: string; id: string },
  details?: Prisma.InputJsonValue,
  db: Tx = prisma,
) {
  return db.platformAdminEvent.create({
    data: { actorId: actor.id, actorEmail: actor.email, action, targetType: target?.type, targetId: target?.id, details },
  });
}

// Data retention: for closed cases older than the organization's retention period, remove stored
// source files and document text. Case metadata, decisions and the audit trail are kept.
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { deleteFile } from '@/lib/storage';

export async function purgeExpiredEvidence(now = new Date()) {
  const orgs = await prisma.organization.findMany({ select: { id: true, retentionDays: true } });
  let purged = 0;
  let smsPurged = 0;
  for (const org of orgs) {
    const cutoff = new Date(now.getTime() - org.retentionDays * 86400_000);
    const cases = await prisma.case.findMany({ where: { orgId: org.id, status: { startsWith: 'CLOSED_' }, closedAt: { lt: cutoff } }, select: { id: true } });
    for (const c of cases) {
      const docs = await prisma.sourceDocument.findMany({ where: { caseId: c.id, OR: [{ rawText: { not: null } }, { storageKey: { not: null } }] } });
      if (!docs.length) continue;
      for (const d of docs) if (d.storageKey) await deleteFile(d.storageKey);
      await prisma.sourceDocument.updateMany({ where: { id: { in: docs.map((d) => d.id) } }, data: { rawText: null, storageKey: null, extractionError: 'Content removed under the organization’s retention policy.' } });
      await audit({ orgId: org.id, actor: null, action: 'retention.evidence_purged', entityType: 'case', entityId: c.id, changedFields: { documents: docs.length, retentionDays: org.retentionDays } });
      purged += docs.length;
    }
    // Inbox messages that were handled before the cutoff lose their text; sender and outcome stay.
    const sms = await prisma.inboundMessage.updateMany({ where: { orgId: org.id, status: { not: 'NEW' }, receivedAt: { lt: cutoff }, body: { not: null } }, data: { body: null } });
    if (sms.count) {
      await audit({ orgId: org.id, actor: null, action: 'retention.sms_purged', entityType: 'organization', entityId: org.id, changedFields: { messages: sms.count, retentionDays: org.retentionDays } });
      smsPurged += sms.count;
    }
  }
  return { purged, smsPurged };
}

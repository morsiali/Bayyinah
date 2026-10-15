import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { getSetting } from '@/lib/settings';
import { CHANNELS, CHANNEL_LABELS, EDITABLE_STATUSES, VERIFICATION_OUTCOMES, isEditable } from '@/lib/constants';
import { sniffType } from '@/lib/files';
import { putFile } from '@/lib/storage';
import { loadCase, requireRole, type Actor } from './access';
import { bumpRevision } from './workflow';

export const verificationSchema = z
  .object({
    channel: z.enum(CHANNELS, { errorMap: () => ({ message: 'Choose the channel you used.' }) }),
    channelSource: z.string().trim().min(3, 'Say where this contact channel came from.').max(300),
    outcome: z.enum(VERIFICATION_OUTCOMES, { errorMap: () => ({ message: 'Choose an outcome.' }) }),
    requirementChecked: z.string().trim().min(5, 'Describe what you checked.').max(500),
    notes: z.string().trim().max(2000).optional().nullable(),
    attestIndependent: z.literal(true, { errorMap: () => ({ message: 'Confirm that you did not use contact details from the request.' }) }),
    expectedRevision: z.number().int(),
  })
  .superRefine((d, ctx) => {
    if (d.outcome !== 'CONFIRMED' && (!d.notes || d.notes.length < 10)) ctx.addIssue({ code: 'custom', path: ['notes'], message: 'Add notes (at least 10 characters) explaining this outcome.' });
  });

/**
 * Records the outcome of a verification a person performed outside the application.
 * The record states who recorded it; it does not claim the application witnessed the contact.
 */
export async function recordVerification(actor: Actor, orgId: string, caseId: string, taskId: string, input: z.infer<typeof verificationSchema>, attachment?: { name: string; bytes: Buffer } | null) {
  await requireRole(actor, orgId, 'PREPARER');
  const d = verificationSchema.parse(input);
  const c = await loadCase(orgId, caseId);
  if (!isEditable(c.status)) throw new AppError('BLOCKED', 'Verification can only be recorded while the case is being prepared.');
  if (c.revision !== d.expectedRevision) throw new AppError('STALE_VERSION', 'This case changed since you loaded it. Reload and try again.');
  const task = await prisma.verificationTask.findFirst({ where: { id: taskId, caseId, orgId } });
  if (!task) throw notFound('Verification task');
  if (task.status !== 'OPEN') throw new AppError('BLOCKED', 'This verification task is no longer open.');
  if (task.caseInputVersionId !== c.currentInputVersionId) throw new AppError('STALE_VERSION', 'This task belongs to an earlier version of the case.');
  if (task.taskType === 'ESTABLISH_INDEPENDENT_CHANNEL') throw new AppError('BLOCKED', 'This requirement is met by adding a contact channel to the supplier reference, not by recording an outcome.');

  let attachmentKey: string | null = null;
  let attachmentName: string | null = null;
  if (attachment && attachment.bytes.length > 0) {
    const maxMb = await getSetting('max_file_size_mb');
    if (attachment.bytes.length > maxMb * 1024 * 1024) throw new AppError('VALIDATION', `The attachment is larger than ${maxMb} MB.`);
    const kind = sniffType(attachment.bytes);
    if (!kind) throw new AppError('VALIDATION', 'Attachments must be PDF, PNG or JPEG files.');
    attachmentKey = await putFile(orgId, caseId, kind, attachment.bytes);
    attachmentName = attachment.name.replace(/[^\w.\- ()]/g, '_').slice(0, 120);
  }

  return prisma.$transaction(async (tx) => {
    const upd = await tx.verificationTask.updateMany({ where: { id: taskId, status: 'OPEN' }, data: { status: 'COMPLETED' } });
    if (upd.count !== 1) throw new AppError('CONFLICT', 'This task was completed by someone else just now.');
    const r = await tx.verificationResult.create({
      data: { taskId, caseId, orgId, caseInputVersionId: task.caseInputVersionId, requirementChecked: d.requirementChecked, channelUsed: CHANNEL_LABELS[d.channel], channelSource: d.channelSource, outcome: d.outcome, notes: d.notes || null, attachmentKey, attachmentName, performedBy: actor.id },
    });
    await bumpRevision(tx, caseId, orgId, EDITABLE_STATUSES);
    await audit({ orgId, actor, action: 'verification.recorded', entityType: 'verificationResult', entityId: r.id, changedFields: { outcome: d.outcome, channel: d.channel }, caseInputVersionId: task.caseInputVersionId }, tx);
    return r;
  });
}

import type { Prisma, Supplier } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { compactIban, ibanProblem } from '@/lib/iban';
import { normalizeCurrency } from '@/lib/money';
import type { SupplierSnapshot } from '@/lib/analysis/rules';
import { requireRole, type Actor } from './access';

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const supplierSchema = z
  .object({
    name: z.string().trim().min(2, 'Supplier name is required.').max(120),
    expectedBeneficiaryName: opt(120),
    referenceIban: opt(42),
    referenceBankAccount: opt(34),
    recordedEmail: opt(160).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Recorded email is not a valid address.'),
    recordedPhone: opt(40).refine((v) => !v || /^[+()\d\s-]{6,}$/.test(v), 'Recorded phone may contain digits, spaces, +, - and brackets only.'),
    usualCurrency: opt(8),
    referenceSource: opt(300),
  })
  .transform((d) => ({
    ...d,
    referenceIban: d.referenceIban ? compactIban(d.referenceIban) : null,
    referenceBankAccount: d.referenceBankAccount ? d.referenceBankAccount.replace(/[\s-]/g, '') : null,
    recordedEmail: d.recordedEmail ? d.recordedEmail.toLowerCase() : null,
    usualCurrency: normalizeCurrency(d.usualCurrency) ?? (d.usualCurrency ? d.usualCurrency.toUpperCase() : null),
  }))
  .superRefine((d, ctx) => {
    if (d.referenceIban) {
      const p = ibanProblem(d.referenceIban);
      if (p) ctx.addIssue({ code: 'custom', path: ['referenceIban'], message: `The reference IBAN ${p}.` });
    }
  });

export type SupplierInput = z.input<typeof supplierSchema>;

const SNAPSHOT_FIELDS = ['name', 'expectedBeneficiaryName', 'referenceIban', 'referenceBankAccount', 'recordedEmail', 'recordedPhone', 'usualCurrency', 'referenceSource'] as const;

export function supplierSnapshotOf(s: Supplier): SupplierSnapshot & { version: number } {
  return {
    name: s.name,
    expectedBeneficiaryName: s.expectedBeneficiaryName,
    referenceIban: s.referenceIban,
    referenceBankAccount: s.referenceBankAccount,
    recordedEmail: s.recordedEmail,
    recordedPhone: s.recordedPhone,
    usualCurrency: s.usualCurrency,
    referenceSource: s.referenceSource,
    reviewStatus: s.reviewStatus,
    version: s.currentVersion,
  };
}

export async function createSupplier(actor: Actor, orgId: string, input: SupplierInput) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const d = supplierSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const s = await tx.supplier.create({ data: { orgId, ...d, createdBy: actor.id, currentVersion: 1, reviewStatus: 'PENDING_REVIEW' } });
    await tx.supplierVersion.create({ data: { supplierId: s.id, orgId, versionNumber: 1, snapshot: supplierSnapshotOf(s) as Prisma.InputJsonValue, changedBy: actor.id, changeReason: 'Reference created' } });
    await audit({ orgId, actor, action: 'supplier.created', entityType: 'supplier', entityId: s.id, changedFields: { name: s.name } }, tx);
    return s;
  });
}

/** Preserves the previous version, records actor and reason, and resets the human review status. */
export async function updateSupplier(actor: Actor, orgId: string, supplierId: string, input: SupplierInput, reason: string) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  if (!reason || reason.trim().length < 5) throw new AppError('VALIDATION', 'Give a reason for this change (at least 5 characters).');
  const d = supplierSchema.parse(input);
  const s = await prisma.supplier.findFirst({ where: { id: supplierId, orgId } });
  if (!s) throw notFound('Supplier');
  const changed = SNAPSHOT_FIELDS.filter((k) => (s as any)[k] !== (d as any)[k]);
  if (changed.length === 0) throw new AppError('VALIDATION', 'Nothing changed.');
  return prisma.$transaction(async (tx) => {
    const updated = await tx.supplier.update({
      where: { id: supplierId },
      data: { ...d, currentVersion: s.currentVersion + 1, reviewStatus: 'PENDING_REVIEW', reviewedAt: null, reviewedBy: null },
    });
    await tx.supplierVersion.create({ data: { supplierId, orgId, versionNumber: updated.currentVersion, snapshot: supplierSnapshotOf(updated) as Prisma.InputJsonValue, changedBy: actor.id, changeReason: reason.trim() } });
    const affected = await tx.case.count({ where: { orgId, supplierId, status: { notIn: ['CLOSED_APPROVED', 'CLOSED_REJECTED', 'CLOSED_INCONCLUSIVE'] } } });
    await audit({ orgId, actor, action: 'supplier.updated', entityType: 'supplier', entityId: supplierId, changedFields: { fields: [...changed], version: updated.currentVersion, openCasesAffected: affected }, reason: reason.trim() }, tx);
    return { supplier: updated, openCasesAffected: affected };
  });
}

export async function markSupplierReviewed(actor: Actor, orgId: string, supplierId: string) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const s = await prisma.supplier.findFirst({ where: { id: supplierId, orgId } });
  if (!s) throw notFound('Supplier');
  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({ where: { id: supplierId }, data: { reviewStatus: 'REVIEWED', reviewedAt: new Date(), reviewedBy: actor.id } });
    await audit({ orgId, actor, action: 'supplier.reviewed', entityType: 'supplier', entityId: supplierId, changedFields: { version: s.currentVersion } }, tx);
  });
}

export async function setSupplierActive(actor: Actor, orgId: string, supplierId: string, isActive: boolean) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const s = await prisma.supplier.findFirst({ where: { id: supplierId, orgId } });
  if (!s) throw notFound('Supplier');
  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({ where: { id: supplierId }, data: { isActive } });
    await audit({ orgId, actor, action: isActive ? 'supplier.reactivated' : 'supplier.deactivated', entityType: 'supplier', entityId: supplierId }, tx);
  });
}

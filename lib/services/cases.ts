import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma, type Tx } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { getSetting } from '@/lib/settings';
import { EDITABLE_STATUSES, REQUEST_TYPES, SEVERITY_RANK, isClosed, isEditable, type Severity } from '@/lib/constants';
import { normalizeCurrency, parseAmountToMinor } from '@/lib/money';
import { extractPdfText, sha256, sniffType } from '@/lib/files';
import { putFile } from '@/lib/storage';
import { loadCase, requireRole, getOrgContext, type Actor } from './access';
import { bumpRevision, transitionCase } from './workflow';
import { blockers, getRequirements } from './requirements';
import { supplierSnapshotOf } from './suppliers';

// ───────────── Create ─────────────

export const createCaseSchema = z.object({
  supplierId: z.string().min(1, 'Choose a supplier.'),
  requestType: z.enum(REQUEST_TYPES, { errorMap: () => ({ message: 'Choose a request type.' }) }),
  expectedAmount: z.string().trim().max(40).optional().nullable(),
  expectedCurrency: z.string().trim().max(8).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

async function nextCaseNumber(tx: Tx, orgId: string) {
  const org = await tx.organization.findUniqueOrThrow({ where: { id: orgId }, select: { slug: true } });
  const prefix = org.slug.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
  const year = new Date().getFullYear();
  const count = await tx.case.count({ where: { orgId } });
  for (let i = 1; i < 50; i++) {
    const n = `BAY-${prefix}-${year}-${String(count + i).padStart(4, '0')}`;
    if (!(await tx.case.findUnique({ where: { caseNumber: n }, select: { id: true } }))) return n;
  }
  throw new AppError('CONFLICT', 'Could not allocate a case number. Try again.');
}

export async function createCase(actor: Actor, orgId: string, input: z.infer<typeof createCaseSchema>) {
  await requireRole(actor, orgId, 'PREPARER');
  const data = createCaseSchema.parse(input);
  const supplier = await prisma.supplier.findFirst({ where: { id: data.supplierId, orgId, isActive: true } });
  if (!supplier) throw notFound('Supplier');
  const max = await getSetting('max_cases_per_org');
  if ((await prisma.case.count({ where: { orgId } })) >= max) throw new AppError('LIMIT_REACHED', `This organization has reached its limit of ${max} cases.`);

  let expectedAmount: string | null = null;
  let expectedCurrency: string | null = null;
  if (data.expectedAmount) {
    expectedCurrency = normalizeCurrency(data.expectedCurrency) ?? normalizeCurrency(supplier.usualCurrency) ?? 'AED';
    if (parseAmountToMinor(data.expectedAmount, expectedCurrency) === null) throw new AppError('VALIDATION', 'The expected amount is not a valid number (for example 18,750.00).');
    expectedAmount = data.expectedAmount;
  }

  return prisma.$transaction(async (tx) => {
    const caseNumber = await nextCaseNumber(tx, orgId);
    const c = await tx.case.create({
      data: { orgId, supplierId: supplier.id, caseNumber, requestType: data.requestType, status: 'DRAFT', expectedAmount, expectedCurrency, note: data.note || null, createdBy: actor.id },
    });
    const v = await tx.caseInputVersion.create({
      data: { caseId: c.id, orgId, versionNumber: 1, supplierVersionNumber: supplier.currentVersion, supplierSnapshot: supplierSnapshotOf(supplier) as Prisma.InputJsonValue, reason: 'Case created', createdBy: actor.id },
    });
    await tx.case.update({ where: { id: c.id }, data: { currentInputVersionId: v.id } });
    await audit({ orgId, actor, action: 'case.created', entityType: 'case', entityId: c.id, changedFields: { caseNumber, requestType: data.requestType, supplierId: supplier.id }, caseInputVersionId: v.id }, tx);
    return { id: c.id, caseNumber };
  });
}

// ───────────── Evidence ─────────────

export const pastedSourceSchema = z.object({
  text: z.string().trim().min(20, 'Paste at least 20 characters of the request.').max(50000, 'Pasted text is limited to 50,000 characters.'),
  label: z.string().trim().max(80).optional().nullable(),
});

function assertEditable(status: string) {
  if (isClosed(status)) throw new AppError('BLOCKED', 'This case is closed. Reopen it into a new version to change its evidence.');
  if (!isEditable(status)) throw new AppError('BLOCKED', 'This case is waiting for review. Withdraw it from review before changing evidence.');
}

export async function addPastedSource(actor: Actor, orgId: string, caseId: string, input: z.infer<typeof pastedSourceSchema>) {
  await requireRole(actor, orgId, 'PREPARER');
  const data = pastedSourceSchema.parse(input);
  const c = await loadCase(orgId, caseId);
  assertEditable(c.status);
  return prisma.$transaction(async (tx) => {
    const doc = await tx.sourceDocument.create({
      data: { caseId, orgId, caseInputVersionId: c.currentInputVersionId!, kind: 'PASTED_TEXT', label: data.label || 'Pasted text', rawText: data.text, sizeBytes: Buffer.byteLength(data.text), extractionStatus: 'COMPLETED', uploadedBy: actor.id },
    });
    await bumpRevision(tx, caseId, orgId, EDITABLE_STATUSES);
    await audit({ orgId, actor, action: 'source.added', entityType: 'sourceDocument', entityId: doc.id, changedFields: { kind: 'PASTED_TEXT', chars: data.text.length }, caseInputVersionId: c.currentInputVersionId }, tx);
    return doc;
  });
}

export async function addPdfSource(actor: Actor, orgId: string, caseId: string, file: { name: string; bytes: Buffer }) {
  await requireRole(actor, orgId, 'PREPARER');
  const c = await loadCase(orgId, caseId);
  assertEditable(c.status);
  const maxMb = await getSetting('max_file_size_mb');
  if (file.bytes.length === 0) throw new AppError('VALIDATION', 'The file is empty.');
  if (file.bytes.length > maxMb * 1024 * 1024) throw new AppError('VALIDATION', `The file is larger than the ${maxMb} MB limit.`);
  if (sniffType(file.bytes) !== 'pdf') throw new AppError('VALIDATION', 'Only PDF files are accepted here. The file content is not a PDF, whatever its name says.');

  const extraction = await extractPdfText(file.bytes);
  const key = await putFile(orgId, caseId, 'pdf', file.bytes);
  const safeName = file.name.replace(/[^\w.\- ()؀-ۿ]/g, '_').slice(0, 120) || 'document.pdf';
  return prisma.$transaction(async (tx) => {
    const doc = await tx.sourceDocument.create({
      data: {
        caseId, orgId, caseInputVersionId: c.currentInputVersionId!, kind: 'PDF', label: safeName, fileName: safeName, mimeType: 'application/pdf', storageKey: key,
        sizeBytes: file.bytes.length, sha256: sha256(file.bytes), rawText: extraction.ok ? extraction.text.slice(0, 120000) : null,
        extractionStatus: extraction.ok ? 'COMPLETED' : 'FAILED', extractionError: extraction.ok ? null : extraction.reason, uploadedBy: actor.id,
      },
    });
    await bumpRevision(tx, caseId, orgId, EDITABLE_STATUSES);
    await audit({ orgId, actor, action: extraction.ok ? 'source.added' : 'source.extraction_failed', entityType: 'sourceDocument', entityId: doc.id, changedFields: { kind: 'PDF', bytes: file.bytes.length }, caseInputVersionId: c.currentInputVersionId }, tx);
    return doc;
  });
}

// ───────────── Submit / withdraw ─────────────

export async function submitForReview(actor: Actor, orgId: string, caseId: string, expectedRevision: number, note?: string | null) {
  await requireRole(actor, orgId, 'PREPARER');
  const c = await loadCase(orgId, caseId);
  if (!['ANALYZED', 'INDEPENDENT_CHECK_REQUIRED', 'NEEDS_INFORMATION'].includes(c.status)) throw new AppError('BLOCKED', 'Only an analyzed case can be submitted for review.');
  const missing = blockers(await getRequirements(caseId, orgId), 'submit');
  if (missing.length) throw new AppError('BLOCKED', 'This case is not ready for review yet.', missing.map((m) => `${m.label}: ${m.detail}`));
  await prisma.$transaction((tx) => transitionCase(tx, { caseId, orgId, from: c.status, to: 'READY_FOR_REVIEW', actor, expectedRevision, reason: note || 'Submitted for review', versionId: c.currentInputVersionId }));
}

export async function withdrawFromReview(actor: Actor, orgId: string, caseId: string, expectedRevision: number) {
  await requireRole(actor, orgId, 'PREPARER');
  const c = await loadCase(orgId, caseId);
  if (c.status !== 'READY_FOR_REVIEW') throw new AppError('BLOCKED', 'Only a case waiting for review can be withdrawn.');
  await prisma.$transaction((tx) => transitionCase(tx, { caseId, orgId, from: c.status, to: 'ANALYZED', actor, expectedRevision, reason: 'Withdrawn from review by preparer', versionId: c.currentInputVersionId }));
}

// ───────────── Versioning ─────────────

async function createInputVersion(tx: Tx, actor: Actor, orgId: string, caseId: string, reason: string) {
  const c = await tx.case.findFirstOrThrow({ where: { id: caseId, orgId }, include: { supplier: true } });
  const last = await tx.caseInputVersion.findFirst({ where: { caseId }, orderBy: { versionNumber: 'desc' } });
  await tx.caseInputVersion.updateMany({ where: { caseId }, data: { isCurrent: false } });
  const v = await tx.caseInputVersion.create({
    data: { caseId, orgId, versionNumber: (last?.versionNumber ?? 0) + 1, supplierVersionNumber: c.supplier.currentVersion, supplierSnapshot: supplierSnapshotOf(c.supplier) as Prisma.InputJsonValue, reason, createdBy: actor.id },
  });
  // Open tasks from the previous version can no longer be satisfied.
  await tx.verificationTask.updateMany({ where: { caseId, orgId, status: 'OPEN', caseInputVersionId: { not: v.id } }, data: { status: 'SUPERSEDED', idempotencyKey: null } });
  return v;
}

export const reasonSchema = z.object({ reason: z.string().trim().min(10, 'Give a reason of at least 10 characters.').max(500) });

export async function reopenCase(actor: Actor, orgId: string, caseId: string, reason: string, expectedRevision: number) {
  await requireRole(actor, orgId, ['PREPARER', 'ORG_ADMIN']);
  reasonSchema.parse({ reason });
  const c = await loadCase(orgId, caseId);
  if (!isClosed(c.status)) throw new AppError('BLOCKED', 'Only a closed case can be reopened.');
  return prisma.$transaction(async (tx) => {
    const v = await createInputVersion(tx, actor, orgId, caseId, `Reopened: ${reason}`);
    await transitionCase(tx, { caseId, orgId, from: c.status, to: 'DRAFT', actor, expectedRevision, reason, versionId: v.id, extra: { currentInputVersionId: v.id } });
    await audit({ orgId, actor, action: 'case.reopened', entityType: 'case', entityId: caseId, reason, caseInputVersionId: v.id, changedFields: { versionNumber: v.versionNumber } }, tx);
    return v;
  });
}

export async function applySupplierUpdate(actor: Actor, orgId: string, caseId: string, expectedRevision: number) {
  await requireRole(actor, orgId, ['PREPARER', 'ORG_ADMIN']);
  const c = await prisma.case.findFirst({ where: { id: caseId, orgId }, include: { supplier: true, inputVersions: { where: { isCurrent: true } } } });
  if (!c) throw notFound('Case');
  if (isClosed(c.status)) throw new AppError('BLOCKED', 'Closed cases keep their historical reference. Reopen the case to use the updated reference.');
  const cur = c.inputVersions[0];
  if (!cur || c.supplier.currentVersion <= cur.supplierVersionNumber) throw new AppError('BLOCKED', 'This case already uses the latest supplier reference.');
  return prisma.$transaction(async (tx) => {
    const v = await createInputVersion(tx, actor, orgId, caseId, `Supplier reference updated to version ${c.supplier.currentVersion}`);
    await transitionCase(tx, { caseId, orgId, from: c.status, to: 'DRAFT', actor, expectedRevision, reason: 'Applied updated supplier reference; previous analysis, verification and review no longer apply', versionId: v.id, extra: { currentInputVersionId: v.id } });
    await audit({ orgId, actor, action: 'case.reference_applied', entityType: 'case', entityId: caseId, caseInputVersionId: v.id, changedFields: { supplierVersion: c.supplier.currentVersion, versionNumber: v.versionNumber } }, tx);
    return v;
  });
}

// ───────────── Reads ─────────────

export async function listCases(orgId: string, where: Prisma.CaseWhereInput = {}, take = 100) {
  return prisma.case.findMany({
    where: { orgId, ...where },
    include: { supplier: { select: { name: true } } },
    orderBy: { updatedAt: 'desc' },
    take,
  });
}

export async function userNames(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  const users = unique.length ? await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true, email: true } }) : [];
  return Object.fromEntries(users.map((u) => [u.id, { name: u.name, email: u.email }])) as Record<string, { name: string; email: string }>;
}

/** Everything the Decision Passport needs, scoped to one organization. */
export async function getCaseDetail(actor: Actor, orgId: string, caseId: string) {
  const ctx = await getOrgContext(actor, orgId);
  const c = await prisma.case.findFirst({
    where: { id: caseId, orgId },
    include: {
      supplier: { select: { id: true, name: true, currentVersion: true, reviewStatus: true, isActive: true } },
      inputVersions: { orderBy: { versionNumber: 'desc' } },
      sourceDocuments: { orderBy: { createdAt: 'asc' } },
      reviews: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!c) throw notFound('Case');
  const versionId = c.currentInputVersionId ?? '';
  const currentVersion = c.inputVersions.find((v) => v.id === versionId) ?? c.inputVersions[0];
  const [analysis, failedAnalysis, corrections, tasks, agentRun, requirements] = await Promise.all([
    prisma.analysis.findFirst({ where: { caseId, orgId, caseInputVersionId: versionId, status: 'COMPLETED' }, orderBy: { createdAt: 'desc' }, include: { findings: true } }),
    prisma.analysis.findFirst({ where: { caseId, orgId, caseInputVersionId: versionId }, orderBy: { createdAt: 'desc' } }),
    prisma.fieldCorrection.findMany({ where: { caseId, orgId }, orderBy: { createdAt: 'desc' } }),
    prisma.verificationTask.findMany({ where: { caseId, orgId }, include: { results: { orderBy: { performedAt: 'desc' } } }, orderBy: { createdAt: 'asc' } }),
    prisma.agentRun.findFirst({ where: { caseId, orgId, caseInputVersionId: versionId }, orderBy: { startedAt: 'desc' }, include: { toolExecutions: { orderBy: { sequence: 'asc' } } } }),
    getRequirements(caseId, orgId),
  ]);
  const findings = (analysis?.findings ?? []).sort(
    (a, b) => SEVERITY_RANK[a.severity as Severity] - SEVERITY_RANK[b.severity as Severity] || (a.source === b.source ? 0 : a.source === 'RULE' ? -1 : 1),
  );
  const names = await userNames([
    c.createdBy,
    ...c.sourceDocuments.map((s) => s.uploadedBy),
    ...c.reviews.map((r) => r.reviewerId),
    ...corrections.map((x) => x.correctedBy),
    ...tasks.flatMap((t) => t.results.map((r) => r.performedBy)),
    agentRun?.initiatedBy,
    analysis?.createdBy,
  ]);
  return {
    ctx,
    case: c,
    currentVersion,
    analysis,
    latestAnalysisAttempt: failedAnalysis,
    findings,
    corrections,
    tasks,
    currentTasks: tasks.filter((t) => t.caseInputVersionId === versionId && t.status !== 'SUPERSEDED'),
    agentRun,
    requirements,
    names,
    supplierUpdateAvailable: !!currentVersion && c.supplier.currentVersion > currentVersion.supplierVersionNumber,
  };
}

export type CaseDetail = Awaited<ReturnType<typeof getCaseDetail>>;

import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { registerUser, resetPassword, adminIssueReset } from '@/lib/services/accounts';
import { acceptInvitation, changeMemberRoles, createInvitation, removeMember, revokeInvitation } from '@/lib/services/orgs';
import { getOrgContext } from '@/lib/services/access';
import { addPastedSource, addPdfSource, applySupplierUpdate, createCase, getCaseDetail, reopenCase, submitForReview, withdrawFromReview } from '@/lib/services/cases';
import { correctField, runAnalysis } from '@/lib/services/analysis';
import { runAgent } from '@/lib/services/agent';
import { recordVerification } from '@/lib/services/verification';
import { recordDecision } from '@/lib/services/review';
import { updateSupplier } from '@/lib/services/suppliers';
import { getOperationalMetrics, listOrganizations, provisionPlatformAdmin, setOrganizationStatus } from '@/lib/services/platform';
import { getRequirements } from '@/lib/services/requirements';
import { CHANGE_REQUEST, MATCHING_INVOICE, makePdf, mkOrg, mkUser, rev, uid } from '../helpers';

async function code(p: Promise<unknown>) {
  try {
    await p;
    return 'OK';
  } catch (e) {
    return e instanceof AppError ? e.code : `THROWN:${(e as Error).name}`;
  }
}

/** Takes a bank-account-change case to READY_FOR_REVIEW with the given verification outcome. */
async function preparedChangeCase(outcome: 'CONFIRMED' | 'NOT_CONFIRMED' = 'CONFIRMED') {
  const o = await mkOrg();
  const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'BANK_ACCOUNT_CHANGE' });
  await addPastedSource(o.preparer, o.org.id, c.id, { text: CHANGE_REQUEST });
  await runAnalysis(o.preparer, o.org.id, c.id);
  await runAgent(o.preparer, o.org.id, c.id);
  const task = await prisma.verificationTask.findFirstOrThrow({ where: { caseId: c.id, status: 'OPEN' } });
  await recordVerification(o.preparer, o.org.id, c.id, task.id, {
    channel: 'REFERENCE_PHONE',
    channelSource: 'Supplier reference v1',
    outcome,
    requirementChecked: 'Asked supplier to confirm the change',
    notes: outcome === 'CONFIRMED' ? null : 'Supplier says they did not request any change.',
    attestIndependent: true,
    expectedRevision: (await rev(c.id)).revision,
  });
  await submitForReview(o.preparer, o.org.id, c.id, (await rev(c.id)).revision);
  return { ...o, caseId: c.id };
}

afterEach(() => {
  process.env.AI_PROVIDER = 'local';
});

describe('Identity and onboarding', () => {
  it('public registration never grants platform administration', async () => {
    const u = await registerUser({ name: 'New Person', email: `new-${uid()}@test.example`, password: 'Sufficient123' });
    expect(await prisma.platformAdminMembership.findUnique({ where: { userId: u.id } })).toBeNull();
    expect(await code(listOrganizations({ id: u.id, email: u.email, name: u.name }))).toBe('FORBIDDEN');
  });

  it('rejects weak passwords and duplicate emails', async () => {
    expect(await code(registerUser({ name: 'A B', email: `w-${uid()}@test.example`, password: 'short' }))).toBe('VALIDATION');
    const email = `d-${uid()}@test.example`;
    await registerUser({ name: 'A B', email, password: 'Sufficient123' });
    expect(await code(registerUser({ name: 'A B', email, password: 'Sufficient123' }))).toBe('CONFLICT');
  });

  it('invitations are expiring, single-use and bound to the invited email', async () => {
    const o = await mkOrg();
    const invitee = await mkUser('invitee');
    const other = await mkUser('other');
    const inv = await createInvitation(o.admin, o.org.id, { email: invitee.email, roles: ['REVIEWER'] });
    const token = inv.path.split('/').pop()!;
    expect(await code(acceptInvitation(other, token))).toBe('FORBIDDEN');
    const r = await acceptInvitation(invitee, token);
    expect(r.orgId).toBe(o.org.id);
    expect((await getOrgContext(invitee, o.org.id)).roles).toEqual(['REVIEWER']);
    expect(await code(acceptInvitation(invitee, token))).toBe('BLOCKED');

    const late = await mkUser('late');
    const inv2 = await createInvitation(o.admin, o.org.id, { email: late.email, roles: ['PREPARER'] });
    await prisma.organizationInvitation.update({ where: { id: inv2.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await code(acceptInvitation(late, inv2.path.split('/').pop()!))).toBe('BLOCKED');

    const inv3 = await createInvitation(o.admin, o.org.id, { email: late.email, roles: ['PREPARER'] });
    await revokeInvitation(o.admin, o.org.id, inv3.id);
    expect(await code(acceptInvitation(late, inv3.path.split('/').pop()!))).toBe('NOT_FOUND');
  });

  it('only admins invite; the last admin cannot be removed or demoted', async () => {
    const o = await mkOrg();
    expect(await code(createInvitation(o.preparer, o.org.id, { email: 'x@test.example', roles: ['PREPARER'] }))).toBe('FORBIDDEN');
    const adminM = await prisma.membership.findFirstOrThrow({ where: { orgId: o.org.id, userId: o.admin.id } });
    expect(await code(changeMemberRoles(o.admin, o.org.id, adminM.id, ['PREPARER']))).toBe('BLOCKED');
    expect(await code(removeMember(o.admin, o.org.id, adminM.id))).toBe('BLOCKED');
    const revM = await prisma.membership.findFirstOrThrow({ where: { orgId: o.org.id, userId: o.reviewer.id } });
    await changeMemberRoles(o.admin, o.org.id, revM.id, ['REVIEWER', 'ORG_ADMIN']);
    await changeMemberRoles(o.admin, o.org.id, adminM.id, ['PREPARER']);
    expect((await getOrgContext(o.admin, o.org.id)).roles).toEqual(['PREPARER']);
  });

  it('password reset consumes the token and revokes existing sessions', async () => {
    const o = await mkOrg();
    const m = await prisma.membership.findFirstOrThrow({ where: { orgId: o.org.id, userId: o.preparer.id } });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: o.preparer.id } });
    const { path } = await adminIssueReset(o.admin, o.org.id, m.id);
    const token = path.split('/').pop()!;
    await resetPassword(token, 'BrandNewPass99');
    const after = await prisma.user.findUniqueOrThrow({ where: { id: o.preparer.id } });
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(await code(resetPassword(token, 'AnotherPass99'))).toBe('BLOCKED');
  });
});

describe('Authorization and isolation', () => {
  it('enforces roles on the server regardless of navigation', async () => {
    const o = await mkOrg();
    expect(await code(createCase(o.reviewer, o.org.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT' }))).toBe('FORBIDDEN');
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT' });
    expect(await code(runAgent(o.reviewer, o.org.id, c.id))).toBe('FORBIDDEN');
    expect(await code(updateSupplier(o.preparer, o.org.id, o.supplier.id, { name: 'Changed' }, 'because'))).toBe('FORBIDDEN');
  });

  it('isolates organizations: another org’s case is indistinguishable from a missing one', async () => {
    const a = await mkOrg();
    const b = await mkOrg();
    const c = await createCase(a.preparer, a.org.id, { supplierId: a.supplier.id, requestType: 'INVOICE_PAYMENT' });
    // Member of B naming A's org: not a member.
    expect(await code(getCaseDetail(b.preparer, a.org.id, c.id))).toBe('FORBIDDEN');
    // Member of B naming B's org with A's case id: not found.
    expect(await code(getCaseDetail(b.preparer, b.org.id, c.id))).toBe('NOT_FOUND');
    expect(await code(addPastedSource(b.preparer, b.org.id, c.id, { text: 'x'.repeat(40) }))).toBe('NOT_FOUND');
    // Using A's supplier from B fails.
    expect(await code(createCase(b.preparer, b.org.id, { supplierId: a.supplier.id, requestType: 'INVOICE_PAYMENT' }))).toBe('NOT_FOUND');
  });

  it('private documents are scoped to the owning organization', async () => {
    const a = await mkOrg();
    const b = await mkOrg();
    const c = await createCase(a.preparer, a.org.id, { supplierId: a.supplier.id, requestType: 'INVOICE_PAYMENT' });
    const doc = await addPdfSource(a.preparer, a.org.id, c.id, { name: 'invoice.pdf', bytes: makePdf('Invoice INV-77 Amount due AED 1,000.00\nBeneficiary name: Gulf Supplies Co. LLC') });
    expect(doc.extractionStatus).toBe('COMPLETED');
    expect(doc.storageKey?.startsWith(`${a.org.id}/`)).toBe(true);
    expect(await prisma.sourceDocument.findFirst({ where: { id: doc.id, orgId: b.org.id } })).toBeNull();
  });

  it('suspended organizations lose access until reactivated', async () => {
    const o = await mkOrg();
    const ops = await mkUser('ops');
    await provisionPlatformAdmin(ops.email, 'test');
    await setOrganizationStatus(ops, o.org.id, 'SUSPENDED', 'Unpaid pilot agreement');
    expect(await code(getOrgContext(o.preparer, o.org.id))).toBe('SUSPENDED');
    await setOrganizationStatus(ops, o.org.id, 'ACTIVE', 'Agreement renewed today');
    expect(await code(getOrgContext(o.preparer, o.org.id))).toBe('OK');
  });

  it('platform admins have no default access to case content', async () => {
    const o = await mkOrg();
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT' });
    await addPastedSource(o.preparer, o.org.id, c.id, { text: MATCHING_INVOICE(o.refIban) });
    const ops = await mkUser('ops2');
    await provisionPlatformAdmin(ops.email, 'test');
    expect(await code(getCaseDetail(ops, o.org.id, c.id))).toBe('FORBIDDEN');
    const metrics = JSON.stringify(await getOperationalMetrics(ops));
    expect(metrics).not.toContain('Amount due');
    expect(metrics).not.toContain(o.refIban);
  });
});

describe('Evidence and analysis', () => {
  it('unreadable PDFs are stored but never produce an analysis', async () => {
    const o = await mkOrg();
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT' });
    const doc = await addPdfSource(o.preparer, o.org.id, c.id, { name: 'scan.pdf', bytes: makePdf() });
    expect(doc.extractionStatus).toBe('FAILED');
    expect(doc.extractionError).toMatch(/OCR is not supported/);
    expect(await code(runAnalysis(o.preparer, o.org.id, c.id))).toBe('BLOCKED');
    expect(await prisma.analysis.count({ where: { caseId: c.id } })).toBe(0);
  });

  it('rejects files that are not PDFs whatever their name', async () => {
    const o = await mkOrg();
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT' });
    expect(await code(addPdfSource(o.preparer, o.org.id, c.id, { name: 'invoice.pdf', bytes: Buffer.from('<html><script>alert(1)</script></html>') }))).toBe('VALIDATION');
  });

  it('model failures preserve saved work and record a failed analysis', async () => {
    const o = await mkOrg();
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT' });
    await addPastedSource(o.preparer, o.org.id, c.id, { text: MATCHING_INVOICE(o.refIban) });
    process.env.AI_PROVIDER = 'openai';
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(await code(runAnalysis(o.preparer, o.org.id, c.id))).toBe('UPSTREAM');
    if (savedKey) process.env.OPENAI_API_KEY = savedKey;
    const after = await rev(c.id);
    expect(after.status).toBe('DRAFT');
    expect(await prisma.sourceDocument.count({ where: { caseId: c.id } })).toBe(1);
    expect((await prisma.analysis.findFirstOrThrow({ where: { caseId: c.id } })).status).toBe('FAILED');
  });

  it('embedded instructions are flagged and gain no authority', async () => {
    const o = await mkOrg();
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'BANK_ACCOUNT_CHANGE' });
    await addPastedSource(o.preparer, o.org.id, c.id, { text: CHANGE_REQUEST });
    await runAnalysis(o.preparer, o.org.id, c.id);
    const f = await prisma.finding.findMany({ where: { caseId: c.id } });
    expect(f.some((x) => x.category === 'prompt_injection_attempt')).toBe(true);
    const r = await runAgent(o.preparer, o.org.id, c.id);
    expect(r.status).toBe('COMPLETED');
    expect((await rev(c.id)).status).toBe('INDEPENDENT_CHECK_REQUIRED');
    // Cannot be submitted, let alone approved, without a person recording verification.
    expect(await code(submitForReview(o.preparer, o.org.id, c.id, (await rev(c.id)).revision))).toBe('BLOCKED');
  });

  it('corrections keep the original, re-run rules and supersede verification', async () => {
    const o = await mkOrg();
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'BANK_ACCOUNT_CHANGE' });
    await addPastedSource(o.preparer, o.org.id, c.id, { text: CHANGE_REQUEST });
    await runAnalysis(o.preparer, o.org.id, c.id);
    await runAgent(o.preparer, o.org.id, c.id);
    expect(await prisma.verificationTask.count({ where: { caseId: c.id, status: 'OPEN' } })).toBe(1);
    const r = await correctField(o.preparer, o.org.id, c.id, { fieldName: 'iban', value: o.refIban, note: 'Typo in pasted text; PDF shows reference IBAN', expectedRevision: (await rev(c.id)).revision });
    expect(r.material).toBe(true);
    const corr = await prisma.fieldCorrection.findFirstOrThrow({ where: { caseId: c.id } });
    expect(corr.originalValue).toMatch(/^AE\d+/);
    expect(corr.correctedValue).toBe(o.refIban);
    expect(await prisma.verificationTask.count({ where: { caseId: c.id, status: 'SUPERSEDED' } })).toBe(1);
    const findings = await prisma.finding.findMany({ where: { caseId: c.id, source: 'RULE' } });
    expect(findings.some((x) => x.ruleId === 'R-IBAN-COMPARE')).toBe(false);
    expect((await getRequirements(c.id, o.org.id)).find((x) => x.key === 'AGENT')?.met).toBe(false);
  });
});

describe('Agent', () => {
  it('creates verification tasks idempotently across retries', async () => {
    const o = await mkOrg();
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'NEW_BENEFICIARY' });
    await addPastedSource(o.preparer, o.org.id, c.id, { text: CHANGE_REQUEST });
    await runAnalysis(o.preparer, o.org.id, c.id);
    await runAgent(o.preparer, o.org.id, c.id);
    await runAgent(o.preparer, o.org.id, c.id);
    await runAgent(o.preparer, o.org.id, c.id);
    expect(await prisma.verificationTask.count({ where: { caseId: c.id } })).toBe(1);
    const runs = await prisma.agentRun.findMany({ where: { caseId: c.id }, include: { toolExecutions: true } });
    expect(runs).toHaveLength(3);
    for (const r of runs) for (const t of r.toolExecutions) expect(t.toolName).toMatch(/^(get_|compare_|create_internal_verification_task|prepare_review_summary)/);
  });

  it('stops safely and asks for analysis when there is none', async () => {
    const o = await mkOrg();
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT' });
    const r = await runAgent(o.preparer, o.org.id, c.id);
    expect(r.status).toBe('STOPPED');
    expect(r.stopReason).toBe('ANALYSIS_REQUIRED');
    expect((await rev(c.id)).status).toBe('DRAFT');
  });

  it('respects the tool-call limit and preserves completed work', async () => {
    const o = await mkOrg();
    await prisma.platformSetting.upsert({ where: { key: 'agent_max_tool_calls' }, create: { key: 'agent_max_tool_calls', value: '7' }, update: { value: '7' } });
    try {
      const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'BANK_ACCOUNT_CHANGE' });
      await addPastedSource(o.preparer, o.org.id, c.id, { text: CHANGE_REQUEST });
      await runAnalysis(o.preparer, o.org.id, c.id);
      const r = await runAgent(o.preparer, o.org.id, c.id);
      expect(r.status).toBe('STOPPED');
      expect(r.stopReason).toBe('TOOL_CALL_LIMIT');
      expect(await prisma.toolExecution.count({ where: { agentRunId: r.runId } })).toBe(7);
      expect(await prisma.verificationTask.count({ where: { caseId: c.id } })).toBe(1);
    } finally {
      await prisma.platformSetting.delete({ where: { key: 'agent_max_tool_calls' } });
    }
  });

  it('creates an "establish channel" requirement, not a call task, when no reference channel exists', async () => {
    const o = await mkOrg();
    await updateSupplier(o.admin, o.org.id, o.supplier.id, { name: 'Gulf Supplies Co.', expectedBeneficiaryName: 'Gulf Supplies Co. LLC', referenceIban: o.refIban, recordedEmail: null, recordedPhone: null, usualCurrency: 'AED' }, 'Contact details withdrawn');
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'BANK_ACCOUNT_CHANGE' });
    await addPastedSource(o.preparer, o.org.id, c.id, { text: CHANGE_REQUEST });
    await runAnalysis(o.preparer, o.org.id, c.id);
    await runAgent(o.preparer, o.org.id, c.id);
    const t = await prisma.verificationTask.findFirstOrThrow({ where: { caseId: c.id } });
    expect(t.taskType).toBe('ESTABLISH_INDEPENDENT_CHANNEL');
    expect(await code(recordVerification(o.preparer, o.org.id, c.id, t.id, { channel: 'OTHER_ESTABLISHED', channelSource: 'The request email', outcome: 'CONFIRMED', requirementChecked: 'Called them', attestIndependent: true, expectedRevision: (await rev(c.id)).revision }))).toBe('BLOCKED');
  });
});

describe('Review controls', () => {
  it('account changes require a separate reviewer and a confirmed verification', async () => {
    const ok = await preparedChangeCase('CONFIRMED');
    const k = await rev(ok.caseId);
    // Creator cannot decide, even holding the reviewer role.
    const m = await prisma.membership.findFirstOrThrow({ where: { orgId: ok.org.id, userId: ok.preparer.id } });
    await prisma.membership.update({ where: { id: m.id }, data: { roles: 'PREPARER,REVIEWER' } });
    expect(await code(recordDecision(ok.preparer, ok.org.id, ok.caseId, { decision: 'APPROVED', rationale: 'Looks fine to me after checking.', expectedRevision: k.revision, caseInputVersionId: k.currentInputVersionId! }))).toBe('FORBIDDEN');
    // A different reviewer can approve.
    await recordDecision(ok.reviewer, ok.org.id, ok.caseId, { decision: 'APPROVED', rationale: 'Supplier confirmed the change on the reference phone.', expectedRevision: k.revision, caseInputVersionId: k.currentInputVersionId! });
    expect((await rev(ok.caseId)).status).toBe('CLOSED_APPROVED');

    const bad = await preparedChangeCase('NOT_CONFIRMED');
    const kb = await rev(bad.caseId);
    expect(await code(recordDecision(bad.reviewer, bad.org.id, bad.caseId, { decision: 'APPROVED', rationale: 'Approving despite no confirmation here.', expectedRevision: kb.revision, caseInputVersionId: kb.currentInputVersionId! }))).toBe('BLOCKED');
    await recordDecision(bad.reviewer, bad.org.id, bad.caseId, { decision: 'REJECTED', rationale: 'Supplier did not confirm the change request.', expectedRevision: kb.revision, caseInputVersionId: kb.currentInputVersionId! });
    expect((await rev(bad.caseId)).status).toBe('CLOSED_REJECTED');
  });

  it('new beneficiaries require verification before submission', async () => {
    const o = await mkOrg();
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'NEW_BENEFICIARY' });
    await addPastedSource(o.preparer, o.org.id, c.id, { text: CHANGE_REQUEST });
    await runAnalysis(o.preparer, o.org.id, c.id);
    expect(await code(submitForReview(o.preparer, o.org.id, c.id, (await rev(c.id)).revision))).toBe('BLOCKED');
    await runAgent(o.preparer, o.org.id, c.id);
    expect(await code(submitForReview(o.preparer, o.org.id, c.id, (await rev(c.id)).revision))).toBe('BLOCKED');
  });

  it('a matching invoice can be approved without a verification task, by someone else', async () => {
    const o = await mkOrg();
    const c = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT', expectedAmount: '45,000.00' });
    await addPastedSource(o.preparer, o.org.id, c.id, { text: MATCHING_INVOICE(o.refIban) });
    await runAnalysis(o.preparer, o.org.id, c.id);
    expect(await code(submitForReview(o.preparer, o.org.id, c.id, (await rev(c.id)).revision))).toBe('BLOCKED'); // agent not run yet
    await runAgent(o.preparer, o.org.id, c.id);
    expect(await prisma.verificationTask.count({ where: { caseId: c.id } })).toBe(0);
    await submitForReview(o.preparer, o.org.id, c.id, (await rev(c.id)).revision);
    const k = await rev(c.id);
    await recordDecision(o.reviewer, o.org.id, c.id, { decision: 'APPROVED', rationale: 'All compared details match the reference record.', expectedRevision: k.revision, caseInputVersionId: k.currentInputVersionId! });
    expect((await rev(c.id)).status).toBe('CLOSED_APPROVED');
  });

  it('stale approvals are rejected', async () => {
    const o = await preparedChangeCase('CONFIRMED');
    const stale = await rev(o.caseId);
    await withdrawFromReview(o.preparer, o.org.id, o.caseId, stale.revision);
    await submitForReview(o.preparer, o.org.id, o.caseId, (await rev(o.caseId)).revision);
    expect(await code(recordDecision(o.reviewer, o.org.id, o.caseId, { decision: 'APPROVED', rationale: 'Approving what I saw earlier today.', expectedRevision: stale.revision, caseInputVersionId: stale.currentInputVersionId! }))).toBe('STALE_VERSION');
  });

  it('returning keeps evidence; resubmission works', async () => {
    const o = await preparedChangeCase('CONFIRMED');
    const k = await rev(o.caseId);
    await recordDecision(o.reviewer, o.org.id, o.caseId, { decision: 'RETURNED', rationale: 'Attach the signed letter please.', expectedRevision: k.revision, caseInputVersionId: k.currentInputVersionId! });
    expect((await rev(o.caseId)).status).toBe('NEEDS_INFORMATION');
    expect(await prisma.sourceDocument.count({ where: { caseId: o.caseId } })).toBe(1);
    expect(await prisma.verificationResult.count({ where: { caseId: o.caseId } })).toBe(1);
    await submitForReview(o.preparer, o.org.id, o.caseId, (await rev(o.caseId)).revision);
    expect((await rev(o.caseId)).status).toBe('READY_FOR_REVIEW');
  });

  it('supplier changes create a new case version that invalidates earlier analysis, verification and review', async () => {
    const o = await preparedChangeCase('CONFIRMED');
    const before = await rev(o.caseId);
    await updateSupplier(o.admin, o.org.id, o.supplier.id, { name: 'Gulf Supplies Co.', expectedBeneficiaryName: 'Gulf Supplies Co. LLC', referenceIban: o.refIban, recordedEmail: 'finance@gulfsupplies.example', recordedPhone: '+971 4 555 9999', usualCurrency: 'AED' }, 'New phone from signed addendum');
    await applySupplierUpdate(o.preparer, o.org.id, o.caseId, before.revision);
    const after = await rev(o.caseId);
    expect(after.status).toBe('DRAFT');
    expect(after.currentInputVersionId).not.toBe(before.currentInputVersionId);
    const reqs = await getRequirements(o.caseId, o.org.id);
    expect(reqs.find((r) => r.key === 'ANALYSIS')?.met).toBe(false);
    // A reviewer holding the old version cannot decide.
    expect(await code(recordDecision(o.reviewer, o.org.id, o.caseId, { decision: 'APPROVED', rationale: 'Approving the earlier evidence version.', expectedRevision: before.revision, caseInputVersionId: before.currentInputVersionId! }))).toBe('BLOCKED');
  });

  it('closed cases reopen into a new version and keep their decision', async () => {
    const o = await preparedChangeCase('CONFIRMED');
    const k = await rev(o.caseId);
    await recordDecision(o.reviewer, o.org.id, o.caseId, { decision: 'REJECTED', rationale: 'Rejected pending a fresh confirmation letter.', expectedRevision: k.revision, caseInputVersionId: k.currentInputVersionId! });
    expect(await code(addPastedSource(o.preparer, o.org.id, o.caseId, { text: 'Additional evidence text here please.' }))).toBe('BLOCKED');
    await reopenCase(o.preparer, o.org.id, o.caseId, 'Supplier sent the signed letter', (await rev(o.caseId)).revision);
    const after = await rev(o.caseId);
    expect(after.status).toBe('DRAFT');
    expect(await prisma.review.count({ where: { caseId: o.caseId } })).toBe(1);
    expect(await prisma.caseInputVersion.count({ where: { caseId: o.caseId } })).toBe(2);
  });

  it('every state change is audited', async () => {
    const o = await preparedChangeCase('CONFIRMED');
    const actions = (await prisma.auditEvent.findMany({ where: { orgId: o.org.id } })).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['case.created', 'source.added', 'analysis.completed', 'verification_task.created', 'agent.completed', 'verification.recorded', 'case.status_changed']));
  });
});

describe('Demo isolation and no external actions', () => {
  it('demo mode code never touches the database or the API', () => {
    const demo = readFileSync('components/demo/demo-app.tsx', 'utf8') + readFileSync('lib/demo-data.ts', 'utf8') + readFileSync('app/demo/page.tsx', 'utf8');
    expect(demo).not.toMatch(/@\/lib\/db|prisma|fetch\(|\/api\//);
  });
  it('services contain no transfer, payment or messaging integrations', () => {
    const files = ['agent', 'analysis', 'cases', 'review', 'verification', 'suppliers', 'orgs'].map((f) => readFileSync(`lib/services/${f}.ts`, 'utf8')).join('\n');
    expect(files).not.toMatch(/\bfetch\(|nodemailer|twilio|smtp|whatsapp|bank[_-]?api/i);
  });
});

describe('Retention', () => {
  it('purges evidence content of long-closed cases but keeps decisions and audit', async () => {
    const { purgeExpiredEvidence } = await import('@/lib/services/retention');
    const o = await preparedChangeCase('CONFIRMED');
    const k = await rev(o.caseId);
    await recordDecision(o.reviewer, o.org.id, o.caseId, { decision: 'APPROVED', rationale: 'Supplier confirmed via the reference phone.', expectedRevision: k.revision, caseInputVersionId: k.currentInputVersionId! });
    await prisma.case.update({ where: { id: o.caseId }, data: { closedAt: new Date(Date.now() - 400 * 86400_000) } });
    const r = await purgeExpiredEvidence();
    expect(r.purged).toBeGreaterThanOrEqual(1);
    const doc = await prisma.sourceDocument.findFirstOrThrow({ where: { caseId: o.caseId } });
    expect(doc.rawText).toBeNull();
    expect(doc.extractionError).toMatch(/retention policy/);
    expect(await prisma.review.count({ where: { caseId: o.caseId } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { orgId: o.org.id, action: 'retention.evidence_purged' } })).toBe(1);
  });
});

describe('Case numbers', () => {
  it('are unique per organization, so organizations with similar names never collide', async () => {
    const orgs = [await mkOrg(), await mkOrg(), await mkOrg()];
    const numbers: string[] = [];
    for (const o of orgs) {
      const a = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT' });
      const b = await createCase(o.preparer, o.org.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT' });
      expect(a.caseNumber).toMatch(/-0001$/);
      expect(b.caseNumber).toMatch(/-0002$/);
      numbers.push(a.caseNumber);
    }
    // Same prefix ("ORG") in every test organization, and every first case is still 0001.
    expect(new Set(numbers).size).toBe(1);
  });
});

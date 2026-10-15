// The bounded preparation agent.
// Task: "Prepare this case for human review using available evidence, identify unmet requirements,
// create necessary internal verification tasks, and stop when human input is required."
//
// Orchestration is a fixed, auditable policy over seven allow-listed tools. It has no tool that can
// approve, close, edit supplier details, record verification outcomes, message anyone or move money.
// Identity and organization are injected by the server; tool inputs only name the case and version.

import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { getSettings } from '@/lib/settings';
import { REQUEST_TYPE_LABELS, TASK_TYPE_LABELS, isEditable, type ExtractedFields, type RequestType } from '@/lib/constants';
import { maskAccount } from '@/lib/iban';
import { runRules, type SupplierSnapshot } from '@/lib/analysis/rules';
import { loadCase, requireRole, type Actor } from './access';
import { transitionCase } from './workflow';
import { getRequirements, verificationRequired } from './requirements';

export const AGENT_TOOLS = [
  'get_case_context',
  'get_supplier_snapshot',
  'get_extracted_evidence',
  'compare_payment_details',
  'get_missing_requirements',
  'create_internal_verification_task',
  'prepare_review_summary',
] as const;
export type AgentTool = (typeof AGENT_TOOLS)[number];

const baseInput = z.object({ caseId: z.string().min(1), caseInputVersionId: z.string().min(1) }).strict();
const taskInput = baseInput
  .extend({ taskType: z.enum(['CALL_REFERENCE_PHONE', 'EMAIL_REFERENCE_ADDRESS', 'CONFIRM_INVOICE_DETAILS', 'ESTABLISH_INDEPENDENT_CHANNEL']) })
  .strict();

const INPUT_SCHEMAS: Record<AgentTool, z.ZodTypeAny> = {
  get_case_context: baseInput,
  get_supplier_snapshot: baseInput,
  get_extracted_evidence: baseInput,
  compare_payment_details: baseInput,
  get_missing_requirements: baseInput,
  create_internal_verification_task: taskInput,
  prepare_review_summary: baseInput,
};

type RunCtx = { actor: Actor; orgId: string; runId: string; seq: number; deadline: number; maxCalls: number };

class AgentStop extends Error {
  constructor(public reason: string, public waitingFor: string) {
    super(reason);
  }
}

/** Executes one tool with validation, authorization, version check and an execution record. */
async function execTool(ctx: RunCtx, tool: AgentTool, rawInput: unknown): Promise<any> {
  if (ctx.seq >= ctx.maxCalls) throw new AgentStop('TOOL_CALL_LIMIT', `The run stopped at its limit of ${ctx.maxCalls} tool calls. Run the agent again to continue.`);
  if (Date.now() > ctx.deadline) throw new AgentStop('TIME_LIMIT', 'The run reached its time limit. Run the agent again to continue.');
  ctx.seq++;
  const started = Date.now();
  const record = (status: 'SUCCESS' | 'REJECTED' | 'ERROR', output: Prisma.InputJsonValue, relatedRecordId?: string | null, idempotencyRef?: string | null) =>
    prisma.toolExecution.create({
      data: { agentRunId: ctx.runId, orgId: ctx.orgId, sequence: ctx.seq, toolName: tool, input: sanitizeInput(rawInput), output, status, relatedRecordId: relatedRecordId ?? null, idempotencyRef: idempotencyRef ?? null, durationMs: Date.now() - started },
    });

  if (!(AGENT_TOOLS as readonly string[]).includes(tool)) {
    await record('REJECTED', { error: 'Tool is not on the allow-list.' });
    throw new AgentStop('TOOL_REJECTED', 'A tool outside the allow-list was requested.');
  }
  const parsed = INPUT_SCHEMAS[tool].safeParse(rawInput);
  if (!parsed.success) {
    await record('REJECTED', { error: 'Invalid tool input.' });
    throw new AgentStop('TOOL_REJECTED', 'A tool received invalid input.');
  }
  const input = parsed.data as z.infer<typeof taskInput>;
  // Authorization is re-checked for every tool call with the server-side identity.
  await requireRole(ctx.actor, ctx.orgId, 'PREPARER');
  const c = await loadCase(ctx.orgId, input.caseId);
  if (c.currentInputVersionId !== input.caseInputVersionId) {
    await record('REJECTED', { error: 'Stale case version.' });
    throw new AgentStop('STALE_VERSION', 'The case moved to a new version during the run. Run the agent again.');
  }
  try {
    const { output, relatedRecordId, idempotencyRef } = await TOOL_IMPL[tool](ctx, c, input);
    await record('SUCCESS', output, relatedRecordId, idempotencyRef);
    return output;
  } catch (e: any) {
    if (e instanceof AgentStop) throw e;
    await record('ERROR', { error: e instanceof AppError ? e.message : 'Tool failed.' });
    throw e;
  }
}

function sanitizeInput(v: unknown): Prisma.InputJsonValue {
  try {
    return JSON.parse(JSON.stringify(v ?? {}));
  } catch {
    return {};
  }
}

type CaseRow = Awaited<ReturnType<typeof loadCase>>;
type ToolResult = { output: Prisma.InputJsonValue; relatedRecordId?: string | null; idempotencyRef?: string | null };

async function currentAnalysis(c: CaseRow) {
  return prisma.analysis.findFirst({ where: { caseId: c.id, orgId: c.orgId, caseInputVersionId: c.currentInputVersionId!, status: 'COMPLETED' }, orderBy: { createdAt: 'desc' }, include: { findings: true } });
}
async function snapshot(c: CaseRow) {
  const v = await prisma.caseInputVersion.findFirstOrThrow({ where: { id: c.currentInputVersionId!, caseId: c.id } });
  return { version: v, supplier: v.supplierSnapshot as unknown as SupplierSnapshot };
}

const TOOL_IMPL: Record<AgentTool, (ctx: RunCtx, c: CaseRow, input: any) => Promise<ToolResult>> = {
  async get_case_context(_ctx, c) {
    const v = await prisma.caseInputVersion.findFirstOrThrow({ where: { id: c.currentInputVersionId! } });
    const sources = await prisma.sourceDocument.groupBy({ by: ['extractionStatus'], where: { caseId: c.id, orgId: c.orgId }, _count: true });
    return {
      output: {
        caseNumber: c.caseNumber,
        requestType: c.requestType,
        status: c.status,
        inputVersion: v.versionNumber,
        sources: Object.fromEntries(sources.map((s) => [s.extractionStatus, s._count])),
      },
    };
  },

  async get_supplier_snapshot(_ctx, c) {
    const { version, supplier } = await snapshot(c);
    return {
      output: {
        supplierVersion: version.supplierVersionNumber,
        name: supplier.name,
        hasExpectedBeneficiary: !!supplier.expectedBeneficiaryName,
        referenceAccount: maskAccount(supplier.referenceIban ?? supplier.referenceBankAccount),
        hasReferencePhone: !!supplier.recordedPhone,
        hasReferenceEmail: !!supplier.recordedEmail,
        reviewStatus: supplier.reviewStatus ?? 'UNKNOWN',
      },
    };
  },

  async get_extracted_evidence(_ctx, c) {
    const a = await currentAnalysis(c);
    if (!a) throw new AgentStop('ANALYSIS_REQUIRED', 'A completed analysis of the current evidence version. Run analysis, then run the agent again.');
    const latestSource = await prisma.sourceDocument.findFirst({ where: { caseId: c.id, orgId: c.orgId, extractionStatus: 'COMPLETED' }, orderBy: { createdAt: 'desc' } });
    if (latestSource && latestSource.createdAt > a.createdAt) throw new AgentStop('ANALYSIS_STALE', 'A new source was added after the last analysis. Run analysis again, then run the agent.');
    const f = (a.effectiveFields ?? a.extractedFields ?? {}) as ExtractedFields;
    return {
      output: {
        analysisId: a.id,
        provider: a.provider,
        fieldsPresent: Object.entries(f).filter(([, v]) => !!v).map(([k]) => k),
        aiIndicators: a.findings.filter((x) => x.source === 'AI' && x.category !== 'missing_information').map((x) => x.category),
        rejectedCitations: a.rejectedCitations,
      },
      relatedRecordId: a.id,
    };
  },

  async compare_payment_details(_ctx, c) {
    const a = await currentAnalysis(c);
    if (!a) throw new AgentStop('ANALYSIS_REQUIRED', 'A completed analysis of the current evidence version.');
    const { supplier } = await snapshot(c);
    const rules = runRules({ requestType: c.requestType, detectedRequestType: a.detectedRequestType, fields: (a.effectiveFields ?? a.extractedFields ?? {}) as ExtractedFields, supplier, expectedAmount: c.expectedAmount, expectedCurrency: c.expectedCurrency });
    return { output: { results: rules.map((r) => ({ rule: r.ruleId, category: r.category, severity: r.severity })) } };
  },

  async get_missing_requirements(_ctx, c) {
    const reqs = await getRequirements(c.id, c.orgId);
    return { output: { unmet: reqs.filter((r) => !r.met).map((r) => ({ key: r.key, blocks: r.blocks })) } };
  },

  async create_internal_verification_task(ctx, c, input: z.infer<typeof taskInput>) {
    // Business-rule validation of the requested task — the agent cannot create arbitrary work.
    const { supplier, version } = await snapshot(c);
    const a = await currentAnalysis(c);
    const need = verificationRequired(c.requestType, a?.findings ?? []);
    if (!need.required) throw new AppError('BLOCKED', 'Verification is not required for this case.');
    const allowed = supplier.recordedPhone ? (c.requestType === 'INVOICE_PAYMENT' ? 'CONFIRM_INVOICE_DETAILS' : 'CALL_REFERENCE_PHONE') : supplier.recordedEmail ? (c.requestType === 'INVOICE_PAYMENT' ? 'CONFIRM_INVOICE_DETAILS' : 'EMAIL_REFERENCE_ADDRESS') : 'ESTABLISH_INDEPENDENT_CHANNEL';
    if (input.taskType !== allowed) throw new AppError('BLOCKED', `Task type ${input.taskType} is not permitted for this case.`);

    const key = `${version.id}:${input.taskType}`;
    const existing = await prisma.verificationTask.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { output: { created: false, taskId: existing.id, reason: 'Task already exists for this version (idempotent).' }, relatedRecordId: existing.id, idempotencyRef: key };

    const channel =
      allowed === 'ESTABLISH_INDEPENDENT_CHANNEL'
        ? null
        : supplier.recordedPhone
          ? { label: `Phone ${supplier.recordedPhone}`, source: `Supplier reference v${version.supplierVersionNumber} — recorded phone${supplier.referenceSource ? ` (${supplier.referenceSource})` : ''}` }
          : { label: `Email ${supplier.recordedEmail}`, source: `Supplier reference v${version.supplierVersionNumber} — recorded email${supplier.referenceSource ? ` (${supplier.referenceSource})` : ''}` };

    const typeLabel = REQUEST_TYPE_LABELS[c.requestType as RequestType].toLowerCase();
    const requirement =
      allowed === 'ESTABLISH_INDEPENDENT_CHANNEL'
        ? 'An independent contact channel must be sourced from an approved record before verification can happen.'
        : c.requestType === 'INVOICE_PAYMENT'
          ? 'Confirm with the supplier that this invoice, its amount and the receiving account are genuine.'
          : `Confirm with the supplier that they requested this ${typeLabel} and that the submitted account details are theirs.`;
    const description =
      allowed === 'ESTABLISH_INDEPENDENT_CHANNEL'
        ? 'The supplier reference has no recorded phone or email. Do not use contact details from the request. An administrator must add a channel from an approved source (for example the signed supplier agreement), then apply the updated reference to this case.'
        : `${TASK_TYPE_LABELS[allowed]}. Use only the reference channel below — never a phone number, email or link contained in the request.`;

    try {
      const t = await prisma.verificationTask.create({
        data: { caseId: c.id, orgId: c.orgId, caseInputVersionId: version.id, taskType: allowed, requirement, description, suggestedChannel: channel?.label ?? null, channelSource: channel?.source ?? null, idempotencyKey: key, agentRunId: ctx.runId },
      });
      await audit({ orgId: c.orgId, actor: ctx.actor, action: 'verification_task.created', entityType: 'verificationTask', entityId: t.id, changedFields: { taskType: allowed, by: 'agent' }, caseInputVersionId: version.id, agentRunId: ctx.runId });
      return { output: { created: true, taskId: t.id, taskType: allowed }, relatedRecordId: t.id, idempotencyRef: key };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const t = await prisma.verificationTask.findUniqueOrThrow({ where: { idempotencyKey: key } });
        return { output: { created: false, taskId: t.id, reason: 'Created concurrently (idempotent).' }, relatedRecordId: t.id, idempotencyRef: key };
      }
      throw e;
    }
  },

  async prepare_review_summary(_ctx, c) {
    const a = await currentAnalysis(c);
    const reqs = await getRequirements(c.id, c.orgId);
    const tasks = await prisma.verificationTask.findMany({ where: { caseId: c.id, orgId: c.orgId, caseInputVersionId: c.currentInputVersionId!, status: { not: 'SUPERSEDED' } }, include: { results: true } });
    const findings = a?.findings ?? [];
    const sig = findings.filter((f) => f.severity === 'critical' || f.severity === 'warning');
    const lines: string[] = [];
    lines.push(`${REQUEST_TYPE_LABELS[c.requestType as RequestType]} — ${a?.summary ?? 'no analysis summary.'}`);
    lines.push(sig.length ? `${sig.length} significant finding${sig.length > 1 ? 's' : ''}: ${[...new Set(sig.map((f) => f.category.replace(/_/g, ' ')))].join(', ')}.` : 'No significant discrepancies were found by the rules or language analysis. This does not prove the request is authentic.');
    const done = tasks.filter((t) => t.status === 'COMPLETED');
    if (tasks.length) lines.push(`Independent verification: ${done.length} of ${tasks.length} task${tasks.length > 1 ? 's' : ''} recorded${done.length ? ` (${done.flatMap((t) => t.results.map((r) => r.outcome.toLowerCase().replace(/_/g, ' '))).join(', ')})` : ''}.`);
    const unmet = reqs.filter((r) => !r.met && r.key !== 'AGENT');
    lines.push(unmet.length ? `Outstanding: ${unmet.map((r) => r.label.toLowerCase()).join('; ')}.` : 'All recorded requirements are met; a reviewer other than the creator must decide.');
    const summary = lines.join(' ');
    return { output: { summary } };
  },
};

/** Runs the policy. Stops safely on limits or failure, preserving completed tool executions. */
export async function runAgent(actor: Actor, orgId: string, caseId: string) {
  await requireRole(actor, orgId, 'PREPARER');
  const c0 = await loadCase(orgId, caseId);
  if (!isEditable(c0.status)) throw new AppError('BLOCKED', c0.status === 'READY_FOR_REVIEW' ? 'The case is waiting for review. Withdraw it before running the agent.' : 'This case is closed. Reopen it into a new version first.');
  const s = await getSettings();
  const running = await prisma.agentRun.findFirst({ where: { caseId, orgId, status: 'RUNNING', startedAt: { gte: new Date(Date.now() - s.agent_timeout_seconds * 1000) } } });
  if (running) throw new AppError('CONFLICT', 'The agent is already running on this case.');

  const run = await prisma.agentRun.create({ data: { caseId, orgId, caseInputVersionId: c0.currentInputVersionId!, initiatedBy: actor.id, status: 'RUNNING' } });
  const ctx: RunCtx = { actor, orgId, runId: run.id, seq: 0, deadline: Date.now() + s.agent_timeout_seconds * 1000, maxCalls: s.agent_max_tool_calls };
  const base = { caseId, caseInputVersionId: c0.currentInputVersionId! };
  let status: 'COMPLETED' | 'STOPPED' | 'FAILED' = 'COMPLETED';
  let stopReason: string | null = null;
  let waitingFor: string | null = null;
  let summary: string | null = null;

  try {
    await execTool(ctx, 'get_case_context', base);
    const supplier = await execTool(ctx, 'get_supplier_snapshot', base);
    await execTool(ctx, 'get_extracted_evidence', base);
    await execTool(ctx, 'compare_payment_details', base);
    const before = await execTool(ctx, 'get_missing_requirements', base);
    const needsTask = (before.unmet as { key: string }[]).some((u) => u.key === 'VERIFICATION_RECORDED');
    const c = await loadCase(orgId, caseId);
    const existing = await prisma.verificationTask.count({ where: { caseId, orgId, caseInputVersionId: c.currentInputVersionId!, status: { not: 'SUPERSEDED' } } });
    if (needsTask && existing === 0) {
      const taskType = supplier.hasReferencePhone || supplier.hasReferenceEmail ? (c.requestType === 'INVOICE_PAYMENT' ? 'CONFIRM_INVOICE_DETAILS' : supplier.hasReferencePhone ? 'CALL_REFERENCE_PHONE' : 'EMAIL_REFERENCE_ADDRESS') : 'ESTABLISH_INDEPENDENT_CHANNEL';
      await execTool(ctx, 'create_internal_verification_task', { ...base, taskType });
    }
    const after = await execTool(ctx, 'get_missing_requirements', base);
    const r = await execTool(ctx, 'prepare_review_summary', base);
    summary = r.summary;

    const unmet = (after.unmet as { key: string; blocks: string }[]).filter((u) => u.blocks === 'submit' && u.key !== 'AGENT');
    const openVerification = unmet.some((u) => u.key === 'VERIFICATION_RECORDED');
    waitingFor = openVerification ? 'A person to complete independent verification through the reference channel and record the outcome.' : unmet.length ? 'A person to resolve the outstanding requirements listed below.' : 'The preparer to submit the case for review.';

    const fresh = await loadCase(orgId, caseId);
    const target = openVerification ? 'INDEPENDENT_CHECK_REQUIRED' : 'ANALYZED';
    await prisma.$transaction(async (tx) => {
      await tx.agentRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', waitingFor, summary, toolCallCount: ctx.seq, endedAt: new Date() } });
      if (fresh.status !== target && ['ANALYZED', 'INDEPENDENT_CHECK_REQUIRED', 'NEEDS_INFORMATION'].includes(fresh.status)) {
        await transitionCase(tx, { caseId, orgId, from: fresh.status, to: target, actor, reason: 'Preparation agent reassessed readiness', versionId: fresh.currentInputVersionId, agentRunId: run.id });
      } else {
        await tx.case.update({ where: { id: caseId }, data: { revision: { increment: 1 } } });
      }
    });
  } catch (e: any) {
    if (e instanceof AgentStop) {
      status = 'STOPPED';
      stopReason = e.reason;
      waitingFor = e.waitingFor;
    } else {
      status = 'FAILED';
      stopReason = e instanceof AppError ? e.message : 'An unexpected error stopped the run.';
      waitingFor = 'Review the error, then run the agent again. Completed steps were saved.';
      console.error('[agent]', run.id, e?.message);
    }
    await prisma.agentRun.update({ where: { id: run.id }, data: { status, stopReason, waitingFor, toolCallCount: ctx.seq, endedAt: new Date() } });
  }
  await audit({ orgId, actor, action: `agent.${status.toLowerCase()}`, entityType: 'agentRun', entityId: run.id, changedFields: { toolCalls: ctx.seq, stopReason }, caseInputVersionId: c0.currentInputVersionId, agentRunId: run.id });
  return { runId: run.id, status, stopReason, waitingFor, summary, toolCalls: ctx.seq };
}

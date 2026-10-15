// Readiness requirements, computed live from persisted records (never from client state).
import { prisma, type Tx } from '@/lib/db';
import { isHighRisk, type ExtractedFields } from '@/lib/constants';

export type Requirement = {
  key: string;
  label: string;
  met: boolean;
  detail: string;
  blocks: 'submit' | 'approve';
};

/** Findings that make independent verification necessary for an invoice payment. */
const DISCREPANCY_RULES = new Set(['iban_mismatch', 'account_mismatch', 'beneficiary_name_mismatch', 'amount_mismatch', 'email_domain_mismatch', 'request_type_mismatch']);
const DISCREPANCY_AI = new Set(['prompt_injection_attempt', 'bypass_procedure', 'contact_change']);

export function verificationRequired(requestType: string, findings: { source: string; category: string }[]): { required: boolean; reason: string } {
  if (isHighRisk(requestType)) return { required: true, reason: 'Bank account changes and new beneficiaries always require independent verification.' };
  const hit = findings.find((f) => (f.source === 'RULE' && DISCREPANCY_RULES.has(f.category)) || (f.source === 'AI' && DISCREPANCY_AI.has(f.category)));
  if (hit) return { required: true, reason: 'Discrepancies or risk indicators were found, so the invoice details must be confirmed independently.' };
  return { required: false, reason: 'No discrepancies were found that require independent verification for this invoice.' };
}

export function missingRequiredFields(requestType: string, f: ExtractedFields): string[] {
  const missing: string[] = [];
  if (isHighRisk(requestType)) {
    if (!f.beneficiaryName) missing.push('beneficiary name');
    if (!f.iban && !f.accountNumber) missing.push('IBAN or account number');
  } else {
    if (!f.amount) missing.push('amount');
    if (!f.beneficiaryName && !f.iban && !f.accountNumber) missing.push('beneficiary or account details');
  }
  return missing;
}

export async function getRequirements(caseId: string, orgId: string, db: Tx = prisma): Promise<Requirement[]> {
  const c = await db.case.findFirst({ where: { id: caseId, orgId } });
  if (!c) return [];
  const versionId = c.currentInputVersionId ?? '';
  const [sources, analysis, lastCorrection, tasks] = await Promise.all([
    db.sourceDocument.findMany({ where: { caseId, orgId }, select: { extractionStatus: true, createdAt: true } }),
    db.analysis.findFirst({ where: { caseId, orgId, caseInputVersionId: versionId, status: 'COMPLETED' }, orderBy: { createdAt: 'desc' }, include: { findings: { select: { source: true, category: true } } } }),
    db.fieldCorrection.findFirst({ where: { caseId, orgId, caseInputVersionId: versionId }, orderBy: { createdAt: 'desc' } }),
    db.verificationTask.findMany({ where: { caseId, orgId, caseInputVersionId: versionId, status: { not: 'SUPERSEDED' } }, include: { results: true } }),
  ]);
  const readable = sources.filter((s) => s.extractionStatus === 'COMPLETED');
  const latestSource = readable.reduce<Date | null>((m, s) => (!m || s.createdAt > m ? s.createdAt : m), null);
  const analysisCurrent = !!analysis && (!latestSource || analysis.createdAt >= latestSource);
  const reqs: Requirement[] = [];

  reqs.push({ key: 'SOURCE', label: 'Readable source evidence', met: readable.length > 0, blocks: 'submit', detail: readable.length ? `${readable.length} readable source${readable.length > 1 ? 's' : ''}.` : 'Add the request as pasted text or a text-based PDF.' });
  reqs.push({
    key: 'ANALYSIS',
    label: 'Current analysis',
    met: analysisCurrent,
    blocks: 'submit',
    detail: !analysis ? 'Run analysis on the current evidence version.' : analysisCurrent ? 'Analysis covers all readable sources.' : 'A source was added after the last analysis. Run analysis again.',
  });

  const agentAfter = [analysis?.completedAt, lastCorrection?.createdAt].filter(Boolean).reduce<Date | null>((m, d) => (!m || d! > m ? d! : m), null);
  const agentRun = analysis
    ? await db.agentRun.findFirst({ where: { caseId, orgId, caseInputVersionId: versionId, status: 'COMPLETED', ...(agentAfter ? { startedAt: { gte: agentAfter } } : {}) }, orderBy: { startedAt: 'desc' } })
    : null;
  reqs.push({ key: 'AGENT', label: 'Preparation agent run', met: !!agentRun, blocks: 'submit', detail: agentRun ? 'The agent prepared this version for review.' : 'Run the preparation agent after the latest analysis or correction.' });

  const vr = verificationRequired(c.requestType, analysis?.findings ?? []);
  const open = tasks.filter((t) => t.status === 'OPEN');
  if (vr.required) {
    const establish = open.find((t) => t.taskType === 'ESTABLISH_INDEPENDENT_CHANNEL');
    reqs.push({
      key: 'VERIFICATION_RECORDED',
      label: 'Independent verification recorded',
      met: tasks.length > 0 && open.length === 0,
      blocks: 'submit',
      detail: establish
        ? 'No established contact channel exists. An administrator must add one to the supplier reference from an approved source, then apply the update to this case.'
        : tasks.length === 0
          ? 'Run the preparation agent to create the verification task.'
          : open.length
            ? `${open.length} verification task${open.length > 1 ? 's are' : ' is'} still open.`
            : 'All verification tasks have a recorded outcome.',
    });
    const confirmed = tasks.some((t) => t.status === 'COMPLETED' && t.results.some((r) => r.outcome === 'CONFIRMED'));
    reqs.push({ key: 'VERIFICATION_CONFIRMED', label: 'Supplier confirmed through a reference channel', met: confirmed, blocks: 'approve', detail: confirmed ? 'A person recorded a confirmed outcome.' : 'Approval requires a recorded outcome of “confirmed”. ' + vr.reason });
  }

  const fields = ((analysis?.effectiveFields ?? analysis?.extractedFields) ?? {}) as ExtractedFields;
  const missing = analysis ? missingRequiredFields(c.requestType, fields) : [];
  reqs.push({ key: 'REQUIRED_FIELDS', label: 'Required details present', met: !!analysis && missing.length === 0, blocks: 'approve', detail: !analysis ? 'Available after analysis.' : missing.length ? `Missing: ${missing.join(', ')}.` : 'All required details are present.' });

  return reqs;
}

export const blockers = (reqs: Requirement[], stage: 'submit' | 'approve') =>
  reqs.filter((r) => !r.met && (stage === 'approve' || r.blocks === 'submit'));

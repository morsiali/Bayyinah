import { route, readJson } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { requireUser } from '@/lib/auth/session';
import { addPastedSource, addPdfSource, applySupplierUpdate, reopenCase, submitForReview, withdrawFromReview } from '@/lib/services/cases';
import { correctField, runAnalysis } from '@/lib/services/analysis';
import { runAgent } from '@/lib/services/agent';
import { recordVerification } from '@/lib/services/verification';
import { recordDecision } from '@/lib/services/review';

export const maxDuration = 120;

type P = { orgId: string; caseId: string; action: string };

async function fileFrom(form: FormData, name: string) {
  const f = form.get(name);
  if (!f || typeof f === 'string') return null;
  return { name: (f as File).name || 'file', bytes: Buffer.from(await (f as File).arrayBuffer()) };
}

export const POST = route<P>(async (req, { orgId, caseId, action }) => {
  const actor = await requireUser();
  switch (action) {
    case 'source': {
      const doc = await addPastedSource(actor, orgId, caseId, await readJson(req));
      return { id: doc.id };
    }
    case 'upload': {
      const form = await req.formData().catch(() => null);
      const file = form ? await fileFrom(form, 'file') : null;
      if (!file) throw new AppError('VALIDATION', 'Choose a PDF file to upload.');
      const doc = await addPdfSource(actor, orgId, caseId, file);
      return { id: doc.id, extractionStatus: doc.extractionStatus, extractionError: doc.extractionError };
    }
    case 'analyze':
      return runAnalysis(actor, orgId, caseId);
    case 'correct':
      return correctField(actor, orgId, caseId, await readJson(req));
    case 'agent':
      return runAgent(actor, orgId, caseId);
    case 'verify': {
      const form = await req.formData().catch(() => null);
      if (!form) throw new AppError('VALIDATION', 'Invalid form submission.');
      const taskId = String(form.get('taskId') ?? '');
      const r = await recordVerification(
        actor,
        orgId,
        caseId,
        taskId,
        {
          channel: String(form.get('channel') ?? '') as any,
          channelSource: String(form.get('channelSource') ?? ''),
          outcome: String(form.get('outcome') ?? '') as any,
          requirementChecked: String(form.get('requirementChecked') ?? ''),
          notes: String(form.get('notes') ?? ''),
          attestIndependent: form.get('attestIndependent') === 'true' ? true : (false as any),
          expectedRevision: Number(form.get('expectedRevision')),
        },
        await fileFrom(form, 'attachment'),
      );
      return { id: r.id };
    }
    case 'submit': {
      const b = await readJson(req);
      await submitForReview(actor, orgId, caseId, Number(b?.expectedRevision), b?.note ?? null);
      return { ok: true };
    }
    case 'withdraw': {
      const b = await readJson(req);
      await withdrawFromReview(actor, orgId, caseId, Number(b?.expectedRevision));
      return { ok: true };
    }
    case 'reopen': {
      const b = await readJson(req);
      await reopenCase(actor, orgId, caseId, String(b?.reason ?? ''), Number(b?.expectedRevision));
      return { ok: true };
    }
    case 'apply-reference': {
      const b = await readJson(req);
      await applySupplierUpdate(actor, orgId, caseId, Number(b?.expectedRevision));
      return { ok: true };
    }
    case 'decision': {
      const b = await readJson(req);
      const r = await recordDecision(actor, orgId, caseId, { decision: b?.decision, rationale: String(b?.rationale ?? ''), expectedRevision: Number(b?.expectedRevision), caseInputVersionId: String(b?.caseInputVersionId ?? '') });
      return { id: r.id };
    }
    default:
      throw new AppError('NOT_FOUND', 'Unknown action.');
  }
});

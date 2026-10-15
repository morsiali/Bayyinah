import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { updateSupplier } from '@/lib/services/suppliers';

export const PATCH = route<{ orgId: string; id: string }>(async (req, { orgId, id }) => {
  const actor = await requireUser();
  const body = await readJson(req);
  const { reason, ...fields } = body ?? {};
  const r = await updateSupplier(actor, orgId, id, fields, String(reason ?? ''));
  return { ok: true, version: r.supplier.currentVersion, openCasesAffected: r.openCasesAffected };
});

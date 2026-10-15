import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { createSupplier } from '@/lib/services/suppliers';

export const POST = route<{ orgId: string }>(async (req, { orgId }) => {
  const actor = await requireUser();
  const s = await createSupplier(actor, orgId, await readJson(req));
  return { id: s.id };
});

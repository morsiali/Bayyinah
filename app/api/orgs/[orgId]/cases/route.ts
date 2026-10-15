import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { createCase } from '@/lib/services/cases';

export const POST = route<{ orgId: string }>(async (req, { orgId }) => {
  const actor = await requireUser();
  return createCase(actor, orgId, await readJson(req));
});

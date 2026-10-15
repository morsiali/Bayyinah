import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { updateOrganization } from '@/lib/services/orgs';

export const PATCH = route<{ orgId: string }>(async (req, { orgId }) => {
  const actor = await requireUser();
  await updateOrganization(actor, orgId, await readJson(req));
  return { ok: true };
});

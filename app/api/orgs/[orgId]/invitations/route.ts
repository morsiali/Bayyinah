import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { createInvitation } from '@/lib/services/orgs';

export const POST = route<{ orgId: string }>(async (req, { orgId }) => {
  const actor = await requireUser();
  return createInvitation(actor, orgId, await readJson(req));
});

import { route } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { revokeInvitation } from '@/lib/services/orgs';

export const DELETE = route<{ orgId: string; id: string }>(async (_req, { orgId, id }) => {
  const actor = await requireUser();
  await revokeInvitation(actor, orgId, id);
  return { ok: true };
});

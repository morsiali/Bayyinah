import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { changeMemberRoles, removeMember } from '@/lib/services/orgs';

export const PATCH = route<{ orgId: string; id: string }>(async (req, { orgId, id }) => {
  const actor = await requireUser();
  const body = await readJson(req);
  await changeMemberRoles(actor, orgId, id, Array.isArray(body?.roles) ? body.roles : []);
  return { ok: true };
});

export const DELETE = route<{ orgId: string; id: string }>(async (_req, { orgId, id }) => {
  const actor = await requireUser();
  await removeMember(actor, orgId, id);
  return { ok: true };
});

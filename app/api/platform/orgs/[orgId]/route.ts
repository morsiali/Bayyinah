import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { setOrganizationStatus } from '@/lib/services/platform';

export const POST = route<{ orgId: string }>(async (req, { orgId }) => {
  const actor = await requireUser();
  const b = await readJson(req);
  await setOrganizationStatus(actor, orgId, b?.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE', String(b?.reason ?? ''));
  return { ok: true };
});

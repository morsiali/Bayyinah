import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { createOrganization } from '@/lib/services/orgs';

export const POST = route(async (req) => {
  const actor = await requireUser();
  const body = await readJson(req);
  const org = await createOrganization(actor, String(body?.name ?? ''));
  return { id: org.id };
});

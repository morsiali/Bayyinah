import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { acceptInvitation } from '@/lib/services/orgs';

export const POST = route(async (req) => {
  const actor = await requireUser();
  const body = await readJson(req);
  return acceptInvitation(actor, String(body?.token ?? ''));
});

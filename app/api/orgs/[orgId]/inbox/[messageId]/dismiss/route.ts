import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { dismissSms } from '@/lib/services/sms';

export const POST = route<{ orgId: string; messageId: string }>(async (req, { orgId, messageId }) => {
  await dismissSms(await requireUser(), orgId, messageId, await readJson(req));
  return { ok: true };
});

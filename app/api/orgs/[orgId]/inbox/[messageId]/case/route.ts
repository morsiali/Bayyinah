import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { createCaseFromSms } from '@/lib/services/sms';

export const POST = route<{ orgId: string; messageId: string }>(async (req, { orgId, messageId }) => createCaseFromSms(await requireUser(), orgId, messageId, await readJson(req)));

import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { sendTestSms } from '@/lib/services/sms';

export const POST = route<{ orgId: string }>(async (req, { orgId }) => sendTestSms(await requireUser(), orgId, await readJson(req)));

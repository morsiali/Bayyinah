import { route, readJson } from '@/lib/api';
import { resetPassword } from '@/lib/services/accounts';
import { startSession } from '@/lib/auth/session';

export const POST = route(async (req) => {
  const body = await readJson(req);
  const user = await resetPassword(String(body?.token ?? ''), String(body?.password ?? ''));
  await startSession(user);
  return { ok: true };
});

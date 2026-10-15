import { route, readJson } from '@/lib/api';
import { authenticate } from '@/lib/services/accounts';
import { startSession } from '@/lib/auth/session';

export const POST = route(async (req) => {
  const body = await readJson(req);
  const user = await authenticate(String(body?.email ?? ''), String(body?.password ?? ''));
  await startSession(user);
  return { ok: true };
});

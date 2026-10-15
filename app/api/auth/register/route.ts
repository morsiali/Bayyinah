import { route, readJson } from '@/lib/api';
import { registerUser } from '@/lib/services/accounts';
import { startSession } from '@/lib/auth/session';

export const POST = route(async (req) => {
  const user = await registerUser(await readJson(req));
  await startSession(user);
  return { ok: true };
});

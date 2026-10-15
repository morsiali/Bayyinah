import { route, readJson } from '@/lib/api';
import { requestPasswordReset } from '@/lib/services/accounts';

export const POST = route(async (req) => {
  const body = await readJson(req);
  await requestPasswordReset(String(body?.email ?? ''));
  return { ok: true };
});

import { route, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { updatePlatformSettings } from '@/lib/services/platform';

export const PUT = route(async (req) => {
  const actor = await requireUser();
  await updatePlatformSettings(actor, (await readJson(req)) ?? {});
  return { ok: true };
});

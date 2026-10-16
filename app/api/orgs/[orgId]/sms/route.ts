import { route } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { createSmsAddress, disableSms, getSmsSettings } from '@/lib/services/sms';

export const GET = route<{ orgId: string }>(async (_req, { orgId }) => getSmsSettings(await requireUser(), orgId));
export const POST = route<{ orgId: string }>(async (_req, { orgId }) => createSmsAddress(await requireUser(), orgId));
export const DELETE = route<{ orgId: string }>(async (_req, { orgId }) => {
  await disableSms(await requireUser(), orgId);
  return { ok: true };
});

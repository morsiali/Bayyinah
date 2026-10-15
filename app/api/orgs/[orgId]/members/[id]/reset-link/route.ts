import { route } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { adminIssueReset } from '@/lib/services/accounts';

export const POST = route<{ orgId: string; id: string }>(async (_req, { orgId, id }) => {
  const actor = await requireUser();
  return adminIssueReset(actor, orgId, id);
});

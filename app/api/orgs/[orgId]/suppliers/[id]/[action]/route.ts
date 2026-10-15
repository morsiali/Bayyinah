import { route, readJson } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { requireUser } from '@/lib/auth/session';
import { markSupplierReviewed, setSupplierActive } from '@/lib/services/suppliers';

export const POST = route<{ orgId: string; id: string; action: string }>(async (req, { orgId, id, action }) => {
  const actor = await requireUser();
  if (action === 'review') await markSupplierReviewed(actor, orgId, id);
  else if (action === 'active') await setSupplierActive(actor, orgId, id, !!(await readJson(req))?.isActive);
  else throw new AppError('NOT_FOUND', 'Unknown action.');
  return { ok: true };
});

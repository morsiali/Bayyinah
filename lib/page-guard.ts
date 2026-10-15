import 'server-only';
import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { getOrgContext } from '@/lib/services/access';
import type { Role } from '@/lib/constants';

/** Page-level guard: signed in, active member, and (optionally) holding one of the roles. */
export async function guardPage(orgId: string, path: string, roles?: Role[]) {
  const user = await requirePageUser(path);
  const ctx = await getOrgContext(user, orgId).catch(() => notFound());
  const allowed = !roles || roles.some((r) => ctx.roles.includes(r));
  return { user, ctx, allowed };
}

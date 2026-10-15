import { prisma, type Tx } from '@/lib/db';
import { AppError, forbidden, notFound } from '@/lib/errors';
import { parseRoles } from '@/lib/roles';
import type { Role } from '@/lib/constants';

export type Actor = { id: string; email: string; name: string };

export type OrgContext = {
  orgId: string;
  orgName: string;
  membershipId: string;
  roles: Role[];
};

/** Resolves the actor's active membership. Organization ids from the client are never trusted on their own. */
export async function getOrgContext(actor: Actor, orgId: string, db: Tx = prisma): Promise<OrgContext> {
  const m = await db.membership.findFirst({
    where: { orgId, userId: actor.id, isActive: true },
    include: { org: { select: { name: true, status: true } } },
  });
  if (!m) throw forbidden('You are not a member of this organization.');
  if (m.org.status !== 'ACTIVE') throw new AppError('SUSPENDED', 'This organization’s service is currently suspended. Contact platform support.');
  return { orgId, orgName: m.org.name, membershipId: m.id, roles: parseRoles(m.roles) };
}

export async function requireRole(actor: Actor, orgId: string, roles: Role | Role[], db: Tx = prisma): Promise<OrgContext> {
  const ctx = await getOrgContext(actor, orgId, db);
  const need = Array.isArray(roles) ? roles : [roles];
  if (!need.some((r) => ctx.roles.includes(r))) {
    const names = need.map((r) => (r === 'ORG_ADMIN' ? 'Organization admin' : r === 'PREPARER' ? 'Preparer' : 'Reviewer')).join(' or ');
    throw forbidden(`This action requires the ${names} role in this organization.`);
  }
  return ctx;
}

/** Loads a case strictly within the organization. A case id from another org is indistinguishable from a missing one. */
export async function loadCase(orgId: string, caseId: string, db: Tx = prisma) {
  const c = await db.case.findFirst({ where: { id: caseId, orgId } });
  if (!c) throw notFound('Case');
  return c;
}

export async function listMyOrgs(actor: Actor) {
  const ms = await prisma.membership.findMany({
    where: { userId: actor.id, isActive: true },
    include: { org: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return ms.map((m) => ({ orgId: m.orgId, name: m.org.name, status: m.org.status, roles: parseRoles(m.roles) }));
}

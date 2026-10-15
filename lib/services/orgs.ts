import { z } from 'zod';
import { prisma, type Tx } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { getSetting } from '@/lib/settings';
import { hashToken, newToken } from '@/lib/tokens';
import { env } from '@/lib/env';
import { ROLES, type Role } from '@/lib/constants';
import { parseRoles, serializeRoles } from '@/lib/roles';
import { requireRole, type Actor } from './access';

const rolesSchema = z.array(z.enum(ROLES)).min(1, 'Choose at least one role.');

export const orgNameSchema = z.string().trim().min(2, 'Organization name must be at least 2 characters.').max(120);

function slugify(name: string) {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'org';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

/** The creator becomes the first Organization Admin (and may prepare and review other people’s cases). */
export async function createOrganization(actor: Actor, name: string) {
  const n = orgNameSchema.parse(name);
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: n, slug: slugify(n) } });
    await tx.membership.create({ data: { orgId: org.id, userId: actor.id, roles: 'ORG_ADMIN,PREPARER,REVIEWER' } });
    await audit({ orgId: org.id, actor, action: 'organization.created', entityType: 'organization', entityId: org.id, changedFields: { name: n } }, tx);
    return org;
  });
}

export const orgSettingsSchema = z.object({
  name: orgNameSchema,
  retentionDays: z.coerce.number().int().min(30, 'Retention must be at least 30 days.').max(3650, 'Retention can be at most 3650 days.'),
});

export async function updateOrganization(actor: Actor, orgId: string, input: z.input<typeof orgSettingsSchema>) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const d = orgSettingsSchema.parse(input);
  await prisma.$transaction(async (tx) => {
    const before = await tx.organization.findUniqueOrThrow({ where: { id: orgId } });
    await tx.organization.update({ where: { id: orgId }, data: d });
    await audit({ orgId, actor, action: 'organization.updated', entityType: 'organization', entityId: orgId, changedFields: { name: before.name !== d.name, retentionDays: { from: before.retentionDays, to: d.retentionDays } } }, tx);
  });
}

async function activeAdminCount(tx: Tx, orgId: string) {
  const ms = await tx.membership.findMany({ where: { orgId, isActive: true }, select: { roles: true } });
  return ms.filter((m) => parseRoles(m.roles).includes('ORG_ADMIN')).length;
}

export async function changeMemberRoles(actor: Actor, orgId: string, membershipId: string, roles: Role[]) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const next = rolesSchema.parse(roles);
  await prisma.$transaction(async (tx) => {
    const m = await tx.membership.findFirst({ where: { id: membershipId, orgId, isActive: true } });
    if (!m) throw notFound('Member');
    const wasAdmin = parseRoles(m.roles).includes('ORG_ADMIN');
    if (wasAdmin && !next.includes('ORG_ADMIN') && (await activeAdminCount(tx, orgId)) <= 1) {
      throw new AppError('BLOCKED', 'This is the last active organization admin. Make someone else an admin first.');
    }
    await tx.membership.update({ where: { id: m.id }, data: { roles: serializeRoles(next) } });
    await audit({ orgId, actor, action: 'membership.roles_changed', entityType: 'membership', entityId: m.id, changedFields: { from: parseRoles(m.roles), to: next } }, tx);
  });
}

export async function removeMember(actor: Actor, orgId: string, membershipId: string) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  await prisma.$transaction(async (tx) => {
    const m = await tx.membership.findFirst({ where: { id: membershipId, orgId, isActive: true } });
    if (!m) throw notFound('Member');
    if (parseRoles(m.roles).includes('ORG_ADMIN') && (await activeAdminCount(tx, orgId)) <= 1) {
      throw new AppError('BLOCKED', 'You cannot remove the last active organization admin.');
    }
    await tx.membership.update({ where: { id: m.id }, data: { isActive: false } });
    await audit({ orgId, actor, action: 'membership.removed', entityType: 'membership', entityId: m.id }, tx);
  });
}

// ───────────── Invitations ─────────────

export const invitationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  roles: rolesSchema,
});

/** Returns the one-time link. Only the token hash is stored. */
export async function createInvitation(actor: Actor, orgId: string, input: z.input<typeof invitationSchema>) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const d = invitationSchema.parse(input);
  const existingMember = await prisma.membership.findFirst({ where: { orgId, isActive: true, user: { email: d.email } } });
  if (existingMember) throw new AppError('CONFLICT', 'That person is already a member of this organization.');
  const ttlDays = await getSetting('invitation_ttl_days');
  const { token, hash } = newToken();
  const inv = await prisma.$transaction(async (tx) => {
    await tx.organizationInvitation.updateMany({ where: { orgId, email: d.email, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    const inv = await tx.organizationInvitation.create({ data: { orgId, email: d.email, roles: serializeRoles(d.roles), tokenHash: hash, invitedBy: actor.id, expiresAt: new Date(Date.now() + ttlDays * 86400_000) } });
    await audit({ orgId, actor, action: 'invitation.created', entityType: 'invitation', entityId: inv.id, changedFields: { roles: d.roles, expiresInDays: ttlDays } }, tx);
    return inv;
  });
  return { id: inv.id, link: `${env.appUrl()}/invite/${token}`, path: `/invite/${token}`, expiresAt: inv.expiresAt };
}

export async function revokeInvitation(actor: Actor, orgId: string, invitationId: string) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const inv = await prisma.organizationInvitation.findFirst({ where: { id: invitationId, orgId, usedAt: null, revokedAt: null } });
  if (!inv) throw notFound('Invitation');
  await prisma.$transaction(async (tx) => {
    await tx.organizationInvitation.update({ where: { id: inv.id }, data: { revokedAt: new Date() } });
    await audit({ orgId, actor, action: 'invitation.revoked', entityType: 'invitation', entityId: inv.id }, tx);
  });
}

export async function lookupInvitation(token: string) {
  const inv = await prisma.organizationInvitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { org: { select: { name: true, status: true } } } });
  if (!inv) return { state: 'invalid' as const };
  if (inv.revokedAt) return { state: 'revoked' as const };
  if (inv.usedAt) return { state: 'used' as const };
  if (inv.expiresAt < new Date()) return { state: 'expired' as const };
  return { state: 'valid' as const, email: inv.email, orgName: inv.org.name, roles: parseRoles(inv.roles) };
}

/** Single-use, expiring, bound to the invited email, accepted only by that signed-in user. */
export async function acceptInvitation(actor: Actor, token: string) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.organizationInvitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { org: true } });
    if (!inv || inv.revokedAt) throw new AppError('NOT_FOUND', 'This invitation link is not valid.');
    if (inv.usedAt) throw new AppError('BLOCKED', 'This invitation has already been used.');
    if (inv.expiresAt < new Date()) throw new AppError('BLOCKED', 'This invitation has expired. Ask your administrator for a new link.');
    if (inv.email.toLowerCase() !== actor.email.toLowerCase()) throw new AppError('FORBIDDEN', `This invitation was issued to ${inv.email}. Sign in with that email address to accept it.`);
    if (inv.org.status !== 'ACTIVE') throw new AppError('SUSPENDED', 'This organization is currently suspended.');
    const claimed = await tx.organizationInvitation.updateMany({ where: { id: inv.id, usedAt: null }, data: { usedAt: new Date(), usedBy: actor.id } });
    if (claimed.count !== 1) throw new AppError('BLOCKED', 'This invitation has already been used.');
    const existing = await tx.membership.findUnique({ where: { orgId_userId: { orgId: inv.orgId, userId: actor.id } } });
    if (existing?.isActive) throw new AppError('CONFLICT', 'You are already a member of this organization.');
    const m = existing
      ? await tx.membership.update({ where: { id: existing.id }, data: { isActive: true, roles: inv.roles, invitedBy: inv.invitedBy } })
      : await tx.membership.create({ data: { orgId: inv.orgId, userId: actor.id, roles: inv.roles, invitedBy: inv.invitedBy } });
    await audit({ orgId: inv.orgId, actor, action: 'invitation.accepted', entityType: 'membership', entityId: m.id, changedFields: { roles: parseRoles(inv.roles) } }, tx);
    return { orgId: inv.orgId };
  });
}

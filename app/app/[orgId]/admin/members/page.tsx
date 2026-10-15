import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth/session';
import { MembersAdmin } from '@/components/admin/members';
import { parseRoles } from '@/lib/roles';

export const metadata: Metadata = { title: 'Members & invitations' };
export const dynamic = 'force-dynamic';

export default async function MembersPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await requirePageUser(`/app/${orgId}/admin/members`);
  const [ms, invs] = await Promise.all([
    prisma.membership.findMany({ where: { orgId, isActive: true }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.organizationInvitation.findMany({ where: { orgId, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } }),
  ]);
  return (
    <MembersAdmin
      orgId={orgId}
      members={ms.map((m) => ({ id: m.id, name: m.user.name, email: m.user.email, roles: parseRoles(m.roles), isMe: m.userId === user.id, since: m.createdAt.toISOString() }))}
      invites={invs.map((i) => ({ id: i.id, email: i.email, roles: parseRoles(i.roles), expiresAt: i.expiresAt.toISOString() }))}
    />
  );
}

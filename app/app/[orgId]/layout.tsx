import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { getOrgContext, listMyOrgs } from '@/lib/services/access';
import { AppShell } from '@/components/app/shell';
import { AppError } from '@/lib/errors';
import { Notice, LinkButton } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function OrgLayout({ children, params }: { children: ReactNode; params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await requirePageUser(`/app/${orgId}`);
  const orgs = (await listMyOrgs(user)).filter((o) => o.status === 'ACTIVE');
  try {
    const ctx = await getOrgContext(user, orgId);
    return (
      <AppShell user={user} orgs={orgs} current={{ orgId, name: ctx.orgName, roles: ctx.roles }} isPlatformAdmin={user.isPlatformAdmin}>
        {children}
      </AppShell>
    );
  } catch (e) {
    if (e instanceof AppError && e.code === 'SUSPENDED') {
      return (
        <AppShell user={user} orgs={orgs} isPlatformAdmin={user.isPlatformAdmin}>
          <div className="mx-auto max-w-xl space-y-4">
            <Notice tone="review" title="Organization suspended">{e.message}</Notice>
            <LinkButton href="/app" variant="secondary">Back to your organizations</LinkButton>
          </div>
        </AppShell>
      );
    }
    notFound();
  }
}

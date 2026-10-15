import type { ReactNode } from 'react';
import { guardPage } from '@/lib/page-guard';
import { AdminNav } from '@/components/admin/admin-nav';
import { Forbidden } from '@/components/app/forbidden';

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { ctx, allowed } = await guardPage(orgId, `/app/${orgId}/admin`, ['ORG_ADMIN']);
  if (!allowed) return <Forbidden need="Organization admin" orgId={orgId} />;
  return (
    <div>
      <p className="t-caption text-ink-muted">{ctx.orgName}</p>
      <h1 className="t-headline">Manage organization</h1>
      <div className="mt-5"><AdminNav orgId={orgId} /></div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

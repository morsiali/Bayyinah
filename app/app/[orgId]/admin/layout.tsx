import type { ReactNode } from 'react';
import { guardPage } from '@/lib/page-guard';
import { AdminNav } from '@/components/admin/admin-nav';
import { Forbidden } from '@/components/app/forbidden';
import { getT } from '@/lib/i18n/server';

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { ctx, allowed } = await guardPage(orgId, `/app/${orgId}/admin`, ['ORG_ADMIN']);
  if (!allowed) return <Forbidden need="Organization admin" orgId={orgId} />;
  const { t } = await getT();
  return (
    <div>
      <p className="t-eyebrow">/ <bdi>{ctx.orgName}</bdi></p>
      <h1 className="t-headline mt-2">{t('Manage organization')}</h1>
      <div className="mt-5"><AdminNav orgId={orgId} /></div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

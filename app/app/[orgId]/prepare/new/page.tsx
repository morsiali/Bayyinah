import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { guardPage } from '@/lib/page-guard';
import { prisma } from '@/lib/db';
import { Forbidden } from '@/components/app/forbidden';
import { NewCaseForm } from '@/components/app/new-case-form';
import { Empty, LinkButton } from '@/components/ui';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('New case') };
}
export const dynamic = 'force-dynamic';

export default async function NewCasePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { ctx, allowed } = await guardPage(orgId, `/app/${orgId}/prepare/new`, ['PREPARER']);
  if (!allowed) return <Forbidden need="Preparer" orgId={orgId} />;
  const { t } = await getT();
  const suppliers = await prisma.supplier.findMany({ where: { orgId, isActive: true }, select: { id: true, name: true, reviewStatus: true, usualCurrency: true }, orderBy: { name: 'asc' } });
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/app/${orgId}/prepare`} className="t-eyebrow hover:!text-ink"><span className="inline-block rtl:-scale-x-100">←</span> {t('Prepare cases')}</Link>
      <h1 className="t-headline mt-3">{t('New case')}</h1>
      <p className="t-lead mt-2">{t('Pick the supplier the request claims to come from and what it asks for. You add the request itself on the next screen.')}</p>
      <div className="card mt-8 p-6 md:p-8">
        {suppliers.length === 0 ? (
          <Empty icon={<Building2 className="h-8 w-8" />} title={t('No supplier references yet')} action={ctx.roles.includes('ORG_ADMIN') ? <LinkButton href={`/app/${orgId}/admin/suppliers`} arrow>{t('Add a supplier')}</LinkButton> : undefined}>
            {ctx.roles.includes('ORG_ADMIN') ? t('Add the supplier and the details you already hold for them first.') : t('Ask an organization admin to add the supplier reference first.')}
          </Empty>
        ) : (
          <NewCaseForm orgId={orgId} suppliers={suppliers} />
        )}
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { guardPage } from '@/lib/page-guard';
import { prisma } from '@/lib/db';
import { Forbidden } from '@/components/app/forbidden';
import { NewCaseForm } from '@/components/app/new-case-form';
import { Empty, LinkButton } from '@/components/ui';

export const metadata: Metadata = { title: 'New case' };
export const dynamic = 'force-dynamic';

export default async function NewCasePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { ctx, allowed } = await guardPage(orgId, `/app/${orgId}/prepare/new`, ['PREPARER']);
  if (!allowed) return <Forbidden need="Preparer" orgId={orgId} />;
  const suppliers = await prisma.supplier.findMany({ where: { orgId, isActive: true }, select: { id: true, name: true, reviewStatus: true, usualCurrency: true }, orderBy: { name: 'asc' } });
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/app/${orgId}/prepare`} className="text-[14px] font-semibold text-ink-muted hover:text-ink">← Prepare cases</Link>
      <h1 className="t-headline mt-3">New case</h1>
      <p className="t-lead mt-2">Pick the supplier the request claims to come from and what it asks for. You add the request itself on the next screen.</p>
      <div className="card mt-8 p-6 md:p-8">
        {suppliers.length === 0 ? (
          <Empty icon={<Building2 className="h-8 w-8" />} title="No supplier references yet" action={ctx.roles.includes('ORG_ADMIN') ? <LinkButton href={`/app/${orgId}/admin/suppliers`} arrow>Add a supplier</LinkButton> : undefined}>
            {ctx.roles.includes('ORG_ADMIN') ? 'Add the supplier and the details you already hold for them first.' : 'Ask an organization admin to add the supplier reference first.'}
          </Empty>
        ) : (
          <NewCaseForm orgId={orgId} suppliers={suppliers} />
        )}
      </div>
    </div>
  );
}

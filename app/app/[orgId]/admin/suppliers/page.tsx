import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import { NewSupplier } from '@/components/admin/new-supplier';
import { Ltr, cx } from '@/components/ui';
import { maskAccount } from '@/lib/iban';

export const metadata: Metadata = { title: 'Suppliers' };
export const dynamic = 'force-dynamic';

export default async function SuppliersPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const suppliers = await prisma.supplier.findMany({ where: { orgId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }], include: { _count: { select: { cases: true } } } });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="t-sub text-[22px]">Supplier references</h2>
          <p className="mt-1 text-[15px] text-ink-muted">Reference information reviewed by the business. Every change is kept as a new version; cases keep the version they were prepared with.</p>
        </div>
        {suppliers.length > 0 && <NewSupplier orgId={orgId} />}
      </div>
      {suppliers.length === 0 ? (
        <NewSupplier orgId={orgId} startOpen />
      ) : (
        <ul className="card-flat divide-y divide-line">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Link href={`/app/${orgId}/admin/suppliers/${s.id}`} className={cx('group grid items-center gap-2 px-5 py-4 hover:bg-zinc-50 md:grid-cols-[1.2fr_1fr_1fr_160px_20px]', !s.isActive && 'opacity-60')}>
                <span>
                  <span className="block text-[15px] font-bold">{s.name}</span>
                  <span className="block text-[13px] text-ink-muted">v{s.currentVersion} · {s._count.cases} case{s._count.cases === 1 ? '' : 's'}{!s.isActive ? ' · deactivated' : ''}</span>
                </span>
                <span className="text-[13px]"><Ltr mono>{maskAccount(s.referenceIban ?? s.referenceBankAccount) ?? '—'}</Ltr></span>
                <span className="truncate text-[13px] text-ink-muted">{s.recordedPhone ? <Ltr>{s.recordedPhone}</Ltr> : 'No phone'} · {s.recordedEmail ? <Ltr>{s.recordedEmail}</Ltr> : 'no email'}</span>
                <span className={cx('text-[12.5px] font-semibold', s.reviewStatus === 'REVIEWED' ? 'text-ink-soft' : 'text-amber-700')}>{s.reviewStatus === 'REVIEWED' ? 'Reviewed by the business' : 'Not yet reviewed'}</span>
                <ArrowRight className="hidden h-4 w-4 text-ink-faint group-hover:text-brand-600 md:block" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

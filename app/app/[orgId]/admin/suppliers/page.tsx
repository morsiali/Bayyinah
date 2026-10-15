import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import { NewSupplier } from '@/components/admin/new-supplier';
import { Ltr, cx } from '@/components/ui';
import { maskAccount } from '@/lib/iban';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Suppliers') };
}
export const dynamic = 'force-dynamic';

export default async function SuppliersPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { t } = await getT();
  const suppliers = await prisma.supplier.findMany({ where: { orgId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }], include: { _count: { select: { cases: true } } } });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="t-sub text-[22px]">{t('Supplier references')}</h2>
          <p className="mt-1 text-[15px] text-ink-muted">{t('Reference information reviewed by the business. Every change is kept as a new version; cases keep the version they were prepared with.')}</p>
        </div>
        {suppliers.length > 0 && <NewSupplier orgId={orgId} />}
      </div>
      {suppliers.length === 0 ? (
        <NewSupplier orgId={orgId} startOpen />
      ) : (
        <ul className="card-flat divide-y divide-line">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Link href={`/app/${orgId}/admin/suppliers/${s.id}`} className={cx('group grid items-center gap-2 border-s-[3px] border-s-transparent px-5 py-4 hover:border-s-brand-600 hover:bg-mist md:grid-cols-[1.2fr_1fr_1fr_180px_20px]', !s.isActive && 'opacity-60')}>
                <span>
                  <bdi className="block text-[15px] font-semibold">{s.name}</bdi>
                  <span className="block text-[13px] text-ink-muted"><span dir="ltr">v{s.currentVersion}</span> · {t('Cases: {n}', { n: s._count.cases })}{!s.isActive ? ` · ${t('deactivated')}` : ''}</span>
                </span>
                <span className="text-[13px]"><Ltr mono>{maskAccount(s.referenceIban ?? s.referenceBankAccount) ?? '—'}</Ltr></span>
                <span className="truncate text-[13px] text-ink-muted">{s.recordedPhone ? <Ltr>{s.recordedPhone}</Ltr> : t('No phone')} · {s.recordedEmail ? <Ltr>{s.recordedEmail}</Ltr> : t('no email')}</span>
                <span className={cx('text-[12.5px] font-semibold', s.reviewStatus === 'REVIEWED' ? 'text-ink-soft' : 'text-amber-700')}>{s.reviewStatus === 'REVIEWED' ? t('Reviewed by the business') : t('Not yet reviewed')}</span>
                <ArrowRight className="hidden h-4 w-4 text-ink-faint group-hover:text-brand-600 md:block rtl:-scale-x-100" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

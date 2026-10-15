import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { SupplierForm } from '@/components/admin/supplier-form';
import { SupplierActions } from '@/components/admin/supplier-actions';
import { CaseTable } from '@/components/app/case-table';
import { Notice, Ltr } from '@/components/ui';
import { userNames } from '@/lib/services/cases';
import { maskAccount } from '@/lib/iban';
import { formatDate, translateText } from '@/lib/i18n/core';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Supplier reference') };
}
export const dynamic = 'force-dynamic';

export default async function SupplierPage({ params }: { params: Promise<{ orgId: string; supplierId: string }> }) {
  const { orgId, supplierId } = await params;
  const s = await prisma.supplier.findFirst({ where: { id: supplierId, orgId }, include: { versions: { orderBy: { versionNumber: 'desc' } }, cases: { include: { supplier: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 20 } } });
  if (!s) notFound();
  const { t, locale } = await getT();
  const names = await userNames([s.createdBy, s.reviewedBy, ...s.versions.map((v) => v.changedBy)]);
  return (
    <div className="space-y-6">
      <Link href={`/app/${orgId}/admin/suppliers`} className="t-eyebrow hover:!text-ink"><span className="inline-block rtl:-scale-x-100">←</span> {t('All suppliers')}</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="t-headline text-[28px]" dir="auto">{s.name}</h2>
          <p className="text-[14px] text-ink-muted">{t('Version {v} · added by {name} on {date}', { v: s.currentVersion, name: names[s.createdBy]?.name ?? '—', date: formatDate(locale, s.createdAt, { dateStyle: 'medium' }) })}</p>
        </div>
        <SupplierActions orgId={orgId} supplierId={s.id} reviewed={s.reviewStatus === 'REVIEWED'} active={s.isActive} />
      </div>
      {s.reviewStatus === 'REVIEWED' ? (
        <Notice tone="info">{t('Reference information reviewed by the business — by {name} on {date}. This is not an official verification of the supplier.', { name: names[s.reviewedBy ?? '']?.name ?? t('an admin'), date: s.reviewedAt ? formatDate(locale, s.reviewedAt, { dateStyle: 'medium' }) : '' })}</Notice>
      ) : (
        <Notice tone="review" title={t('Not yet reviewed')}>{t('Check these details against an approved record, then mark the reference as reviewed.')}</Notice>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h3 className="t-sub text-[19px]">{t('Edit reference')}</h3>
          <p className="mb-5 mt-1 text-[13px] text-ink-muted">{t('Saving creates version {v}. Open cases are offered the new version; closed cases keep theirs.', { v: s.currentVersion + 1 })}</p>
          <SupplierForm orgId={orgId} supplierId={s.id} initial={s} />
        </section>
        <section className="card p-6">
          <h3 className="t-sub text-[19px]">{t('Version history')}</h3>
          <ol className="mt-4 space-y-3">
            {s.versions.map((v) => {
              const snap = v.snapshot as Record<string, string | null>;
              return (
                <li key={v.id} className="border border-line border-s-[3px] border-s-brand-600 p-3.5 text-[13px]">
                  <p className="font-semibold">{t('Version {v}', { v: v.versionNumber })}</p>
                  <p className="text-ink-soft" dir="auto">{translateText(locale, v.changeReason)}</p>
                  <p className="mt-1 text-ink-muted">{names[v.changedBy]?.name ?? '—'} · {formatDate(locale, v.createdAt)}</p>
                  <p className="mt-1 text-ink-muted">{t('Account')} <Ltr mono>{maskAccount(snap.referenceIban ?? snap.referenceBankAccount) ?? '—'}</Ltr> · {t('phone')} {snap.recordedPhone ? <Ltr>{snap.recordedPhone}</Ltr> : '—'}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
      <section>
        <h3 className="t-sub mb-3 text-[19px]">{t('Cases for this supplier')}</h3>
        {s.cases.length ? <CaseTable orgId={orgId} rows={s.cases} /> : <p className="text-[15px] text-ink-muted">{t('No cases yet.')}</p>}
      </section>
    </div>
  );
}

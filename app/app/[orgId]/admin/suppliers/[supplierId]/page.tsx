import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { SupplierForm } from '@/components/admin/supplier-form';
import { SupplierActions } from '@/components/admin/supplier-actions';
import { CaseTable } from '@/components/app/case-table';
import { Notice, Ltr } from '@/components/ui';
import { userNames } from '@/lib/services/cases';
import { maskAccount } from '@/lib/iban';

export const metadata: Metadata = { title: 'Supplier reference' };
export const dynamic = 'force-dynamic';

export default async function SupplierPage({ params }: { params: Promise<{ orgId: string; supplierId: string }> }) {
  const { orgId, supplierId } = await params;
  const s = await prisma.supplier.findFirst({ where: { id: supplierId, orgId }, include: { versions: { orderBy: { versionNumber: 'desc' } }, cases: { include: { supplier: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 20 } } });
  if (!s) notFound();
  const names = await userNames([s.createdBy, s.reviewedBy, ...s.versions.map((v) => v.changedBy)]);
  return (
    <div className="space-y-6">
      <Link href={`/app/${orgId}/admin/suppliers`} className="text-[14px] font-semibold text-ink-muted hover:text-ink">← All suppliers</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-bold tracking-[-0.03em]">{s.name}</h2>
          <p className="text-[14px] text-ink-muted">Version {s.currentVersion} · added by {names[s.createdBy]?.name ?? '—'} on {s.createdAt.toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai' })}</p>
        </div>
        <SupplierActions orgId={orgId} supplierId={s.id} reviewed={s.reviewStatus === 'REVIEWED'} active={s.isActive} />
      </div>
      {s.reviewStatus === 'REVIEWED' ? (
        <Notice tone="info">Reference information reviewed by the business — by {names[s.reviewedBy ?? '']?.name ?? 'an admin'} on {s.reviewedAt?.toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai' })}. This is not an official verification of the supplier.</Notice>
      ) : (
        <Notice tone="review" title="Not yet reviewed">Check these details against an approved record, then mark the reference as reviewed.</Notice>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h3 className="t-sub text-[19px]">Edit reference</h3>
          <p className="mb-5 mt-1 text-[13px] text-ink-muted">Saving creates version {s.currentVersion + 1}. Open cases are offered the new version; closed cases keep theirs.</p>
          <SupplierForm orgId={orgId} supplierId={s.id} initial={s} />
        </section>
        <section className="card p-6">
          <h3 className="t-sub text-[19px]">Version history</h3>
          <ol className="mt-4 space-y-3">
            {s.versions.map((v) => {
              const snap = v.snapshot as Record<string, string | null>;
              return (
                <li key={v.id} className="rounded-xl border border-line p-3.5 text-[13px]">
                  <p className="font-bold">Version {v.versionNumber}</p>
                  <p className="text-ink-soft">{v.changeReason}</p>
                  <p className="mt-1 text-ink-muted">{names[v.changedBy]?.name ?? '—'} · {v.createdAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dubai' })}</p>
                  <p className="mt-1 text-ink-muted">Account <Ltr mono>{maskAccount(snap.referenceIban ?? snap.referenceBankAccount) ?? '—'}</Ltr> · phone {snap.recordedPhone ? <Ltr>{snap.recordedPhone}</Ltr> : '—'}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
      <section>
        <h3 className="t-sub mb-3 text-[19px]">Cases for this supplier</h3>
        {s.cases.length ? <CaseTable orgId={orgId} rows={s.cases} /> : <p className="text-[15px] text-ink-muted">No cases yet.</p>}
      </section>
    </div>
  );
}

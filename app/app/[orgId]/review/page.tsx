import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { Inbox } from 'lucide-react';
import { guardPage } from '@/lib/page-guard';
import { prisma } from '@/lib/db';
import { CaseTable } from '@/components/app/case-table';
import { Forbidden } from '@/components/app/forbidden';
import { Empty, Notice, Ltr } from '@/components/ui';
import Link from 'next/link';
import { DECISION_LABELS, DISCLAIMER, type Decision } from '@/lib/constants';
import { formatDate } from '@/lib/i18n/core';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Review cases') };
}
export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { user, ctx, allowed } = await guardPage(orgId, `/app/${orgId}/review`, ['REVIEWER']);
  if (!allowed) return <Forbidden need="Reviewer" orgId={orgId} />;
  const include = { supplier: { select: { name: true } } };
  const [ready, waiting, mine] = await Promise.all([
    prisma.case.findMany({ where: { orgId, status: 'READY_FOR_REVIEW' }, include, orderBy: { updatedAt: 'asc' } }),
    prisma.case.findMany({ where: { orgId, status: 'NEEDS_INFORMATION' }, include, orderBy: { updatedAt: 'desc' } }),
    prisma.review.findMany({ where: { orgId, reviewerId: user.id }, include: { case: { select: { id: true, caseNumber: true, supplier: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 25 }),
  ]);
  const forMe = ready.filter((c) => c.createdBy !== user.id);
  const ownCases = ready.filter((c) => c.createdBy === user.id);
  const { t, locale } = await getT();
  return (
    <div className="space-y-10">
      <div>
        <p className="t-eyebrow">/ <bdi>{ctx.orgName}</bdi></p>
        <h1 className="t-headline mt-2">{t('Review cases')}</h1>
        <Notice tone="info" className="mt-4 max-w-3xl">{t(DISCLAIMER)}</Notice>
      </div>
      <section aria-labelledby="r1">
        <h2 id="r1" className="t-sub mb-3 text-[19px]">{t('Ready for your review')}</h2>
        {forMe.length ? (
          <CaseTable orgId={orgId} rows={forMe} from="review" />
        ) : (
          <Empty icon={<Inbox className="h-8 w-8" />} title={t('Nothing waiting for you')}>{t('Cases appear here when a preparer submits them. You never see your own cases in this queue.')}</Empty>
        )}
        {ownCases.length > 0 && <p className="mt-3 text-[13px] text-ink-muted">{t('{n} case(s) you created are also waiting — another reviewer must decide them.', { n: ownCases.length })}</p>}
      </section>
      <section aria-labelledby="r2">
        <h2 id="r2" className="t-sub mb-3 text-[19px]">{t('Awaiting clarification')}</h2>
        {waiting.length ? <CaseTable orgId={orgId} rows={waiting} from="review" /> : <p className="text-[15px] text-ink-muted">{t('No cases have been returned for information.')}</p>}
      </section>
      <section aria-labelledby="r3">
        <h2 id="r3" className="t-sub mb-3 text-[19px]">{t('My recorded decisions')}</h2>
        {mine.length ? (
          <ul className="card-flat divide-y divide-line">
            {mine.map((r) => (
              <li key={r.id}>
                <Link href={`/app/${orgId}/cases/${r.case.id}?from=review`} className="grid gap-1 px-5 py-3.5 hover:bg-mist md:grid-cols-[180px_1fr_260px]">
                  <span className="text-[13px] font-semibold text-ink-soft"><Ltr mono>{r.case.caseNumber}</Ltr></span>
                  <bdi className="text-[15px] font-semibold">{r.case.supplier.name}</bdi>
                  <span className="text-[13px] text-ink-muted md:text-end">{t(DECISION_LABELS[r.decision as Decision])} · {formatDate(locale, r.createdAt, { dateStyle: 'medium' })}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-ink-muted">{t('You haven’t recorded any decisions yet.')}</p>
        )}
      </section>
    </div>
  );
}

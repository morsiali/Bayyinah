import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth/session';
import { requireRole } from '@/lib/services/access';
import { getSettings } from '@/lib/settings';
import { STATUS_LABELS, CASE_STATUSES } from '@/lib/constants';
import { Notice, StatusBadge } from '@/components/ui';
import { formatDate } from '@/lib/i18n/core';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Manage organization') };
}
export const dynamic = 'force-dynamic';

export default async function AdminOverview({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await requirePageUser(`/app/${orgId}/admin`);
  await requireRole(user, orgId, 'ORG_ADMIN');
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const [org, byStatus, members, invites, suppliers, pendingRef, analysesToday, recent, settings] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
    prisma.case.groupBy({ by: ['status'], where: { orgId }, _count: true }),
    prisma.membership.count({ where: { orgId, isActive: true } }),
    prisma.organizationInvitation.count({ where: { orgId, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.supplier.count({ where: { orgId, isActive: true } }),
    prisma.supplier.findMany({ where: { orgId, isActive: true, reviewStatus: { not: 'REVIEWED' } }, select: { id: true, name: true, currentVersion: true } }),
    prisma.analysis.count({ where: { orgId, createdAt: { gte: dayStart } } }),
    prisma.auditEvent.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' }, take: 8 }),
    getSettings(),
  ]);
  const totalCases = byStatus.reduce((n, s) => n + s._count, 0);
  const { t, locale } = await getT();
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        {pendingRef.length > 0 && (
          <Notice tone="review" title={t('Supplier references not yet reviewed: {n}', { n: pendingRef.length })}>
            {pendingRef.map((s, i) => (
              <span key={s.id}>{i > 0 && t(', ')}<Link href={`/app/${orgId}/admin/suppliers/${s.id}`} className="underline">{s.name} (<span dir="ltr">v{s.currentVersion}</span>)</Link></span>
            ))}
            . {t('Cases using them show this as a finding.')}
          </Notice>
        )}
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">{t('Cases by status')}</h2>
          <p className="text-[13px] text-ink-muted">{t('Total cases: {n}.', { n: totalCases })}</p>
          <ul className="mt-4 divide-y divide-line">
            {CASE_STATUSES.map((s) => {
              const n = byStatus.find((b) => b.status === s)?._count ?? 0;
              return (
                <li key={s} className="flex items-center justify-between py-2.5">
                  <StatusBadge status={s} />
                  <span className="font-mono text-[15px] font-semibold tabular-nums">{n}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="t-sub text-[19px]">{t('Recent activity')}</h2>
            <Link href={`/app/${orgId}/admin/audit`} className="link text-[14px]">{t('Full audit trail')}</Link>
          </div>
          <ul className="mt-3 divide-y divide-line text-[14px]">
            {recent.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 py-2.5">
                <span><code className="font-mono text-[12.5px]" dir="ltr">{e.action}</code> <span className="text-ink-muted">· {e.actorEmail ? <span dir="ltr">{e.actorEmail}</span> : t('system')}</span></span>
                <span className="shrink-0 text-ink-muted">{formatDate(locale, e.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">{t('Organization')}</h2>
          <dl className="mt-4 space-y-2.5 text-[14px]">
            <div className="flex justify-between"><dt className="text-ink-muted">{t('Name')}</dt><dd className="font-semibold">{org.name}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">{t('Members')}</dt><dd className="font-semibold"><Link className="link" href={`/app/${orgId}/admin/members`}>{members}</Link></dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">{t('Pending invitations')}</dt><dd className="font-semibold">{invites}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">{t('Active suppliers')}</dt><dd className="font-semibold"><Link className="link" href={`/app/${orgId}/admin/suppliers`}>{suppliers}</Link></dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">{t('Evidence retention')}</dt><dd className="font-semibold">{t('{n} days after closure', { n: org.retentionDays })}</dd></div>
          </dl>
          <Link href={`/app/${orgId}/admin/settings`} className="link mt-4 inline-block text-[14px]">{t('Edit settings')}</Link>
        </section>
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">{t('Usage limits')}</h2>
          <dl className="mt-4 space-y-2.5 text-[14px]">
            <div className="flex justify-between"><dt className="text-ink-muted">{t('Analyses today')}</dt><dd className="font-semibold tabular-nums" dir="ltr">{analysesToday} / {settings.max_analyses_per_org_per_day}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">{t('Cases')}</dt><dd className="font-semibold tabular-nums" dir="ltr">{totalCases} / {settings.max_cases_per_org}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">{t('Upload size')}</dt><dd className="font-semibold">{t('{n} MB', { n: settings.max_file_size_mb })}</dd></div>
          </dl>
          <p className="mt-3 text-[12.5px] text-ink-muted">{t('Limits are set by platform operations.')}</p>
        </section>
      </div>
    </div>
  );
}

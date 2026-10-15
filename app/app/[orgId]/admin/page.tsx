import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePageUser } from '@/lib/auth/session';
import { requireRole } from '@/lib/services/access';
import { getSettings } from '@/lib/settings';
import { STATUS_LABELS, CASE_STATUSES } from '@/lib/constants';
import { Notice, StatusBadge } from '@/components/ui';

export const metadata: Metadata = { title: 'Manage organization' };
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
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        {pendingRef.length > 0 && (
          <Notice tone="review" title={`${pendingRef.length} supplier reference${pendingRef.length > 1 ? 's' : ''} not yet reviewed`}>
            {pendingRef.map((s, i) => (
              <span key={s.id}>{i > 0 && ', '}<Link href={`/app/${orgId}/admin/suppliers/${s.id}`} className="underline">{s.name} (v{s.currentVersion})</Link></span>
            ))}
            . Cases using them show this as a finding.
          </Notice>
        )}
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">Cases by status</h2>
          <p className="text-[13px] text-ink-muted">{totalCases} case{totalCases === 1 ? '' : 's'} in total.</p>
          <ul className="mt-4 divide-y divide-line">
            {CASE_STATUSES.map((s) => {
              const n = byStatus.find((b) => b.status === s)?._count ?? 0;
              return (
                <li key={s} className="flex items-center justify-between py-2.5">
                  <StatusBadge status={s} />
                  <span className="text-[15px] font-bold tabular-nums">{n}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="t-sub text-[19px]">Recent activity</h2>
            <Link href={`/app/${orgId}/admin/audit`} className="link text-[14px]">Full audit trail</Link>
          </div>
          <ul className="mt-3 divide-y divide-line text-[14px]">
            {recent.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 py-2.5">
                <span><code className="font-mono text-[12.5px]">{e.action}</code> <span className="text-ink-muted">· {e.actorEmail ?? 'system'}</span></span>
                <span className="shrink-0 text-ink-muted">{e.createdAt.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Dubai' })}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">Organization</h2>
          <dl className="mt-4 space-y-2.5 text-[14px]">
            <div className="flex justify-between"><dt className="text-ink-muted">Name</dt><dd className="font-semibold">{org.name}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Members</dt><dd className="font-semibold"><Link className="link" href={`/app/${orgId}/admin/members`}>{members}</Link></dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Pending invitations</dt><dd className="font-semibold">{invites}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Active suppliers</dt><dd className="font-semibold"><Link className="link" href={`/app/${orgId}/admin/suppliers`}>{suppliers}</Link></dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Evidence retention</dt><dd className="font-semibold">{org.retentionDays} days after closure</dd></div>
          </dl>
          <Link href={`/app/${orgId}/admin/settings`} className="link mt-4 inline-block text-[14px]">Edit settings</Link>
        </section>
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">Usage limits</h2>
          <dl className="mt-4 space-y-2.5 text-[14px]">
            <div className="flex justify-between"><dt className="text-ink-muted">Analyses today</dt><dd className="font-semibold tabular-nums">{analysesToday} / {settings.max_analyses_per_org_per_day}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Cases</dt><dd className="font-semibold tabular-nums">{totalCases} / {settings.max_cases_per_org}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Upload size</dt><dd className="font-semibold">{settings.max_file_size_mb} MB</dd></div>
          </dl>
          <p className="mt-3 text-[12.5px] text-ink-muted">Limits are set by platform operations.</p>
        </section>
      </div>
    </div>
  );
}

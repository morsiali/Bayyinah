import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { cx } from '@/components/ui';

export const metadata: Metadata = { title: 'Audit trail' };
export const dynamic = 'force-dynamic';

const GROUPS = [
  { k: '', label: 'Everything' },
  { k: 'case', label: 'Cases' },
  { k: 'analysis', label: 'Analysis' },
  { k: 'agent', label: 'Agent' },
  { k: 'verification', label: 'Verification' },
  { k: 'review', label: 'Decisions' },
  { k: 'supplier', label: 'Suppliers' },
  { k: 'membership', label: 'Members' },
  { k: 'invitation', label: 'Invitations' },
];
const PAGE = 50;

export default async function AuditPage({ params, searchParams }: { params: Promise<{ orgId: string }>; searchParams: Promise<{ g?: string; p?: string }> }) {
  const { orgId } = await params;
  const sp = await searchParams;
  const g = GROUPS.some((x) => x.k === sp.g) ? sp.g! : '';
  const page = Math.max(1, Number(sp.p) || 1);
  const where = { orgId, ...(g ? { action: { startsWith: `${g}` } } : {}) };
  const [events, total] = await Promise.all([prisma.auditEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take: PAGE, skip: (page - 1) * PAGE }), prisma.auditEvent.count({ where })]);
  const caseIds = [...new Set(events.filter((e) => e.entityType === 'case' && e.entityId).map((e) => e.entityId!))];
  const cases = caseIds.length ? await prisma.case.findMany({ where: { id: { in: caseIds }, orgId }, select: { id: true, caseNumber: true } }) : [];
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number, gg = g) => `/app/${orgId}/admin/audit?${new URLSearchParams({ ...(gg ? { g: gg } : {}), ...(p > 1 ? { p: String(p) } : {}) })}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-sub text-[22px]">Audit trail</h2>
          <p className="text-[14px] text-ink-muted">Append-only record of actions in this organization. It cannot be edited from the application.</p>
        </div>
        <p className="text-[13px] text-ink-muted">{total} event{total === 1 ? '' : 's'}</p>
      </div>
      <nav aria-label="Filter events" className="flex flex-wrap gap-1.5">
        {GROUPS.map((x) => (
          <Link key={x.k} href={href(1, x.k)} aria-current={x.k === g ? 'true' : undefined} className={cx('rounded-full border px-3 py-1 text-[13px] font-semibold', x.k === g ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink-soft')}>
            {x.label}
          </Link>
        ))}
      </nav>
      <div className="card-flat overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead className="bg-zinc-50 text-left text-[12.5px] text-ink-muted">
            <tr><th className="px-4 py-2.5 font-semibold">Time (GST)</th><th className="px-4 py-2.5 font-semibold">Actor</th><th className="px-4 py-2.5 font-semibold">Action</th><th className="px-4 py-2.5 font-semibold">Record</th><th className="px-4 py-2.5 font-semibold">Details</th></tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const cn = cases.find((c) => c.id === e.entityId)?.caseNumber;
              return (
                <tr key={e.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">{e.createdAt.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Dubai' })}</td>
                  <td className="px-4 py-2.5">{e.actorEmail ?? <span className="text-ink-muted">system</span>}</td>
                  <td className="px-4 py-2.5"><code className="font-mono text-[12.5px]">{e.action}</code></td>
                  <td className="px-4 py-2.5">{cn ? <Link className="link" href={`/app/${orgId}/cases/${e.entityId}`}>{cn}</Link> : <span className="text-ink-muted">{e.entityType ?? '—'}</span>}</td>
                  <td className="max-w-[320px] px-4 py-2.5 text-[12.5px] text-ink-muted">{e.reason ? <span className="block text-ink-soft">“{e.reason.slice(0, 160)}”</span> : null}{e.changedFields ? <code className="block break-words font-mono">{JSON.stringify(e.changedFields).slice(0, 200)}</code> : null}</td>
                </tr>
              );
            })}
            {events.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted">No events for this filter.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-[14px]">
          {page > 1 ? <Link className="link" href={href(page - 1)}>Newer</Link> : <span />}
          <span className="text-ink-muted">Page {page} of {pages}</span>
          {page < pages ? <Link className="link" href={href(page + 1)}>Older</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

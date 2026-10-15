import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { cx } from '@/components/ui';
import { formatDate, msg, translateText } from '@/lib/i18n/core';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Audit trail') };
}
export const dynamic = 'force-dynamic';

const GROUPS = [
  { k: '', label: msg('Everything') },
  { k: 'case', label: msg('Cases') },
  { k: 'analysis', label: msg('Analysis') },
  { k: 'agent', label: msg('Agent') },
  { k: 'verification', label: msg('Verification') },
  { k: 'review', label: msg('Decisions') },
  { k: 'supplier', label: msg('Suppliers') },
  { k: 'membership', label: msg('Members') },
  { k: 'invitation', label: msg('Invitations') },
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
  const { t, locale } = await getT();
  const href = (p: number, gg = g) => `/app/${orgId}/admin/audit?${new URLSearchParams({ ...(gg ? { g: gg } : {}), ...(p > 1 ? { p: String(p) } : {}) })}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-sub text-[22px]">{t('Audit trail')}</h2>
          <p className="text-[14px] text-ink-muted">{t('Append-only record of actions in this organization. It cannot be edited from the application.')}</p>
        </div>
        <p className="text-[13px] text-ink-muted">{t('Events: {n}', { n: total })}</p>
      </div>
      <nav aria-label={t('Filter events')} className="flex flex-wrap gap-1.5">
        {GROUPS.map((x) => (
          <Link key={x.k} href={href(1, x.k)} aria-current={x.k === g ? 'true' : undefined} className={cx('border px-3 py-1 text-[13px] font-semibold', x.k === g ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink-soft')}>
            {t(x.label)}
          </Link>
        ))}
      </nav>
      <div className="card-flat overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead className="bg-mist text-start text-[12.5px] text-ink-muted">
            <tr><th className="px-4 py-2.5 text-start font-semibold">{t('Time (GST)')}</th><th className="px-4 py-2.5 text-start font-semibold">{t('Actor')}</th><th className="px-4 py-2.5 text-start font-semibold">{t('Action')}</th><th className="px-4 py-2.5 text-start font-semibold">{t('Record')}</th><th className="px-4 py-2.5 text-start font-semibold">{t('Details')}</th></tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const cn = cases.find((c) => c.id === e.entityId)?.caseNumber;
              return (
                <tr key={e.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">{formatDate(locale, e.createdAt, { dateStyle: 'short', timeStyle: 'medium' })}</td>
                  <td className="px-4 py-2.5">{e.actorEmail ? <span dir="ltr">{e.actorEmail}</span> : <span className="text-ink-muted">{t('system')}</span>}</td>
                  <td className="px-4 py-2.5"><code className="font-mono text-[12.5px]" dir="ltr">{e.action}</code></td>
                  <td className="px-4 py-2.5">{cn ? <Link className="link" dir="ltr" href={`/app/${orgId}/cases/${e.entityId}`}>{cn}</Link> : <span className="text-ink-muted">{e.entityType ?? '—'}</span>}</td>
                  <td className="max-w-[320px] px-4 py-2.5 text-[12.5px] text-ink-muted">{e.reason ? <span className="block text-ink-soft" dir="auto">“{translateText(locale, e.reason).slice(0, 160)}”</span> : null}{e.changedFields ? <code className="block break-words font-mono" dir="ltr">{JSON.stringify(e.changedFields).slice(0, 200)}</code> : null}</td>
                </tr>
              );
            })}
            {events.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted">{t('No events for this filter.')}</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label={t('Pages')} className="flex items-center justify-between text-[14px]">
          {page > 1 ? <Link className="link" href={href(page - 1)}>{t('Newer')}</Link> : <span />}
          <span className="text-ink-muted">{t('Page {a} of {b}', { a: page, b: pages })}</span>
          {page < pages ? <Link className="link" href={href(page + 1)}>{t('Older')}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

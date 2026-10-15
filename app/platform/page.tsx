import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/auth/session';
import { getOperationalMetrics, listOrganizations } from '@/lib/services/platform';
import { getProviderConfig } from '@/lib/ai/provider';
import { OrgStatusControl } from '@/components/platform/org-status';
import { Notice, StatusBadge } from '@/components/ui';
import { CASE_STATUSES } from '@/lib/constants';

export const metadata: Metadata = { title: 'Platform operations' };
export const dynamic = 'force-dynamic';

export default async function PlatformHome() {
  const user = await requirePageUser('/platform');
  const [orgs, m] = await Promise.all([listOrganizations(user), getOperationalMetrics(user)]);
  const provider = getProviderConfig();
  const calls = m.modelCalls.reduce((n, x) => n + x._count, 0);
  const failed = m.modelCalls.filter((x) => x.status === 'FAILED').reduce((n, x) => n + x._count, 0);
  const tokensIn = m.modelCalls.reduce((n, x) => n + (x._sum.inputTokens ?? 0), 0);
  const tokensOut = m.modelCalls.reduce((n, x) => n + (x._sum.outputTokens ?? 0), 0);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="t-headline">Platform operations</h1>
        <Notice tone="info" className="mt-4 max-w-3xl">Organization metadata and aggregate counts only. Documents, bank details, findings and case narratives are not available here. Customer-content support access is not part of this version.</Notice>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Organizations', orgs.length],
          ['Users', m.users],
          ['Model calls (30 days)', calls],
          ['Failed model calls (30 days)', failed],
        ].map(([k, v]) => (
          <div key={k as string} className="card p-5"><p className="t-caption text-ink-muted">{k}</p><p className="text-[30px] font-bold tracking-[-0.03em] tabular-nums">{v}</p></div>
        ))}
      </div>
      <section className="card overflow-x-auto p-0">
        <div className="p-6 pb-3"><h2 className="t-sub text-[19px]">Organizations and service status</h2></div>
        <table className="w-full min-w-[760px] text-[14px]">
          <thead className="bg-zinc-50 text-left text-[12.5px] text-ink-muted"><tr><th className="px-6 py-2.5">Organization</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Members</th><th className="px-3 py-2.5">Cases (open)</th><th className="px-3 py-2.5">Retention</th><th className="px-6 py-2.5 text-right">Action</th></tr></thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="px-6 py-3"><span className="font-semibold">{o.name}</span><span className="block text-[12px] text-ink-muted">since {o.createdAt.toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai' })}</span></td>
                <td className="px-3 py-3"><span className={o.status === 'ACTIVE' ? 'font-semibold' : 'font-semibold text-red-700'}>{o.status.toLowerCase()}</span></td>
                <td className="px-3 py-3 tabular-nums">{o.members}</td>
                <td className="px-3 py-3 tabular-nums">{o.cases} ({o.openCases})</td>
                <td className="px-3 py-3">{o.retentionDays} days</td>
                <td className="px-6 py-3 text-right"><OrgStatusControl orgId={o.id} status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">Workflow volume (all organizations)</h2>
          <ul className="mt-4 divide-y divide-line text-[14px]">
            {CASE_STATUSES.map((s) => (
              <li key={s} className="flex items-center justify-between py-2"><StatusBadge status={s} /><span className="font-bold tabular-nums">{m.caseStatus.find((x) => x.status === s)?._count ?? 0}</span></li>
            ))}
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">Model usage (30 days)</h2>
          <p className="mt-1 text-[13px] text-ink-muted">Configured analysis provider: <strong>{provider.label}</strong>{provider.kind !== 'local' ? <> · model <code className="font-mono">{provider.model}</code></> : null}.</p>
          <table className="mt-4 w-full text-[13.5px]">
            <thead className="text-left text-[12px] text-ink-muted"><tr><th className="pb-1">Provider / model</th><th className="pb-1">Status</th><th className="pb-1 text-right">Calls</th><th className="pb-1 text-right">Avg ms</th></tr></thead>
            <tbody>
              {m.modelCalls.length === 0 && <tr><td colSpan={4} className="py-3 text-ink-muted">No external model calls yet.</td></tr>}
              {m.modelCalls.map((x, i) => (
                <tr key={i} className="border-t border-line"><td className="py-1.5">{x.provider} · <code className="font-mono text-[12px]">{x.model}</code></td><td>{x.status.toLowerCase()}</td><td className="text-right tabular-nums">{x._count}</td><td className="text-right tabular-nums">{Math.round(x._avg.durationMs ?? 0)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[13px] text-ink-muted">Tokens: {tokensIn.toLocaleString('en-US')} in · {tokensOut.toLocaleString('en-US')} out. Estimated cost depends on your provider’s current price list; multiply these totals by its per-token rates.</p>
        </section>
      </div>
      <section className="card p-6">
        <h2 className="t-sub text-[19px]">Recent failures (sanitized)</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead className="text-left text-[12px] text-ink-muted"><tr><th className="pb-1">Time</th><th className="pb-1">Organization</th><th className="pb-1">Kind</th><th className="pb-1">Code / reason</th><th className="pb-1">Reference</th></tr></thead>
            <tbody>
              {[
                ...m.failures.map((f) => ({ t: f.createdAt, org: f.orgId, kind: `model · ${f.purpose}`, code: `${f.provider} ${f.errorCode ?? ''}`, ref: f.errorRef })),
                ...m.failedAnalyses.map((f) => ({ t: f.createdAt, org: f.orgId, kind: 'analysis', code: f.provider, ref: f.errorRef })),
                ...m.failedAgent.map((f) => ({ t: f.startedAt, org: f.orgId, kind: `agent · ${f.status.toLowerCase()}`, code: (f.stopReason ?? '').slice(0, 60), ref: null })),
              ]
                .sort((a, b) => +b.t - +a.t)
                .slice(0, 30)
                .map((f, i) => (
                  <tr key={i} className="border-t border-line"><td className="py-1.5 text-ink-muted">{f.t.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Dubai' })}</td><td>{m.orgName[f.org ?? ''] ?? '—'}</td><td>{f.kind}</td><td>{f.code}</td><td className="font-mono text-[12px]">{f.ref ?? '—'}</td></tr>
                ))}
              {m.failures.length + m.failedAnalyses.length + m.failedAgent.length === 0 && <tr><td colSpan={5} className="py-3 text-ink-muted">No failures recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

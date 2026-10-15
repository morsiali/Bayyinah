import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { requirePageUser } from '@/lib/auth/session';
import { getOperationalMetrics, listOrganizations } from '@/lib/services/platform';
import { getProviderConfig } from '@/lib/ai/provider';
import { OrgStatusControl } from '@/components/platform/org-status';
import { Notice, StatusBadge } from '@/components/ui';
import { CASE_STATUSES } from '@/lib/constants';
import { formatDate, formatNumber, translateText } from '@/lib/i18n/core';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Platform operations') };
}
export const dynamic = 'force-dynamic';

export default async function PlatformHome() {
  const user = await requirePageUser('/platform');
  const [orgs, m] = await Promise.all([listOrganizations(user), getOperationalMetrics(user)]);
  const provider = getProviderConfig();
  const { t, locale } = await getT();
  const calls = m.modelCalls.reduce((n, x) => n + x._count, 0);
  const failed = m.modelCalls.filter((x) => x.status === 'FAILED').reduce((n, x) => n + x._count, 0);
  const tokensIn = m.modelCalls.reduce((n, x) => n + (x._sum.inputTokens ?? 0), 0);
  const tokensOut = m.modelCalls.reduce((n, x) => n + (x._sum.outputTokens ?? 0), 0);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="t-headline">{t('Platform operations')}</h1>
        <Notice tone="info" className="mt-4 max-w-3xl">{t('Organization metadata and aggregate counts only. Documents, bank details, findings and case narratives are not available here. Customer-content support access is not part of this version.')}</Notice>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          [t('Organizations'), orgs.length],
          [t('Users'), m.users],
          [t('Model calls (30 days)'), calls],
          [t('Failed model calls (30 days)'), failed],
        ].map(([k, v]) => (
          <div key={k as string} className="card p-5"><p className="t-eyebrow">{k}</p><p className="mt-2 font-mono text-[30px] font-semibold tabular-nums">{v}</p></div>
        ))}
      </div>
      <section className="card overflow-x-auto p-0">
        <div className="p-6 pb-3"><h2 className="t-sub text-[19px]">{t('Organizations and service status')}</h2></div>
        <table className="w-full min-w-[760px] text-[14px]">
          <thead className="bg-mist text-start text-[12.5px] text-ink-muted"><tr><th className="px-6 py-2.5 text-start">{t('Organization')}</th><th className="px-3 py-2.5 text-start">{t('Status')}</th><th className="px-3 py-2.5 text-start">{t('Members')}</th><th className="px-3 py-2.5 text-start">{t('Cases (open)')}</th><th className="px-3 py-2.5 text-start">{t('Retention')}</th><th className="px-6 py-2.5 text-end">{t('Action')}</th></tr></thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="px-6 py-3"><bdi className="font-semibold">{o.name}</bdi><span className="block text-[12px] text-ink-muted">{t('since {date}', { date: formatDate(locale, o.createdAt, { dateStyle: 'medium' }) })}</span></td>
                <td className="px-3 py-3"><span className={o.status === 'ACTIVE' ? 'font-semibold' : 'font-semibold text-red-700'}>{o.status === 'ACTIVE' ? t('active') : t('suspended')}</span></td>
                <td className="px-3 py-3 tabular-nums">{o.members}</td>
                <td className="px-3 py-3 tabular-nums">{o.cases} ({o.openCases})</td>
                <td className="px-3 py-3">{t('{n} days', { n: o.retentionDays })}</td>
                <td className="px-6 py-3 text-end"><OrgStatusControl orgId={o.id} status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">{t('Workflow volume (all organizations)')}</h2>
          <ul className="mt-4 divide-y divide-line text-[14px]">
            {CASE_STATUSES.map((s) => (
              <li key={s} className="flex items-center justify-between py-2"><StatusBadge status={s} /><span className="font-mono font-semibold tabular-nums">{m.caseStatus.find((x) => x.status === s)?._count ?? 0}</span></li>
            ))}
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">{t('Model usage (30 days)')}</h2>
          <p className="mt-1 text-[13px] text-ink-muted">{t('Configured analysis provider:')} <strong>{translateText(locale, provider.label)}</strong>{provider.kind !== 'local' ? <> · {t('model')} <code className="font-mono" dir="ltr">{provider.model}</code></> : null}.</p>
          <table className="mt-4 w-full text-[13.5px]">
            <thead className="text-start text-[12px] text-ink-muted"><tr><th className="pb-1 text-start">{t('Provider / model')}</th><th className="pb-1 text-start">{t('Status')}</th><th className="pb-1 text-end">{t('Calls')}</th><th className="pb-1 text-end">{t('Avg ms')}</th></tr></thead>
            <tbody>
              {m.modelCalls.length === 0 && <tr><td colSpan={4} className="py-3 text-ink-muted">{t('No external model calls yet.')}</td></tr>}
              {m.modelCalls.map((x, i) => (
                <tr key={i} className="border-t border-line"><td className="py-1.5" dir="ltr">{x.provider} · <code className="font-mono text-[12px]">{x.model}</code></td><td>{x.status === 'FAILED' ? t('failed') : t('succeeded')}</td><td className="text-end tabular-nums">{x._count}</td><td className="text-end tabular-nums">{Math.round(x._avg.durationMs ?? 0)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[13px] text-ink-muted">{t('Tokens: {i} in · {o} out. Estimated cost depends on your provider’s current price list; multiply these totals by its per-token rates.', { i: formatNumber(locale, tokensIn), o: formatNumber(locale, tokensOut) })}</p>
        </section>
      </div>
      <section className="card p-6">
        <h2 className="t-sub text-[19px]">{t('Recent failures (sanitized)')}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead className="text-start text-[12px] text-ink-muted"><tr><th className="pb-1 text-start">{t('Time')}</th><th className="pb-1 text-start">{t('Organization')}</th><th className="pb-1 text-start">{t('Kind')}</th><th className="pb-1 text-start">{t('Code / reason')}</th><th className="pb-1 text-start">{t('Reference')}</th></tr></thead>
            <tbody>
              {[
                ...m.failures.map((f) => ({ t: f.createdAt, org: f.orgId, kind: `${t('model')} · ${f.purpose}`, code: `${f.provider} ${f.errorCode ?? ''}`, ref: f.errorRef })),
                ...m.failedAnalyses.map((f) => ({ t: f.createdAt, org: f.orgId, kind: t('analysis'), code: f.provider, ref: f.errorRef })),
                ...m.failedAgent.map((f) => ({ t: f.startedAt, org: f.orgId, kind: `${t('agent')} · ${f.status.toLowerCase()}`, code: (f.stopReason ?? '').slice(0, 60), ref: null })),
              ]
                .sort((a, b) => +b.t - +a.t)
                .slice(0, 30)
                .map((f, i) => (
                  <tr key={i} className="border-t border-line"><td className="py-1.5 text-ink-muted">{formatDate(locale, f.t, { dateStyle: 'short', timeStyle: 'short' })}</td><td>{m.orgName[f.org ?? ''] ?? '—'}</td><td>{f.kind}</td><td>{f.code}</td><td className="font-mono text-[12px]">{f.ref ?? '—'}</td></tr>
                ))}
              {m.failures.length + m.failedAnalyses.length + m.failedAgent.length === 0 && <tr><td colSpan={5} className="py-3 text-ink-muted">{t('No failures recorded.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

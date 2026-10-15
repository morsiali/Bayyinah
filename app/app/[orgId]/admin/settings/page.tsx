import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getSettings, SETTING_DEFS, SETTING_KEYS } from '@/lib/settings';
import { OrgSettingsForm } from '@/components/admin/settings-form';

export const metadata: Metadata = { title: 'Settings & limits' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const [org, settings] = await Promise.all([prisma.organization.findUniqueOrThrow({ where: { id: orgId } }), getSettings()]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <h2 className="t-sub text-[19px]">Organization profile</h2>
        <div className="mt-4"><OrgSettingsForm orgId={orgId} name={org.name} retentionDays={org.retentionDays} /></div>
      </section>
      <section className="card p-6">
        <h2 className="t-sub text-[19px]">Service limits</h2>
        <p className="mt-1 text-[13px] text-ink-muted">Configured by platform operations for all organizations.</p>
        <dl className="mt-4 divide-y divide-line text-[14px]">
          {SETTING_KEYS.map((k) => (
            <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">{SETTING_DEFS[k].label}</dt><dd className="font-semibold tabular-nums">{settings[k]}</dd></div>
          ))}
        </dl>
      </section>
    </div>
  );
}

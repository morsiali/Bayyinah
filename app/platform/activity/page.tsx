import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { requirePageUser } from '@/lib/auth/session';
import { listPlatformEvents } from '@/lib/services/platform';
import { formatDate } from '@/lib/i18n/core';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Admin activity') };
}
export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const user = await requirePageUser('/platform/activity');
  const events = await listPlatformEvents(user);
  const { t, locale } = await getT();
  return (
    <div>
      <h1 className="t-headline">{t('Administrative action history')}</h1>
      <div className="card-flat mt-6 overflow-x-auto">
        <table className="w-full min-w-[700px] text-[13.5px]">
          <thead className="bg-mist text-start text-[12.5px] text-ink-muted"><tr><th className="px-4 py-2.5 text-start">{t('Time (GST)')}</th><th className="px-4 py-2.5 text-start">{t('Actor')}</th><th className="px-4 py-2.5 text-start">{t('Action')}</th><th className="px-4 py-2.5 text-start">{t('Target')}</th><th className="px-4 py-2.5 text-start">{t('Details')}</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-line align-top">
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">{formatDate(locale, e.createdAt, { dateStyle: 'short', timeStyle: 'medium' })}</td>
                <td className="px-4 py-2.5" dir="ltr">{e.actorEmail}</td>
                <td className="px-4 py-2.5"><code className="font-mono text-[12.5px]" dir="ltr">{e.action}</code></td>
                <td className="px-4 py-2.5 text-ink-muted">{e.targetType ?? '—'}</td>
                <td className="max-w-[360px] break-words px-4 py-2.5 font-mono text-[12px] text-ink-muted" dir="ltr">{e.details ? JSON.stringify(e.details).slice(0, 240) : '—'}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted">{t('No administrative actions recorded yet.')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

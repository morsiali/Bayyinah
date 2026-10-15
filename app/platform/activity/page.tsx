import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/auth/session';
import { listPlatformEvents } from '@/lib/services/platform';

export const metadata: Metadata = { title: 'Admin activity' };
export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const user = await requirePageUser('/platform/activity');
  const events = await listPlatformEvents(user);
  return (
    <div>
      <h1 className="t-headline">Administrative action history</h1>
      <div className="card-flat mt-6 overflow-x-auto">
        <table className="w-full min-w-[700px] text-[13.5px]">
          <thead className="bg-zinc-50 text-left text-[12.5px] text-ink-muted"><tr><th className="px-4 py-2.5">Time (GST)</th><th className="px-4 py-2.5">Actor</th><th className="px-4 py-2.5">Action</th><th className="px-4 py-2.5">Target</th><th className="px-4 py-2.5">Details</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-line align-top">
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">{e.createdAt.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Dubai' })}</td>
                <td className="px-4 py-2.5">{e.actorEmail}</td>
                <td className="px-4 py-2.5"><code className="font-mono text-[12.5px]">{e.action}</code></td>
                <td className="px-4 py-2.5 text-ink-muted">{e.targetType ?? '—'}</td>
                <td className="max-w-[360px] break-words px-4 py-2.5 font-mono text-[12px] text-ink-muted">{e.details ? JSON.stringify(e.details).slice(0, 240) : '—'}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted">No administrative actions recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

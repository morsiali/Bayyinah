import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StatusBadge, Ltr } from '@/components/ui';
import { REQUEST_TYPE_LABELS, type RequestType } from '@/lib/constants';

export type CaseRow = { id: string; caseNumber: string; status: string; requestType: string; updatedAt: Date | string; supplier: { name: string }; createdBy?: string };

function rel(d: Date | string) {
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' });
}

export function CaseTable({ orgId, rows, note, from }: { orgId: string; rows: CaseRow[]; note?: (r: CaseRow) => string | null; from?: string }) {
  return (
    <ul className="card-flat divide-y divide-line overflow-hidden">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/app/${orgId}/cases/${r.id}${from ? `?from=${from}` : ''}`} className="group grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 hover:bg-zinc-50 md:grid-cols-[180px_1fr_200px_110px_20px]">
            <span className="text-[13px] font-semibold text-ink-soft"><Ltr mono>{r.caseNumber}</Ltr></span>
            <span className="col-span-2 min-w-0 md:col-span-1">
              <span className="block truncate text-[15px] font-bold">{r.supplier.name}</span>
              <span className="block text-[13px] text-ink-muted">{REQUEST_TYPE_LABELS[r.requestType as RequestType]}{note?.(r) ? ` · ${note(r)}` : ''}</span>
            </span>
            <span><StatusBadge status={r.status} /></span>
            <span className="hidden text-right text-[13px] text-ink-muted md:block">{rel(r.updatedAt)}</span>
            <ArrowRight className="hidden h-4 w-4 text-ink-faint group-hover:text-brand-600 md:block" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

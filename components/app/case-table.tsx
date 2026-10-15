import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StatusBadge, Ltr } from '@/components/ui';
import { REQUEST_TYPE_LABELS, type RequestType } from '@/lib/constants';
import { formatDate, type T, type Locale } from '@/lib/i18n/core';
import { getT } from '@/lib/i18n/server';

export type CaseRow = { id: string; caseNumber: string; status: string; requestType: string; updatedAt: Date | string; supplier: { name: string }; createdBy?: string };

export function relTime(d: Date | string, t: T, locale: Locale) {
  const date = new Date(d);
  const m = Math.round((Date.now() - date.getTime()) / 60000);
  if (m < 1) return t('just now');
  if (m < 60) return t('{n} min ago', { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t('{n} h ago', { n: h });
  return formatDate(locale, date, { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function CaseTable({ orgId, rows, from }: { orgId: string; rows: CaseRow[]; from?: string }) {
  const { t, locale } = await getT();
  return (
    <ul className="card-flat divide-y divide-line overflow-hidden">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/app/${orgId}/cases/${r.id}${from ? `?from=${from}` : ''}`} className="group grid grid-cols-[1fr_auto] items-center gap-3 border-s-[3px] border-s-transparent px-5 py-4 hover:border-s-brand-600 hover:bg-mist md:grid-cols-[180px_1fr_220px_110px_20px]">
            <span className="text-[13px] font-semibold text-ink-soft"><Ltr mono>{r.caseNumber}</Ltr></span>
            <span className="col-span-2 min-w-0 md:col-span-1">
              <bdi className="block truncate text-[15px] font-semibold">{r.supplier.name}</bdi>
              <span className="block text-[13px] text-ink-muted">{t(REQUEST_TYPE_LABELS[r.requestType as RequestType] ?? r.requestType)}</span>
            </span>
            <span><StatusBadge status={r.status} /></span>
            <span className="hidden text-end text-[13px] text-ink-muted md:block">{relTime(r.updatedAt, t, locale)}</span>
            <ArrowRight className="hidden h-4 w-4 text-ink-faint group-hover:text-brand-600 md:block rtl:-scale-x-100" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { Ltr, StatusBadge, cx } from '@/components/ui';
import { REQUEST_TYPE_LABELS, isClosed, type RequestType } from '@/lib/constants';
import type { CaseData, Me, ProviderInfo } from './types';
import { SourcePanel } from './source-panel';
import { Passport } from './passport';
import { ActionPanel } from './action-panel';

export function CaseWorkspace(props: { data: CaseData; orgId: string; me: Me; reviewBlockers: string[]; provider: ProviderInfo; backHref: string; backLabel: string }) {
  const { data, orgId, backHref, backLabel } = props;
  const c = data.case;
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const [tab, setTab] = useState<'source' | 'passport' | 'action'>('action');

  const focusFinding = (id: string | null) => {
    setActiveQuote(id);
    if (!id) return;
    setTab('source');
    requestAnimationFrame(() => document.getElementById(`ev-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  return (
    <div>
      <Link href={backHref} className="text-[14px] font-semibold text-ink-muted hover:text-ink">← {backLabel}</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-caption text-ink-muted">
            <Ltr mono>{c.caseNumber}</Ltr> · {REQUEST_TYPE_LABELS[c.requestType as RequestType]} · Evidence version {data.currentVersion?.versionNumber ?? 1}
          </p>
          <h1 className="t-headline mt-1 text-[clamp(1.6rem,3vw,2.2rem)]">{c.supplier.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={c.status} className="text-[13px]" />
          {(isClosed(c.status) || c.reviews.length > 0) && (
            <Link href={`/app/${orgId}/cases/${c.id}/report`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-semibold shadow-pill hover:bg-zinc-50">
              <Printer className="h-3.5 w-3.5" aria-hidden /> Report
            </Link>
          )}
        </div>
      </div>

      <div className="-mx-4 mt-5 border-y border-line bg-canvas/95 px-4 py-2 backdrop-blur xl:hidden" role="tablist" aria-label="Case views">
        <div className="flex gap-1">
          {(
            [
              ['action', 'Next action'],
              ['passport', 'Passport'],
              ['source', 'Source'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('flex-1 rounded-full px-3 py-1.5 text-[13px] font-semibold', tab === k ? 'bg-navy text-white' : 'text-ink-muted')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)_340px]">
        <div className={cx('min-w-0', tab !== 'source' && 'hidden xl:block')}>
          <SourcePanel {...props} activeQuote={activeQuote} />
        </div>
        <div className={cx('min-w-0', tab !== 'passport' && 'hidden xl:block')}>
          <Passport {...props} onFocusFinding={focusFinding} activeQuote={activeQuote} />
        </div>
        <div className={cx('min-w-0', tab !== 'action' && 'hidden xl:block')}>
          <ActionPanel {...props} />
        </div>
      </div>
    </div>
  );
}

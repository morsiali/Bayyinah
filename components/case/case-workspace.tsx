'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { Ltr, StatusBadge, buttonClass, cx } from '@/components/ui';
import { REQUEST_TYPE_LABELS, isClosed, type RequestType } from '@/lib/constants';
import type { CaseData, Me, ProviderInfo } from './types';
import { SourcePanel } from './source-panel';
import { Passport } from './passport';
import { ActionPanel } from './action-panel';
import { useT } from '@/components/i18n';
import { msg } from '@/lib/i18n/core';

export function CaseWorkspace(props: { data: CaseData; orgId: string; me: Me; reviewBlockers: string[]; provider: ProviderInfo; backHref: string; backLabel: string }) {
  const { data, orgId, backHref, backLabel } = props;
  const c = data.case;
  const t = useT();
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
      <Link href={backHref} className="t-eyebrow hover:!text-ink"><span className="inline-block rtl:-scale-x-100">←</span> {t(backLabel)}</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-caption text-ink-muted">
            <Ltr mono>{c.caseNumber}</Ltr> · {t(REQUEST_TYPE_LABELS[c.requestType as RequestType])} · {t('Evidence version {n}', { n: data.currentVersion?.versionNumber ?? 1 })}
          </p>
          <h1 className="t-headline mt-2 text-[clamp(1.6rem,3vw,2.2rem)]" dir="auto">{c.supplier.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={c.status} className="text-[13px]" />
          {(isClosed(c.status) || c.reviews.length > 0) && (
            <Link href={`/app/${orgId}/cases/${c.id}/report`} className={buttonClass('secondary', 'sm')}>
              <Printer className="h-3.5 w-3.5" aria-hidden /> {t('Report')}
            </Link>
          )}
        </div>
      </div>

      <div className="-mx-4 mt-5 border-y border-line bg-white/95 px-4 py-2 backdrop-blur xl:hidden" role="tablist" aria-label={t('Case views')}>
        <div className="flex gap-1">
          {(
            [
              ['action', msg('Next action')],
              ['passport', msg('Passport')],
              ['source', msg('Source')],
            ] as const
          ).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('flex-1 px-3 py-1.5 text-[13px] font-semibold', tab === k ? 'bg-navy text-white' : 'text-ink-muted')}>
              {t(l)}
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

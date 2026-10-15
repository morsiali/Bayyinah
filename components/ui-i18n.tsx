'use client';

// UI primitives that carry their own words. Client components so they can read the interface language.
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { SEVERITY_LABELS, STATUS_LABELS, type CaseStatus, type Severity } from '@/lib/constants';
import { useT } from './i18n';

const STATUS_TONE: Record<CaseStatus, string> = {
  DRAFT: 'bg-mist text-ink-soft border-line-strong',
  ANALYZED: 'bg-brand-50 text-brand-800 border-brand-200',
  NEEDS_INFORMATION: 'bg-amber-50 text-amber-900 border-amber-300',
  INDEPENDENT_CHECK_REQUIRED: 'bg-amber-50 text-amber-900 border-amber-300',
  READY_FOR_REVIEW: 'bg-navy text-white border-navy',
  CLOSED_APPROVED: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  CLOSED_REJECTED: 'bg-red-50 text-red-900 border-red-300',
  CLOSED_INCONCLUSIVE: 'bg-mist text-ink-soft border-line-strong',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const t = useT();
  const s = status as CaseStatus;
  return (
    <span className={cx('inline-flex items-center rounded-sm border px-2 py-0.5 text-[12px] font-semibold leading-5', STATUS_TONE[s] ?? STATUS_TONE.DRAFT, className)}>
      {STATUS_LABELS[s] ? t(STATUS_LABELS[s]) : status}
    </span>
  );
}

const SEV_TONE: Record<Severity, string> = {
  critical: 'bg-red-50 text-red-800 border-red-300',
  warning: 'bg-red-50/60 text-red-700 border-red-200',
  review: 'bg-amber-50 text-amber-800 border-amber-300',
  info: 'bg-mist text-ink-muted border-line-strong',
};

export function SeverityBadge({ severity }: { severity: string }) {
  const t = useT();
  const s = severity as Severity;
  return (
    <span className={cx('inline-flex items-center rounded-sm border px-1.5 py-px font-mono text-[10.5px] font-semibold uppercase leading-4 tracking-[0.04em]', SEV_TONE[s] ?? SEV_TONE.info)}>
      {SEVERITY_LABELS[s] ? t(SEVERITY_LABELS[s]) : severity}
    </span>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  const t = useT();
  return (
    <div className="min-w-0">
      <dt className="t-caption text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-[15px] font-medium">{children ?? <span className="text-ink-faint">{t('Not recorded')}</span>}</dd>
    </div>
  );
}

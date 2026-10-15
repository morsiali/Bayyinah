import Link from 'next/link';
import clsx from 'clsx';
import { ArrowRight, AlertTriangle, CheckCircle2, Info, Loader2, OctagonAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { SEVERITY_LABELS, STATUS_LABELS, type CaseStatus, type Severity } from '@/lib/constants';

export const cx = clsx;

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'blue';
type Size = 'sm' | 'md' | 'lg';

const base = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-[background,box-shadow,color,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap';
const variants: Record<Variant, string> = {
  primary: 'bg-navy text-white shadow-[0_1px_0_rgba(255,255,255,.12)_inset,0_6px_16px_-6px_rgba(15,27,45,.6)] hover:bg-navy-800',
  blue: 'bg-brand-600 text-white shadow-[0_6px_16px_-6px_rgba(21,126,252,.7)] hover:bg-brand-700',
  secondary: 'bg-white text-ink border border-line shadow-pill hover:border-line-strong hover:bg-zinc-50',
  ghost: 'text-ink-soft hover:text-ink hover:bg-zinc-100',
  danger: 'bg-white text-[color:var(--danger)] border border-red-200 hover:bg-red-50',
};
const sizes: Record<Size, string> = { sm: 'h-8 px-3.5 text-[13px]', md: 'h-10 px-5 text-[14px]', lg: 'h-12 px-6 text-[15px]' };

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cx(base, variants[variant], sizes[size], className);
}

export function Button({ variant = 'primary', size = 'md', loading, arrow, className, children, ...rest }: ComponentProps<'button'> & { variant?: Variant; size?: Size; loading?: boolean; arrow?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
      {arrow && !loading && <ArrowRight className="h-4 w-4" aria-hidden />}
    </button>
  );
}

export function LinkButton({ href, variant = 'primary', size = 'md', arrow, className, children, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; arrow?: boolean }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
      {arrow && <ArrowRight className="h-4 w-4" aria-hidden />}
    </Link>
  );
}

export function Logo({ tone = 'dark', size = 'md', wordmarkClass }: { tone?: 'dark' | 'light'; size?: 'sm' | 'md'; wordmarkClass?: string }) {
  const s = size === 'sm' ? 26 : 30;
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id={`lg-${tone}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tone === 'dark' ? '#1e3a5f' : '#ffffff'} />
            <stop offset="1" stopColor={tone === 'dark' ? '#0a1220' : '#dbeefe'} />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8.5" fill={`url(#lg-${tone})`} />
        {/* A document edge with a single point of evidence */}
        <path d="M10 8.5h8.5l4 4V23a.5.5 0 0 1-.5.5H10a.5.5 0 0 1-.5-.5V9a.5.5 0 0 1 .5-.5Z" fill="none" stroke={tone === 'dark' ? '#ffffff' : '#0f1b2d'} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12.6 15.2h6.8M12.6 18.6h4.2" stroke={tone === 'dark' ? '#ffffff' : '#0f1b2d'} strokeWidth="1.8" strokeLinecap="round" opacity=".55" />
        <circle cx="22.5" cy="22.5" r="3.4" fill="#2b9aff" stroke={tone === 'dark' ? '#0a1220' : '#ffffff'} strokeWidth="1.6" />
      </svg>
      <span className={cx('font-bold tracking-[-0.03em]', wordmarkClass, size === 'sm' ? 'text-[17px]' : 'text-[19px]', tone === 'dark' ? 'text-ink' : 'text-white')}>
        Bayyinah <span className={cx('font-semibold', tone === 'dark' ? 'text-ink-faint' : 'text-white/50')} lang="ar">بيّنة</span>
      </span>
    </span>
  );
}

export function Pill({ children, dot, className }: { children: ReactNode; dot?: 'green' | 'blue' | 'amber'; className?: string }) {
  return (
    <span className={cx('pill', className)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', dot === 'green' ? 'bg-emerald-500' : dot === 'amber' ? 'bg-amber-500' : 'bg-brand-500')} aria-hidden />}
      {children}
    </span>
  );
}

export function SectionTitle({ first, second, intro, className, as: As = 'h2' }: { first: string; second?: string; intro?: ReactNode; className?: string; as?: 'h1' | 'h2' }) {
  return (
    <div className={className}>
      <As className="t-headline max-w-3xl">
        {first}
        {second && (
          <>
            <br />
            <span className="text-brand-600">{second}</span>
          </>
        )}
      </As>
      {intro && <p className="t-lead mt-4 max-w-2xl">{intro}</p>}
    </div>
  );
}

const STATUS_TONE: Record<CaseStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  ANALYZED: 'bg-brand-50 text-brand-800 border-brand-100',
  NEEDS_INFORMATION: 'bg-amber-50 text-amber-800 border-amber-200',
  INDEPENDENT_CHECK_REQUIRED: 'bg-amber-50 text-amber-800 border-amber-200',
  READY_FOR_REVIEW: 'bg-navy text-white border-navy',
  CLOSED_APPROVED: 'bg-white text-ink border-line-strong',
  CLOSED_REJECTED: 'bg-red-50 text-red-800 border-red-200',
  CLOSED_INCONCLUSIVE: 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as CaseStatus;
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold leading-5', STATUS_TONE[s] ?? STATUS_TONE.DRAFT, className)}>{STATUS_LABELS[s] ?? status}</span>;
}

const SEV_TONE: Record<Severity, string> = {
  critical: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-red-50/60 text-red-700 border-red-100',
  review: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-zinc-50 text-zinc-600 border-zinc-200',
};

export function SeverityBadge({ severity }: { severity: string }) {
  const s = severity as Severity;
  return <span className={cx('inline-flex items-center rounded-md border px-1.5 py-px text-[11px] font-bold leading-4', SEV_TONE[s] ?? SEV_TONE.info)}>{SEVERITY_LABELS[s] ?? severity}</span>;
}

export function Notice({ tone = 'info', title, children, className }: { tone?: 'info' | 'review' | 'danger' | 'done'; title?: ReactNode; children?: ReactNode; className?: string }) {
  const map = {
    info: { c: 'border-brand-100 bg-brand-50/70 text-brand-900', I: Info },
    review: { c: 'border-amber-200 bg-amber-50 text-amber-900', I: AlertTriangle },
    danger: { c: 'border-red-200 bg-red-50 text-red-900', I: OctagonAlert },
    done: { c: 'border-emerald-200 bg-emerald-50 text-emerald-900', I: CheckCircle2 },
  }[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'note'} className={cx('flex gap-3 rounded-xl border px-4 py-3 text-[14px] leading-6', map.c, className)}>
      <map.I className="mt-[3px] h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children, className }: { label: string; htmlFor: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[14px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="t-caption mt-1.5 text-ink-muted">{hint}</p>}
      {error && (
        <p className="t-caption mt-1.5 text-[color:var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card-flat flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <p className="t-sub text-[18px]">{title}</p>
      {children && <div className="mt-1.5 max-w-md text-[15px] text-ink-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Ltr({ children, mono, className }: { children: ReactNode; mono?: boolean; className?: string }) {
  return (
    <bdi dir="ltr" className={cx('ltr', mono && 'font-mono text-[0.92em] tracking-tight', className)}>
      {children}
    </bdi>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="t-caption text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-[15px] font-medium">{children ?? <span className="text-ink-faint">Not recorded</span>}</dd>
    </div>
  );
}

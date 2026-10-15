import Link from 'next/link';
import clsx from 'clsx';
import { ArrowUpRight, AlertTriangle, CheckCircle2, Info, Loader2, OctagonAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

export const cx = clsx;
export { StatusBadge, SeverityBadge, KeyValue } from './ui-i18n';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'blue' | 'light' | 'outline-light';
type Size = 'sm' | 'md' | 'lg';

const base = 'btn inline-flex items-center justify-center gap-2 rounded-lg font-bold uppercase tracking-[0.08em] transition-[background,border-color,color,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap';
const variants: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-700',
  blue: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-ink border border-line-strong hover:border-ink',
  ghost: 'text-ink-soft hover:text-ink hover:bg-mist',
  danger: 'bg-white text-[color:var(--danger)] border border-red-200 hover:border-red-400 hover:bg-red-50',
  light: 'bg-white text-ink hover:bg-white/90',
  'outline-light': 'border border-white/60 text-white hover:bg-white/10',
};
const sizes: Record<Size, string> = { sm: 'h-8 px-3.5 text-[11.5px]', md: 'h-10 px-5 text-[12px]', lg: 'h-12 px-6 text-[12.5px]' };

/** Directional icons point the other way in Arabic. */
export const flipRtl = 'rtl:-scale-x-100';

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cx(base, variants[variant], sizes[size], className);
}

export function Button({ variant = 'primary', size = 'md', loading, arrow, className, children, ...rest }: ComponentProps<'button'> & { variant?: Variant; size?: Size; loading?: boolean; arrow?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
      {arrow && !loading && <ArrowUpRight className={cx('h-4 w-4', flipRtl)} aria-hidden />}
    </button>
  );
}

export function LinkButton({ href, variant = 'primary', size = 'md', arrow, className, children, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; arrow?: boolean }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
      {arrow && <ArrowUpRight className={cx('h-4 w-4', flipRtl)} aria-hidden />}
    </Link>
  );
}

export function Logo({ tone = 'dark', size = 'md', wordmarkClass }: { tone?: 'dark' | 'light'; size?: 'sm' | 'md'; wordmarkClass?: string }) {
  const s = size === 'sm' ? 26 : 30;
  const fg = tone === 'dark' ? '#0a0a14' : '#ffffff';
  return (
    <span className="inline-flex items-center gap-2.5" dir="ltr">
      <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id={`lg-${tone}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2b7ee8" />
            <stop offset=".5" stopColor="#6d5aff" />
            <stop offset="1" stopColor="#06d98a" />
          </linearGradient>
        </defs>
        {/* A document edge with a single point of evidence */}
        <path d="M7 4h12.5L26 10.5V28H7Z" fill="none" stroke={tone === 'dark' ? `url(#lg-${tone})` : fg} strokeWidth="2.4" strokeLinejoin="miter" />
        <path d="M11 14h10M11 18.5h6" stroke={tone === 'dark' ? `url(#lg-${tone})` : fg} strokeWidth="2.4" />
        <rect x="18.5" y="20.5" width="7.5" height="7.5" fill={tone === 'dark' ? '#06d98a' : '#ffffff'} />
      </svg>
      <span className={cx('font-semibold tracking-[-0.02em]', wordmarkClass, size === 'sm' ? 'text-[18px]' : 'text-[21px]', tone === 'dark' ? 'text-ink' : 'text-white')}>
        Bayyinah <span className={cx('font-arabic font-bold', tone === 'dark' ? 'text-ink-faint' : 'text-white/60')} lang="ar">بيّنة</span>
      </span>
    </span>
  );
}

export function Pill({ children, dot, className }: { children: ReactNode; dot?: 'green' | 'blue' | 'amber'; className?: string }) {
  return (
    <span className={cx('pill', className)}>
      {dot && <span className={cx('h-1.5 w-1.5', dot === 'green' ? 'bg-signal-green' : dot === 'amber' ? 'bg-signal-amber' : 'bg-brand-600')} aria-hidden />}
      {children}
    </span>
  );
}

export function Eyebrow({ label, index, className, tone = 'dark' }: { label: string; index?: string; className?: string; tone?: 'dark' | 'light' }) {
  return (
    <div className={cx('t-eyebrow flex items-center justify-between gap-4', tone === 'light' && '!text-white/55', className)}>
      <span>/ {label}</span>
      {index && <span className="ltr" dir="ltr">[ {index} ]</span>}
    </div>
  );
}

export function SectionTitle({ first, second, intro, className, as: As = 'h2', id }: { first: string; second?: string; intro?: ReactNode; className?: string; as?: 'h1' | 'h2'; id?: string }) {
  return (
    <div className={className}>
      <As id={id} className="t-headline max-w-4xl">
        {first} {second && <span className="text-brand-600">{second}</span>}
      </As>
      {intro && <p className="t-lead mt-5 max-w-3xl">{intro}</p>}
    </div>
  );
}

export function Notice({ tone = 'info', title, children, className }: { tone?: 'info' | 'review' | 'danger' | 'done'; title?: ReactNode; children?: ReactNode; className?: string }) {
  const map = {
    info: { c: 'border-brand-600 bg-brand-50/60 text-ink', I: Info },
    review: { c: 'border-signal-amber bg-amber-50/70 text-amber-950', I: AlertTriangle },
    danger: { c: 'border-signal-red bg-red-50/70 text-red-950', I: OctagonAlert },
    done: { c: 'border-signal-green bg-emerald-50/60 text-emerald-950', I: CheckCircle2 },
  }[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'note'} className={cx('flex gap-3 border-s-[3px] px-4 py-3 text-[14px] leading-6', map.c, className)}>
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

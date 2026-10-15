'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui';

export function WorkspaceTabs({ tabs, mobile, label }: { tabs: { href: string; label: string }[]; mobile?: boolean; label: string }) {
  const path = usePathname() ?? '';
  return (
    <nav aria-label={label} className={cx(mobile ? 'flex gap-1 overflow-x-auto' : 'hidden items-center gap-1 lg:flex')}>
      {tabs.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined} className={cx('whitespace-nowrap border-b-2 px-3 py-1.5 text-[14px] font-semibold transition-colors', active ? 'border-brand-600 text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

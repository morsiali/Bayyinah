'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui';

export function WorkspaceTabs({ tabs, mobile }: { tabs: { href: string; label: string }[]; mobile?: boolean }) {
  const path = usePathname() ?? '';
  return (
    <nav aria-label="Workspace" className={cx(mobile ? 'flex gap-1 overflow-x-auto' : 'hidden items-center gap-1 lg:flex')}>
      {tabs.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined} className={cx('whitespace-nowrap rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-colors', active ? 'bg-navy text-white' : 'text-ink-muted hover:bg-zinc-100 hover:text-ink')}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

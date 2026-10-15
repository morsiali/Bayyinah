'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui';

export function PlatformNav() {
  const path = usePathname();
  const items = [
    { href: '/platform', label: 'Overview' },
    { href: '/platform/settings', label: 'Limits' },
    { href: '/platform/activity', label: 'Admin activity' },
  ];
  return (
    <nav aria-label="Platform" className="hidden gap-1 md:flex">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={path === i.href ? 'page' : undefined} className={cx('rounded-full px-3 py-1.5 text-[14px] font-semibold', path === i.href ? 'bg-white text-navy' : 'text-white/70 hover:text-white')}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

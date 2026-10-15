'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui';
import { useT } from '@/components/i18n';

export function PlatformNav() {
  const path = usePathname();
  const t = useT();
  const items = [
    { href: '/platform', label: t('Overview') },
    { href: '/platform/settings', label: t('Limits') },
    { href: '/platform/activity', label: t('Admin activity') },
  ];
  return (
    <nav aria-label={t('Platform')} className="hidden gap-1 md:flex">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={path === i.href ? 'page' : undefined} className={cx('border-b-2 px-3 py-1.5 text-[14px] font-semibold', path === i.href ? 'border-signal-green text-white' : 'border-transparent text-white/70 hover:text-white')}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

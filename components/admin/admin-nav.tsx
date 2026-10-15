'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui';

export function AdminNav({ orgId }: { orgId: string }) {
  const path = usePathname() ?? '';
  const items = [
    { href: `/app/${orgId}/admin`, label: 'Overview', exact: true },
    { href: `/app/${orgId}/admin/suppliers`, label: 'Suppliers' },
    { href: `/app/${orgId}/admin/members`, label: 'Members & invitations' },
    { href: `/app/${orgId}/admin/audit`, label: 'Audit trail' },
    { href: `/app/${orgId}/admin/settings`, label: 'Settings & limits' },
  ];
  return (
    <nav aria-label="Administration" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? 'page' : undefined} className={cx('whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[14px] font-semibold', active ? 'border-navy bg-white text-ink shadow-pill' : 'border-transparent text-ink-muted hover:text-ink')}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

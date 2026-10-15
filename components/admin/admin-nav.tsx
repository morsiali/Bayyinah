'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui';
import { useT } from '@/components/i18n';

export function AdminNav({ orgId }: { orgId: string }) {
  const path = usePathname() ?? '';
  const t = useT();
  const items = [
    { href: `/app/${orgId}/admin`, label: t('Overview'), exact: true },
    { href: `/app/${orgId}/admin/suppliers`, label: t('Suppliers') },
    { href: `/app/${orgId}/admin/members`, label: t('Members & invitations') },
    { href: `/app/${orgId}/admin/audit`, label: t('Audit trail') },
    { href: `/app/${orgId}/admin/settings`, label: t('Settings & limits') },
  ];
  return (
    <nav aria-label={t('Administration')} className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? 'page' : undefined} className={cx('whitespace-nowrap border-b-2 px-3 py-1.5 text-[14px] font-semibold', active ? 'border-brand-600 text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

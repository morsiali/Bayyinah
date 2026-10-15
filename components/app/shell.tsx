import Link from 'next/link';
import type { ReactNode } from 'react';
import { Building2, ChevronDown, Server } from 'lucide-react';
import { Logo, cx } from '@/components/ui';
import { LogoutButton } from './logout-button';
import { WorkspaceTabs } from './workspace-tabs';
import type { Role } from '@/lib/constants';

export type ShellOrg = { orgId: string; name: string; roles: Role[] };

export function AppShell({ user, orgs, current, isPlatformAdmin, children }: { user: { name: string; email: string }; orgs: ShellOrg[]; current?: ShellOrg; isPlatformAdmin?: boolean; children: ReactNode }) {
  const tabs = current
    ? [
        ...(current.roles.includes('PREPARER') ? [{ href: `/app/${current.orgId}/prepare`, label: 'Prepare cases' }] : []),
        ...(current.roles.includes('REVIEWER') ? [{ href: `/app/${current.orgId}/review`, label: 'Review cases' }] : []),
        ...(current.roles.includes('ORG_ADMIN') ? [{ href: `/app/${current.orgId}/admin`, label: 'Manage organization' }] : []),
      ]
    : [];
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:gap-3 md:px-6">
          <Link href="/app" aria-label="All organizations" className="shrink-0 rounded-lg">
            <Logo size="sm" wordmarkClass="hidden sm:inline" />
          </Link>
          <span className="hidden h-6 w-px bg-line sm:block" aria-hidden />
          <details className="relative">
            <summary className="flex max-w-[180px] cursor-pointer sm:max-w-[240px] list-none items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[14px] font-semibold shadow-pill [&::-webkit-details-marker]:hidden" aria-label="Switch organization">
              <Building2 className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              <span className="truncate">{current?.name ?? 'Choose organization'}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
            </summary>
            <div className="card absolute left-0 top-11 z-50 w-72 p-2">
              <p className="t-caption px-2 pb-1 pt-1 text-ink-muted">Your organizations</p>
              {orgs.map((o) => (
                <Link key={o.orgId} href={`/app/${o.orgId}`} className={cx('block rounded-lg px-2.5 py-2 text-[14px] hover:bg-zinc-50', o.orgId === current?.orgId && 'bg-brand-50 font-semibold text-brand-800')}>
                  {o.name}
                </Link>
              ))}
              <div className="my-1 border-t border-line" />
              <Link href="/app?create=1" className="block rounded-lg px-2.5 py-2 text-[14px] font-semibold text-brand-700 hover:bg-zinc-50">
                Create another organization
              </Link>
            </div>
          </details>
          {tabs.length > 0 && <WorkspaceTabs tabs={tabs} />}
          <div className="ml-auto flex items-center gap-2">
            {isPlatformAdmin && (
              <Link href="/platform" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink md:inline-flex">
                <Server className="h-4 w-4" aria-hidden /> Platform
              </Link>
            )}
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-[13px] font-semibold">{user.name}</p>
              <p className="text-[12px] text-ink-muted">{user.email}</p>
            </div>
            <LogoutButton compact label="Sign out" />
          </div>
        </div>
        {tabs.length > 0 && (
          <div className="border-t border-line px-4 py-2 lg:hidden">
            <WorkspaceTabs tabs={tabs} mobile />
          </div>
        )}
      </header>
      <main id="main" className="mx-auto max-w-[1440px] px-4 py-8 md:px-6">
        {children}
      </main>
    </div>
  );
}

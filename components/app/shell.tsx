import Link from 'next/link';
import type { ReactNode } from 'react';
import { Building2, ChevronDown, Server } from 'lucide-react';
import { Logo, cx } from '@/components/ui';
import { LanguageSwitch } from '@/components/i18n';
import { getT } from '@/lib/i18n/server';
import { LogoutButton } from './logout-button';
import { WorkspaceTabs } from './workspace-tabs';
import type { Role } from '@/lib/constants';

export type ShellOrg = { orgId: string; name: string; roles: Role[] };

export async function AppShell({ user, orgs, current, isPlatformAdmin, children }: { user: { name: string; email: string }; orgs: ShellOrg[]; current?: ShellOrg; isPlatformAdmin?: boolean; children: ReactNode }) {
  const { t } = await getT();
  const tabs = current
    ? [
        ...(current.roles.includes('PREPARER') ? [{ href: `/app/${current.orgId}/prepare`, label: t('Prepare cases') }] : []),
        ...(current.roles.includes('REVIEWER') ? [{ href: `/app/${current.orgId}/review`, label: t('Review cases') }] : []),
        ...(current.roles.includes('ORG_ADMIN') ? [{ href: `/app/${current.orgId}/admin`, label: t('Manage organization') }] : []),
      ]
    : [];
  return (
    <div className="min-h-screen bg-mist">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:gap-3 md:px-6">
          <Link href="/app" aria-label={t('All organizations')} className="shrink-0">
            <Logo size="sm" wordmarkClass="hidden sm:inline" />
          </Link>
          <span className="hidden h-6 w-px bg-line sm:block" aria-hidden />
          <details className="relative">
            <summary className="flex max-w-[180px] cursor-pointer list-none items-center gap-2 border border-line-strong bg-white px-3 py-1.5 text-[14px] font-semibold sm:max-w-[240px] [&::-webkit-details-marker]:hidden" aria-label={t('Switch organization')}>
              <Building2 className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              <span className="truncate">{current ? <bdi>{current.name}</bdi> : t('Choose organization')}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
            </summary>
            <div className="card absolute start-0 top-11 z-50 w-72 p-2 shadow-lift">
              <p className="t-eyebrow px-2 pb-1 pt-1">{t('Your organizations')}</p>
              {orgs.map((o) => (
                <Link key={o.orgId} href={`/app/${o.orgId}`} className={cx('block px-2.5 py-2 text-[14px] hover:bg-mist', o.orgId === current?.orgId && 'bg-brand-50 font-semibold text-brand-800')}>
                  <bdi>{o.name}</bdi>
                </Link>
              ))}
              <div className="my-1 border-t border-line" />
              <Link href="/app?create=1" className="block px-2.5 py-2 text-[14px] font-semibold text-brand-700 hover:bg-mist">
                {t('Create another organization')}
              </Link>
            </div>
          </details>
          {tabs.length > 0 && <WorkspaceTabs tabs={tabs} label={t('Workspace')} />}
          <div className="ms-auto flex items-center gap-2">
            {isPlatformAdmin && (
              <Link href="/platform" className="hidden items-center gap-1.5 px-3 py-1.5 font-mono text-[12.5px] font-medium uppercase tracking-[0.04em] text-ink-muted hover:text-ink md:inline-flex">
                <Server className="h-4 w-4" aria-hidden /> {t('Platform')}
              </Link>
            )}
            <LanguageSwitch className="h-9" />
            <div className="hidden text-end leading-tight sm:block">
              <p className="text-[13px] font-semibold">{user.name}</p>
              <p className="text-[12px] text-ink-muted" dir="ltr">{user.email}</p>
            </div>
            <LogoutButton compact label={t('Sign out')} />
          </div>
        </div>
        {tabs.length > 0 && (
          <div className="border-t border-line px-4 py-2 lg:hidden">
            <WorkspaceTabs tabs={tabs} label={t('Workspace')} mobile />
          </div>
        )}
      </header>
      <main id="main" className="mx-auto max-w-[1440px] px-4 py-8 md:px-6">
        {children}
      </main>
    </div>
  );
}

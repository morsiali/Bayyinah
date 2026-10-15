import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { requirePageUser } from '@/lib/auth/session';
import { Empty, LinkButton, Logo } from '@/components/ui';
import { LogoutButton } from '@/components/app/logout-button';
import { PlatformNav } from '@/components/platform/nav';
import { LanguageSwitch } from '@/components/i18n';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser('/platform');
  const { t } = await getT();
  if (!user.isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24">
        <Empty icon={<ShieldOff className="h-8 w-8" />} title={t('Platform operations are restricted')} action={<LinkButton href="/app" variant="secondary">{t('Go to your workspace')}</LinkButton>}>
          {t('This area is only for platform administrators provisioned through the documented server-side process.')}
        </Empty>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-white/10 bg-navy-900 text-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 md:px-6">
          <Link href="/platform" aria-label={t('Platform operations')}><Logo size="sm" tone="light" /></Link>
          <span className="hidden rounded-sm border border-white/25 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] sm:inline">{t('Platform operations')}</span>
          <PlatformNav />
          <div className="ms-auto flex items-center gap-3 text-[13px]">
            <LanguageSwitch tone="light" className="h-9" />
            <span className="hidden text-white/70 sm:inline" dir="ltr">{user.email}</span>
            <Link href="/app" className="font-semibold text-white/80 hover:text-white">{t('Organizations')}</Link>
            <LogoutButton compact label={t('Sign out')} />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1440px] px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}

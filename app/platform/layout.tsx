import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { requirePageUser } from '@/lib/auth/session';
import { Empty, LinkButton, Logo } from '@/components/ui';
import { LogoutButton } from '@/components/app/logout-button';
import { PlatformNav } from '@/components/platform/nav';

export const dynamic = 'force-dynamic';

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser('/platform');
  if (!user.isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24">
        <Empty icon={<ShieldOff className="h-8 w-8" />} title="Platform operations are restricted" action={<LinkButton href="/app" variant="secondary">Go to your workspace</LinkButton>}>
          This area is only for platform administrators provisioned through the documented server-side process.
        </Empty>
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-navy text-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 md:px-6">
          <Link href="/platform" aria-label="Platform operations"><Logo size="sm" tone="light" /></Link>
          <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[12px] font-bold">Platform operations</span>
          <PlatformNav />
          <div className="ml-auto flex items-center gap-3 text-[13px]">
            <span className="hidden text-white/70 sm:inline">{user.email}</span>
            <Link href="/app" className="font-semibold text-white/80 hover:text-white">Organizations</Link>
            <LogoutButton compact label="Sign out" />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1440px] px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}

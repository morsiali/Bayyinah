import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Building2 } from 'lucide-react';
import { requirePageUser } from '@/lib/auth/session';
import { listMyOrgs } from '@/lib/services/access';
import { AppShell } from '@/components/app/shell';
import { CreateOrgForm } from '@/components/app/create-org-form';
import { ROLE_LABELS } from '@/lib/constants';
import { Notice } from '@/components/ui';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Your organizations') };
}
export const dynamic = 'force-dynamic';

export default async function AppHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requirePageUser('/app');
  const orgs = await listMyOrgs(user);
  const active = orgs.filter((o) => o.status === 'ACTIVE');
  if (active.length === 1 && orgs.length === 1 && !sp.create) redirect(`/app/${active[0].orgId}`);
  const { t } = await getT();
  return (
    <AppShell user={user} orgs={active} isPlatformAdmin={user.isPlatformAdmin}>
      <div className="mx-auto max-w-3xl">
        <h1 className="t-headline">{orgs.length ? t('Choose an organization.') : t('Set up your organization.')}</h1>
        <p className="t-lead mt-3">
          {orgs.length
            ? t('Your role in each organization decides which workspaces you see.')
            : t('Name the business you verify payments for. You become its first administrator and can invite preparers and reviewers. If a colleague already set one up, ask them for an invitation link instead.')}
        </p>
        {orgs.length > 0 && (
          <ul className="mt-8 grid gap-3">
            {orgs.map((o) => (
              <li key={o.orgId}>
                {o.status === 'ACTIVE' ? (
                  <Link href={`/app/${o.orgId}`} className="card group flex items-center gap-4 p-5 hover:border-ink/40">
                    <span className="flex h-11 w-11 items-center justify-center bg-navy text-white"><Building2 className="h-5 w-5" aria-hidden /></span>
                    <span className="flex-1">
                      <bdi className="block text-[17px] font-semibold">{o.name}</bdi>
                      <span className="block text-[14px] text-ink-muted">{o.roles.map((r) => t(ROLE_LABELS[r])).join(' · ')}</span>
                    </span>
                    <ArrowRight className="h-5 w-5 text-ink-faint group-hover:text-brand-600 rtl:-scale-x-100" aria-hidden />
                  </Link>
                ) : (
                  <Notice tone="review" title={o.name}>{t('Service for this organization is suspended. Contact platform support.')}</Notice>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="card mt-8 p-6">
          <h2 className="t-sub">{orgs.length ? t('Create another organization') : t('Create your organization')}</h2>
          <CreateOrgForm />
        </div>
        {user.isPlatformAdmin && (
          <p className="mt-6 text-[14px] text-ink-muted">
            {t('You also have platform operations access.')} <Link href="/platform" className="link">{t('Open platform operations')}</Link>
          </p>
        )}
      </div>
    </AppShell>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Building2 } from 'lucide-react';
import { requirePageUser } from '@/lib/auth/session';
import { listMyOrgs } from '@/lib/services/access';
import { AppShell } from '@/components/app/shell';
import { CreateOrgForm } from '@/components/app/create-org-form';
import { ROLE_LABELS } from '@/lib/constants';
import { Notice } from '@/components/ui';

export const metadata: Metadata = { title: 'Your organizations' };
export const dynamic = 'force-dynamic';

export default async function AppHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requirePageUser('/app');
  const orgs = await listMyOrgs(user);
  const active = orgs.filter((o) => o.status === 'ACTIVE');
  if (active.length === 1 && orgs.length === 1 && !sp.create) redirect(`/app/${active[0].orgId}`);
  return (
    <AppShell user={user} orgs={active} isPlatformAdmin={user.isPlatformAdmin}>
      <div className="mx-auto max-w-3xl">
        <h1 className="t-headline">{orgs.length ? 'Choose an organization.' : 'Set up your organization.'}</h1>
        <p className="t-lead mt-3">
          {orgs.length
            ? 'Your role in each organization decides which workspaces you see.'
            : 'Name the business you verify payments for. You become its first administrator and can invite preparers and reviewers. If a colleague already set one up, ask them for an invitation link instead.'}
        </p>
        {orgs.length > 0 && (
          <ul className="mt-8 grid gap-3">
            {orgs.map((o) => (
              <li key={o.orgId}>
                {o.status === 'ACTIVE' ? (
                  <Link href={`/app/${o.orgId}`} className="card group flex items-center gap-4 p-5 hover:shadow-lift">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white"><Building2 className="h-5 w-5" aria-hidden /></span>
                    <span className="flex-1">
                      <span className="block text-[17px] font-bold">{o.name}</span>
                      <span className="block text-[14px] text-ink-muted">{o.roles.map((r) => ROLE_LABELS[r]).join(' · ')}</span>
                    </span>
                    <ArrowRight className="h-5 w-5 text-ink-faint group-hover:text-brand-600" aria-hidden />
                  </Link>
                ) : (
                  <Notice tone="review" title={o.name}>Service for this organization is suspended. Contact platform support.</Notice>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="card mt-8 p-6">
          <h2 className="t-sub">{orgs.length ? 'Create another organization' : 'Create your organization'}</h2>
          <CreateOrgForm />
        </div>
        {user.isPlatformAdmin && (
          <p className="mt-6 text-[14px] text-ink-muted">
            You also have platform operations access. <Link href="/platform" className="link">Open platform operations</Link>
          </p>
        )}
      </div>
    </AppShell>
  );
}

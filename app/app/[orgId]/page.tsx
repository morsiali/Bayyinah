import { redirect } from 'next/navigation';
import { requirePageUser } from '@/lib/auth/session';
import { getOrgContext } from '@/lib/services/access';

export default async function OrgIndex({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await requirePageUser(`/app/${orgId}`);
  const ctx = await getOrgContext(user, orgId);
  if (ctx.roles.includes('PREPARER')) redirect(`/app/${orgId}/prepare`);
  if (ctx.roles.includes('REVIEWER')) redirect(`/app/${orgId}/review`);
  redirect(`/app/${orgId}/admin`);
}

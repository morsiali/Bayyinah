import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { requirePageUser } from '@/lib/auth/session';
import { getSmsSettings } from '@/lib/services/sms';
import { SmsSettings } from '@/components/admin/sms-settings';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('SMS intake') };
}
export const dynamic = 'force-dynamic';

export default async function SmsAdminPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await requirePageUser(`/app/${orgId}/admin/sms`);
  const s = await getSmsSettings(user, orgId);
  return <SmsSettings orgId={orgId} {...s} />;
}

import { ShieldOff } from 'lucide-react';
import { Empty, LinkButton } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

export async function Forbidden({ need, orgId }: { need: string; orgId: string }) {
  const { t } = await getT();
  return (
    <Empty icon={<ShieldOff className="h-8 w-8" />} title={t('You don’t have access to this workspace')} action={<LinkButton href={`/app/${orgId}`} variant="secondary">{t('Go to your workspace')}</LinkButton>}>
      {t('This page requires the {role} role in this organization. An organization admin can change your roles.', { role: t(need) })}
    </Empty>
  );
}

import { ShieldOff } from 'lucide-react';
import { Empty, LinkButton } from '@/components/ui';

export function Forbidden({ need, orgId }: { need: string; orgId: string }) {
  return (
    <Empty icon={<ShieldOff className="h-8 w-8" />} title="You don’t have access to this workspace" action={<LinkButton href={`/app/${orgId}`} variant="secondary">Go to your workspace</LinkButton>}>
      This page requires the {need} role in this organization. An organization admin can change your roles.
    </Empty>
  );
}

import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/auth/session';
import { getPlatformSettings } from '@/lib/services/platform';
import { SETTING_DEFS, SETTING_KEYS } from '@/lib/settings';
import { LimitsForm } from '@/components/platform/settings-form';

export const metadata: Metadata = { title: 'Service limits' };
export const dynamic = 'force-dynamic';

export default async function LimitsPage() {
  const user = await requirePageUser('/platform/settings');
  const values = await getPlatformSettings(user);
  return (
    <div className="max-w-4xl">
      <h1 className="t-headline">Service limits</h1>
      <p className="t-lead mt-2">Apply to every organization. Changes are recorded in admin activity.</p>
      <div className="card mt-6 p-6">
        <LimitsForm defs={SETTING_KEYS.map((k) => ({ key: k, label: SETTING_DEFS[k].label, min: SETTING_DEFS[k].min, max: SETTING_DEFS[k].max }))} values={values} />
      </div>
    </div>
  );
}

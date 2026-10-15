'use client';
import { useState } from 'react';
import { Button, Field } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { msg } from '@/lib/i18n/core';
import { useT } from '@/components/i18n';

export function OrgSettingsForm({ orgId, name, retentionDays }: { orgId: string; name: string; retentionDays: number }) {
  const t = useT();
  const [n, setN] = useState(name);
  const [r, setR] = useState(String(retentionDays));
  const { run, pending } = useAction();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run('s', `/api/orgs/${orgId}`, { method: 'PATCH', body: { name: n, retentionDays: Number(r) }, success: msg('Settings saved') }); }}>
      <Field label={t('Organization name')} htmlFor="on"><input id="on" value={n} onChange={(e) => setN(e.target.value)} className="field-input" /></Field>
      <Field label={t('Evidence retention after closure (days)')} htmlFor="rd" hint={t('30–3650 days. After this period, stored files and document text of closed cases are removed by the retention job; decisions and the audit trail are kept.')}>
        <input id="rd" type="number" min={30} max={3650} value={r} onChange={(e) => setR(e.target.value)} className="field-input" />
      </Field>
      <Button type="submit" loading={pending === 's'}>{t('Save settings')}</Button>
    </form>
  );
}

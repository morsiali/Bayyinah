'use client';
import { useState } from 'react';
import { Button, Field } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { useT } from '@/components/i18n';
import { msg } from '@/lib/i18n/core';

export function LimitsForm({ defs, values }: { defs: { key: string; label: string; min: number; max: number }[]; values: Record<string, number> }) {
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(Object.entries(values).map(([k, x]) => [k, String(x)])));
  const { run, pending } = useAction();
  const t = useT();
  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run('s', '/api/platform/settings', { method: 'PUT', body: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)])), success: msg('Limits saved') }); }}>
      {defs.map((d) => (
        <Field key={d.key} label={d.label} htmlFor={`l-${d.key}`} hint={`${d.min}–${d.max}`}>
          <input id={`l-${d.key}`} type="number" min={d.min} max={d.max} value={v[d.key]} onChange={(e) => setV({ ...v, [d.key]: e.target.value })} className="field-input" />
        </Field>
      ))}
      <div className="md:col-span-2"><Button type="submit" loading={pending === 's'}>{t('Save limits')}</Button></div>
    </form>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Field, Notice, cx } from '@/components/ui';
import { api, ApiError } from '@/lib/client';
import { CHANNELS, CHANNEL_LABELS, OUTCOME_LABELS, VERIFICATION_OUTCOMES, type Channel, type VerificationOutcome } from '@/lib/constants';
import { useI18n } from '@/components/i18n';

export function VerifyForm({ orgId, caseId, taskId, revision, userName, defaultChannel, defaultSource, defaultRequirement }: { orgId: string; caseId: string; taskId: string; revision: number; userName: string; defaultChannel: Channel; defaultSource: string; defaultRequirement: string }) {
  const router = useRouter();
  const { t, tx } = useI18n();
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [source, setSource] = useState(() => tx(defaultSource));
  const [requirement, setRequirement] = useState(() => tx(defaultRequirement));
  const [outcome, setOutcome] = useState<VerificationOutcome | ''>('');
  const [notes, setNotes] = useState('');
  const [attest, setAttest] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<{ msg: string; field?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!outcome) return setError({ msg: t('Choose the outcome.'), field: 'outcome' });
        const form = new FormData();
        form.append('taskId', taskId);
        form.append('channel', channel);
        form.append('channelSource', source);
        form.append('requirementChecked', requirement);
        form.append('outcome', outcome);
        form.append('notes', notes);
        form.append('attestIndependent', String(attest));
        form.append('expectedRevision', String(revision));
        if (file) form.append('attachment', file);
        setLoading(true);
        try {
          await api(`/api/orgs/${orgId}/cases/${caseId}/verify`, { form });
          toast.success(t('Verification outcome recorded by {name}', { name: userName }));
          router.push(`/app/${orgId}/cases/${caseId}`);
          router.refresh();
        } catch (err) {
          setError({ msg: err instanceof ApiError ? err.message : t('Could not save.'), field: err instanceof ApiError ? err.field : undefined });
          setLoading(false);
        }
      }}
    >
      {error && <Notice tone="danger">{error.msg}</Notice>}
      <Field label={t('What did you check?')} htmlFor="req">
        <textarea id="req" rows={2} value={requirement} onChange={(e) => setRequirement(e.target.value)} className="field-input" />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('Channel used')} htmlFor="channel">
          <select id="channel" value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className="field-input">
            {CHANNELS.map((c) => <option key={c} value={c}>{t(CHANNEL_LABELS[c])}</option>)}
          </select>
        </Field>
        <Field label={t('Where the channel came from')} htmlFor="source" hint={t('For example: supplier reference v2 — signed agreement.')}>
          <input id="source" value={source} onChange={(e) => setSource(e.target.value)} className="field-input" />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-[14px] font-semibold">{t('Outcome')}</legend>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-invalid={error?.field === 'outcome' || undefined}>
          {VERIFICATION_OUTCOMES.map((o) => (
            <button type="button" key={o} role="radio" aria-checked={outcome === o} onClick={() => setOutcome(o)} className={cx('rounded-md border px-3.5 py-3 text-start text-[14px] font-semibold', outcome === o ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-100' : 'border-line bg-white hover:border-line-strong')}>
              {t(OUTCOME_LABELS[o])}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label={`${t('Notes')}${outcome && outcome !== 'CONFIRMED' ? '' : ` — ${t('optional')}`}`} htmlFor="notes" hint={t('Who you spoke to and what they said. Required unless the outcome is confirmed.')}>
        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="field-input" />
      </Field>
      <Field label={`${t('Evidence attachment')} — ${t('optional')}`} htmlFor="att" hint={t('PDF, PNG or JPEG up to 10 MB, e.g. a signed confirmation letter.')}>
        <input id="att" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full max-w-full text-[13px] file:me-3 file:border file:border-line-strong file:bg-white file:px-3 file:py-1.5 file:text-[13px] file:font-semibold" />
      </Field>
      <label className="flex items-start gap-3 border border-line bg-mist p-3.5 text-[14px]">
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-1 h-4 w-4 accent-[#6d5aff]" />
        <span>{t('I used the channel above, not contact details taken from the request, and this record is accurate.')}</span>
      </label>
      <Button type="submit" size="lg" loading={loading} disabled={!attest}>
        {t('Record outcome')}
      </Button>
      <p className="t-caption text-ink-muted">{t('Recorded as: “Verification outcome recorded by {name}”. Bayyinah records your account of the verification; it does not witness the call.', { name: userName })}</p>
    </form>
  );
}

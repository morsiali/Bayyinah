'use client';
import { useRef, useState } from 'react';
import { Download, FileText, FileWarning, Upload } from 'lucide-react';
import { Button, Notice, cx } from '@/components/ui';
import { HighlightedText, toneFor } from '@/components/evidence';
import { isEditable } from '@/lib/constants';
import { msg } from '@/lib/i18n/core';
import { useAction } from '@/components/app/use-action';
import type { CaseData, Me } from './types';
import { useI18n } from '@/components/i18n';

export function SourcePanel({ data, orgId, me, activeQuote }: { data: CaseData; orgId: string; me: Me; activeQuote: string | null }) {
  const c = data.case;
  const docs = c.sourceDocuments;
  const [selected, setSelected] = useState<string | null>(docs[0]?.id ?? null);
  const doc = docs.find((d) => d.id === selected) ?? docs[0];
  const canAdd = me.roles.includes('PREPARER') && isEditable(c.status);
  const marks = data.findings.filter((f) => f.evidenceQuote && f.sourceDocumentId === doc?.id).map((f) => ({ id: f.id, quote: f.evidenceQuote!, tone: toneFor(f.severity) }));
  const names = data.names;
  const { t, tx, date } = useI18n();

  return (
    <section aria-labelledby="src-h" className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="src-h" className="t-eyebrow !text-ink">{t('Source evidence')}</h2>
          <span className="text-[13px] text-ink-muted">{t('Items: {n}', { n: docs.length })}</span>
        </div>
        {docs.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-muted">{t('No source yet. Add the request exactly as you received it.')}</p>
        ) : (
          <>
            {docs.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t('Source documents')}>
                {docs.map((d, i) => (
                  <button key={d.id} role="tab" aria-selected={d.id === doc?.id} onClick={() => setSelected(d.id)} className={cx('border px-2.5 py-1 text-[12.5px] font-semibold', d.id === doc?.id ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink-soft')}>
                    S{i + 1} · {d.kind === 'PDF' ? 'PDF' : t('Text')}
                  </button>
                ))}
              </div>
            )}
            {doc && (
              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    <span className="font-semibold text-ink">{doc.label ? tx(doc.label) : doc.kind === 'PDF' ? <bdi>{doc.fileName}</bdi> : t('Pasted text')}</span>
                  </span>
                  <span>
                    {t('Added by {name}', { name: names[doc.uploadedBy]?.name ?? t('a member') })} · {date(doc.createdAt)}
                  </span>
                </div>
                {doc.kind === 'PDF' && doc.storageKey && (
                  <a href={`/api/orgs/${orgId}/documents/${doc.id}`} className="link mt-1 inline-flex items-center gap-1 text-[13px]">
                    <Download className="h-3.5 w-3.5" aria-hidden /> {t('Download original PDF')}
                  </a>
                )}
                {doc.extractionStatus === 'FAILED' ? (
                  <Notice tone="review" className="mt-3" title={t('No readable text')}>
                    {tx(doc.extractionError)} {t('This file is kept as evidence but is never analyzed.')}
                  </Notice>
                ) : doc.rawText ? (
                  <div dir="auto" className="mt-3 max-h-[560px] overflow-y-auto whitespace-pre-wrap break-words border border-line bg-mist p-4 text-[13.5px] leading-6 text-ink-soft" tabIndex={0} aria-label={t('Source text')}>
                    <HighlightedText text={doc.rawText} marks={marks} activeId={activeQuote} />
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] text-ink-muted">{doc.extractionError ? tx(doc.extractionError) : t('Content not available.')}</p>
                )}
                <p className="t-caption mt-2 text-ink-faint">{t('Shown as plain text. Links and embedded content are never opened or executed.')}</p>
              </div>
            )}
          </>
        )}
      </div>
      {canAdd && <AddSource orgId={orgId} caseId={c.id} />}
    </section>
  );
}

function AddSource({ orgId, caseId }: { orgId: string; caseId: string }) {
  const [mode, setMode] = useState<'text' | 'pdf'>('text');
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { run, pending } = useAction();
  const { t } = useI18n();
  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold">{t('Add source')}</h3>
      <div className="mt-3 flex border border-line bg-mist p-0.5 text-[13px] font-semibold" role="tablist" aria-label={t('Source type')}>
        {(['text', 'pdf'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cx('flex-1 px-3 py-1.5', mode === m ? 'bg-white text-ink ring-1 ring-line-strong' : 'text-ink-muted')}>
            {m === 'text' ? t('Paste text') : t('Upload PDF')}
          </button>
        ))}
      </div>
      {mode === 'text' ? (
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run('src', `/api/orgs/${orgId}/cases/${caseId}/source`, { body: { text }, success: msg('Source added') });
            if (r) setText('');
          }}
        >
          <label htmlFor="paste" className="sr-only">{t('Request text')}</label>
          <textarea id="paste" rows={7} value={text} onChange={(e) => setText(e.target.value)} maxLength={50000} dir="auto" placeholder={t('Paste the email or message, including the sender line if you have it…')} className="field-input text-[14px] leading-6" />
          <Button type="submit" size="sm" loading={pending === 'src'} disabled={text.trim().length < 20}>
            {t('Save source')}
          </Button>
        </form>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = fileRef.current?.files?.[0];
            if (!f) return;
            const form = new FormData();
            form.append('file', f);
            const r = await run<{ extractionStatus: string }>('pdf', `/api/orgs/${orgId}/cases/${caseId}/upload`, { form });
            if (r) {
              if (fileRef.current) fileRef.current.value = '';
              setFileName(null);
              const { toast } = await import('sonner');
              if (r.extractionStatus === 'COMPLETED') toast.success(t('PDF added and its text extracted'));
              else toast.warning(t('PDF stored, but it has no readable text. Paste the text instead.'));
            }
          }}
        >
          <label htmlFor="pdf" className="flex cursor-pointer flex-col items-center border-2 border-dashed border-line-strong bg-mist px-4 py-6 text-center hover:border-brand-300">
            <Upload className="h-5 w-5 text-ink-muted" aria-hidden />
            <span className="mt-2 text-[14px] font-semibold">{fileName ?? t('Choose a text-based PDF')}</span>
            <span className="text-[12.5px] text-ink-muted">{t('Up to 10 MB. Scanned PDFs can’t be read — paste the text instead.')}</span>
            <input id="pdf" ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
          </label>
          <Button type="submit" size="sm" loading={pending === 'pdf'} disabled={!fileName}>
            {t('Upload PDF')}
          </Button>
        </form>
      )}
      <p className="mt-3 flex gap-1.5 text-[12.5px] text-ink-muted">
        <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {t('Adding a source after analysis means the analysis must be run again.')}
      </p>
    </div>
  );
}

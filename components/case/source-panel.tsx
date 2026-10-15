'use client';
import { useRef, useState } from 'react';
import { Download, FileText, FileWarning, Upload } from 'lucide-react';
import { Button, Notice, cx } from '@/components/ui';
import { HighlightedText, toneFor } from '@/components/evidence';
import { isEditable } from '@/lib/constants';
import { useAction } from '@/components/app/use-action';
import type { CaseData, Me } from './types';

export function SourcePanel({ data, orgId, me, activeQuote }: { data: CaseData; orgId: string; me: Me; activeQuote: string | null }) {
  const c = data.case;
  const docs = c.sourceDocuments;
  const [selected, setSelected] = useState<string | null>(docs[0]?.id ?? null);
  const doc = docs.find((d) => d.id === selected) ?? docs[0];
  const canAdd = me.roles.includes('PREPARER') && isEditable(c.status);
  const marks = data.findings.filter((f) => f.evidenceQuote && f.sourceDocumentId === doc?.id).map((f) => ({ id: f.id, quote: f.evidenceQuote!, tone: toneFor(f.severity) }));
  const names = data.names;

  return (
    <section aria-labelledby="src-h" className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="src-h" className="text-[16px] font-bold">Source evidence</h2>
          <span className="text-[13px] text-ink-muted">{docs.length} item{docs.length === 1 ? '' : 's'}</span>
        </div>
        {docs.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-muted">No source yet. Add the request exactly as you received it.</p>
        ) : (
          <>
            {docs.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Source documents">
                {docs.map((d, i) => (
                  <button key={d.id} role="tab" aria-selected={d.id === doc?.id} onClick={() => setSelected(d.id)} className={cx('rounded-full border px-2.5 py-1 text-[12.5px] font-semibold', d.id === doc?.id ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink-soft')}>
                    S{i + 1} · {d.kind === 'PDF' ? 'PDF' : 'Text'}
                  </button>
                ))}
              </div>
            )}
            {doc && (
              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    <span className="font-semibold text-ink">{doc.label ?? (doc.kind === 'PDF' ? doc.fileName : 'Pasted text')}</span>
                  </span>
                  <span>
                    Added by {names[doc.uploadedBy]?.name ?? 'a member'} · {new Date(doc.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dubai' })}
                  </span>
                </div>
                {doc.kind === 'PDF' && doc.storageKey && (
                  <a href={`/api/orgs/${orgId}/documents/${doc.id}`} className="link mt-1 inline-flex items-center gap-1 text-[13px]">
                    <Download className="h-3.5 w-3.5" aria-hidden /> Download original PDF
                  </a>
                )}
                {doc.extractionStatus === 'FAILED' ? (
                  <Notice tone="review" className="mt-3" title="No readable text">
                    {doc.extractionError} This file is kept as evidence but is never analyzed.
                  </Notice>
                ) : doc.rawText ? (
                  <div className="mt-3 max-h-[560px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-zinc-50 p-4 text-[13.5px] leading-6 text-ink-soft" tabIndex={0} aria-label="Source text">
                    <HighlightedText text={doc.rawText} marks={marks} activeId={activeQuote} />
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] text-ink-muted">{doc.extractionError ?? 'Content not available.'}</p>
                )}
                <p className="t-caption mt-2 text-ink-faint">Shown as plain text. Links and embedded content are never opened or executed.</p>
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
  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-bold">Add source</h3>
      <div className="mt-3 flex rounded-full border border-line bg-zinc-50 p-0.5 text-[13px] font-semibold" role="tablist" aria-label="Source type">
        {(['text', 'pdf'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cx('flex-1 rounded-full px-3 py-1.5', mode === m ? 'bg-white shadow-pill' : 'text-ink-muted')}>
            {m === 'text' ? 'Paste text' : 'Upload PDF'}
          </button>
        ))}
      </div>
      {mode === 'text' ? (
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run('src', `/api/orgs/${orgId}/cases/${caseId}/source`, { body: { text }, success: 'Source added' });
            if (r) setText('');
          }}
        >
          <label htmlFor="paste" className="sr-only">Request text</label>
          <textarea id="paste" rows={7} value={text} onChange={(e) => setText(e.target.value)} maxLength={50000} placeholder="Paste the email or message, including the sender line if you have it…" className="field-input text-[14px] leading-6" />
          <Button type="submit" size="sm" loading={pending === 'src'} disabled={text.trim().length < 20}>
            Save source
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
              if (r.extractionStatus === 'COMPLETED') toast.success('PDF added and its text extracted');
              else toast.warning('PDF stored, but it has no readable text. Paste the text instead.');
            }
          }}
        >
          <label htmlFor="pdf" className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-line bg-zinc-50 px-4 py-6 text-center hover:border-brand-300">
            <Upload className="h-5 w-5 text-ink-muted" aria-hidden />
            <span className="mt-2 text-[14px] font-semibold">{fileName ?? 'Choose a text-based PDF'}</span>
            <span className="text-[12.5px] text-ink-muted">Up to 10 MB. Scanned PDFs can’t be read — paste the text instead.</span>
            <input id="pdf" ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
          </label>
          <Button type="submit" size="sm" loading={pending === 'pdf'} disabled={!fileName}>
            Upload PDF
          </Button>
        </form>
      )}
      <p className="mt-3 flex gap-1.5 text-[12.5px] text-ink-muted">
        <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Adding a source after analysis means the analysis must be run again.
      </p>
    </div>
  );
}

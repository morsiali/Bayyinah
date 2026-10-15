'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Check, CircleDashed, FlaskConical, Phone, RotateCcw, ShieldCheck, Users } from 'lucide-react';
import { Button, KeyValue, Logo, Ltr, Notice, SeverityBadge, StatusBadge, cx } from '@/components/ui';
import { LanguageSwitch, useI18n } from '@/components/i18n';
import { HighlightedText, toneFor } from '@/components/evidence';
import { DEMO_SCENARIOS, type DemoScenario } from '@/lib/demo-data';
import { DECISION_LABELS, FIELD_LABELS, OUTCOME_LABELS, REQUEST_TYPE_LABELS, STATUS_LABELS, isHighRisk, type CaseStatus } from '@/lib/constants';
import { msg, type T } from '@/lib/i18n/core';
import { maskAccount } from '@/lib/iban';
import { liveHref } from '@/lib/site';

type Persona = 'preparer' | 'reviewer' | 'admin';
const PEOPLE: Record<Persona, { name: string; role: string }> = {
  preparer: { name: msg('Omar (demo)'), role: msg('Preparer') },
  reviewer: { name: msg('Sara (demo)'), role: msg('Reviewer') },
  admin: { name: msg('Layla (demo)'), role: msg('Organization admin') },
};

type Stage = { analyzed: boolean; agent: boolean; outcome: null | { outcome: 'CONFIRMED' | 'NOT_CONFIRMED'; notes: string }; submitted: boolean; decision: null | { decision: 'APPROVED' | 'REJECTED' | 'RETURNED'; rationale: string } };
const fresh = (): Stage => ({ analyzed: false, agent: false, outcome: null, submitted: false, decision: null });
type Log = { at: string; who: string; what: string };

function statusOf(s: DemoScenario, st: Stage): CaseStatus {
  if (st.decision) return st.decision.decision === 'APPROVED' ? 'CLOSED_APPROVED' : st.decision.decision === 'REJECTED' ? 'CLOSED_REJECTED' : 'NEEDS_INFORMATION';
  if (st.submitted) return 'READY_FOR_REVIEW';
  if (st.agent && s.verification && !st.outcome) return 'INDEPENDENT_CHECK_REQUIRED';
  if (st.analyzed) return 'ANALYZED';
  return 'DRAFT';
}

/** "R-EMAIL-DOMAIN" → a readable field name for the differences table. */
const DIFF_FIELD: Record<string, string> = {
  'R-EMAIL-DOMAIN': msg('Sender domain'),
  'R-IBAN-COMPARE': msg('IBAN'),
  'R-NAME-COMPARE': msg('Beneficiary name'),
  'R-ACCOUNT-COMPARE': msg('Account number'),
};

export function DemoApp({ initialScenario, initialPersona }: { initialScenario: string; initialPersona: Persona }) {
  const { t, locale } = useI18n();
  const [persona, setPersona] = useState<Persona>(initialPersona);
  const [scenarioId, setScenarioId] = useState(initialScenario);
  const [stages, setStages] = useState<Record<string, Stage>>({});
  const [log, setLog] = useState<Log[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const s = DEMO_SCENARIOS.find((x) => x.id === scenarioId) ?? DEMO_SCENARIOS[0];
  const st = stages[s.id] ?? fresh();
  const status = statusOf(s, st);

  const update = (patch: Partial<Stage>, what: string) => {
    setStages((p) => ({ ...p, [s.id]: { ...(p[s.id] ?? fresh()), ...patch } }));
    setLog((l) => [{ at: new Date().toLocaleTimeString(locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB'), who: t(PEOPLE[persona].name), what: `${s.caseNumber}: ${what}` }, ...l].slice(0, 40));
  };
  const reset = () => {
    setStages({});
    setLog([]);
    setActive(null);
  };

  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label={t('Bayyinah home')}><Logo size="sm" /></Link>
            <span className="rounded-sm bg-signal-amber px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">{t('Demo Mode')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-eyebrow hidden sm:inline" id="persona-label">{t('Demo identity:')}</span>
            <div role="radiogroup" aria-labelledby="persona-label" className="flex border border-line-strong bg-white p-0.5">
              {(Object.keys(PEOPLE) as Persona[]).map((p) => (
                <button key={p} role="radio" aria-checked={persona === p} onClick={() => setPersona(p)} className={cx('px-3 py-1 text-[13px] font-semibold', persona === p ? 'bg-navy text-white' : 'text-ink-soft hover:text-ink')}>
                  {t(PEOPLE[p].role)}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {t('Reset demo')}
            </Button>
            <LanguageSwitch className="h-8" />
            <Link href={liveHref('/signup')} className="hidden text-[13px] font-semibold text-brand-700 hover:underline md:inline">{t('Switch to live mode')}</Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <Notice tone="review" title={t('Demonstration data and simulated AI results.')}>
          {t('Fictional companies and people. Nothing here reads or writes live records, calls an AI model, or signs you in. The identity switcher above exists only in Demo Mode.')}
        </Notice>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <nav aria-label={t('Demo scenarios')} className="space-y-2">
            <p className="t-eyebrow px-1">/ {t('Scenarios')}</p>
            {DEMO_SCENARIOS.map((x) => (
              <button key={x.id} onClick={() => { setScenarioId(x.id); setActive(null); }} aria-current={x.id === s.id ? 'true' : undefined} className={cx('w-full border border-s-[3px] bg-white px-3.5 py-3 text-start transition-colors', x.id === s.id ? 'border-line border-s-brand-600' : 'border-line border-s-transparent hover:border-s-line-strong')}>
                <span className="block text-[14px] font-semibold">{t(x.title)}</span>
                <span className="block text-[12.5px] text-ink-muted">{t(REQUEST_TYPE_LABELS[x.requestType])} · <bdi>{x.supplier.name}</bdi></span>
                <StatusBadge status={statusOf(x, stages[x.id] ?? fresh())} className="mt-2" />
              </button>
            ))}
          </nav>

          {persona === 'admin' ? (
            <AdminView s={s} log={log} t={t} />
          ) : (
            <section aria-label={t('Demo case')} className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="t-caption text-ink-muted"><Ltr>{s.caseNumber}</Ltr> · {t(REQUEST_TYPE_LABELS[s.requestType])}</p>
                  <h1 className="text-[26px] font-semibold uppercase tracking-[-0.01em]" dir="auto">{s.supplier.name}</h1>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.15fr_320px]">
                <div className="card p-5">
                  <h2 className="t-eyebrow !text-ink">{t('Source — pasted email')}</h2>
                  <div dir="ltr" className="ltr mt-3 whitespace-pre-wrap border border-line bg-mist p-3 font-mono text-[12.5px] leading-6 text-ink-soft">
                    {st.analyzed ? <HighlightedText text={s.source} activeId={active} marks={s.findings.filter((f) => f.quote).map((f) => ({ id: f.id, quote: f.quote!, tone: toneFor(f.severity) }))} /> : s.source}
                  </div>
                </div>

                <div className="space-y-4">
                  <PassportSection k="A" title={t('Request')}>
                    {st.analyzed ? (
                      <>
                        <p className="text-[14px]">{t(s.summary)}</p>
                        <dl className="mt-3 grid grid-cols-2 gap-3">
                          {(['amount', 'beneficiaryName', 'iban', 'senderEmail'] as const).map((k) => (
                            <KeyValue key={k} label={t(FIELD_LABELS[k])}>{s.fields[k] ? <Ltr mono={k === 'iban'}>{k === 'amount' ? `${s.fields.currency ?? ''} ${s.fields[k]}` : s.fields[k]}</Ltr> : <span className="text-amber-700">{t('Missing')}</span>}</KeyValue>
                          ))}
                        </dl>
                      </>
                    ) : (
                      <p className="text-[14px] text-ink-muted">{t('Not analyzed yet.')}</p>
                    )}
                  </PassportSection>
                  <PassportSection k="B" title={t('Evidence & findings')}>
                    {st.analyzed ? (
                      <ul className="space-y-2">
                        {s.findings.map((f) => (
                          <li key={f.id}>
                            <button onClick={() => setActive(f.quote ? f.id : null)} className="w-full border border-line p-2.5 text-start hover:border-line-strong">
                              <span className="flex flex-wrap items-center gap-2"><SeverityBadge severity={f.severity} /><span className="text-[12px] font-semibold text-ink-muted">{f.source === 'RULE' ? <>{t('Rule')} <Ltr mono>{f.label}</Ltr></> : `${t('Simulated AI')} · ${t(f.label)}`}</span></span>
                              <span className="mt-1 block text-[13px] leading-5">{t(f.explanation)}</span>
                              {f.quote && <span className="mt-1 block text-[12px] text-brand-700">{t('Show quote in source')}</span>}
                            </button>
                          </li>
                        ))}
                        {s.missing.map((m) => (
                          <li key={m} className="border border-dashed border-amber-300 bg-amber-50/50 px-2.5 py-2 text-[13px] text-amber-900">{t('Missing:')} {t(m)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[14px] text-ink-muted">{t('Findings appear after analysis.')}</p>
                    )}
                  </PassportSection>
                  <PassportSection k="C" title={t('Differences from reference')}>
                    {st.analyzed && s.findings.some((f) => f.reference) ? (
                      <table className="w-full text-[13px]">
                        <thead><tr className="text-start text-ink-muted"><th className="pb-1 text-start font-medium">{t('Field')}</th><th className="pb-1 text-start font-medium">{t('Reference')}</th><th className="pb-1 text-start font-medium">{t('Submitted')}</th></tr></thead>
                        <tbody>
                          {s.findings.filter((f) => f.reference).map((f) => (
                            <tr key={f.id} className="border-t border-line"><td className="py-1.5 pe-2 font-semibold">{t(DIFF_FIELD[f.label] ?? f.label)}</td><td className="py-1.5 pe-2"><Ltr mono>{f.reference}</Ltr></td><td className="py-1.5 text-red-700"><Ltr mono>{f.submitted}</Ltr></td></tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-[14px] text-ink-muted">{st.analyzed ? t('No differences from the reference. This does not prove authenticity.') : t('Compared after analysis.')}</p>
                    )}
                  </PassportSection>
                  <PassportSection k="D" title={t('Independent verification')}>
                    {!s.verification ? (
                      <p className="text-[14px] text-ink-muted">{st.agent ? t('Not required by the rules for this case.') : t('Determined by the preparation agent.')}</p>
                    ) : st.outcome ? (
                      <div className="text-[14px]">
                        <p className="font-semibold">{t(OUTCOME_LABELS[st.outcome.outcome])}</p>
                        <p className="text-ink-soft">{st.outcome.notes}</p>
                        <p className="t-caption mt-1 text-ink-muted">{t('Verification outcome recorded by {name}.', { name: t(PEOPLE.preparer.name) })}</p>
                      </div>
                    ) : st.agent ? (
                      <p className="text-[14px]">{t('Open task:')} {t(s.verification.task)} — <Ltr>{s.verification.channel}</Ltr></p>
                    ) : (
                      <p className="text-[14px] text-ink-muted">{t('Required for this request type. The agent will create the task.')}</p>
                    )}
                  </PassportSection>
                  <PassportSection k="E" title={t('Decision')}>
                    {st.decision ? (
                      <div className="text-[14px]">
                        <p className="font-semibold">{t(DECISION_LABELS[st.decision.decision])}</p>
                        <p className="text-ink-soft">{st.decision.rationale}</p>
                        <p className="t-caption mt-1 text-ink-muted">{t('Recorded by {name}.', { name: t(PEOPLE.reviewer.name) })} {st.decision.decision === 'APPROVED' ? t('An authorized reviewer recorded approval within this workflow; no transfer was made.') : ''}</p>
                      </div>
                    ) : (
                      <p className="text-[14px] text-ink-muted">{t('No decision yet.')}</p>
                    )}
                  </PassportSection>
                </div>

                <aside aria-label={t('Next action')} className="space-y-4">
                  {persona === 'preparer' ? <PreparerActions s={s} st={st} status={status} update={update} t={t} /> : <ReviewerActions s={s} st={st} status={status} update={update} t={t} />}
                </aside>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function PassportSection({ k, title, children }: { k: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold"><span className="flex h-6 w-6 items-center justify-center bg-navy font-mono text-[12px] text-white">{k}</span>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Step({ done, label, t }: { done: boolean; label: string; t: T }) {
  return (
    <li className="flex items-center gap-2 text-[13px]">
      {done ? <Check className="h-4 w-4 text-[color:var(--done)]" aria-label={t('completed')} /> : <CircleDashed className="h-4 w-4 text-ink-faint" aria-label={t('not completed')} />}
      <span className={done ? 'text-ink' : 'text-ink-muted'}>{label}</span>
    </li>
  );
}

type Upd = (p: Partial<Stage>, what: string) => void;

function PreparerActions({ s, st, status, update, t }: { s: DemoScenario; st: Stage; status: CaseStatus; update: Upd; t: T }) {
  const [notes, setNotes] = useState(t(s.outcomeNote));
  const needsVerification = !!s.verification;
  const canSubmit = st.analyzed && st.agent && (!needsVerification || !!st.outcome) && !st.submitted && !st.decision;
  const trace = useMemo(
    () => ['get_case_context', 'get_supplier_snapshot', 'get_extracted_evidence', 'compare_payment_details', 'get_missing_requirements', ...(needsVerification ? ['create_internal_verification_task'] : []), 'get_missing_requirements', 'prepare_review_summary'],
    [needsVerification],
  );
  return (
    <>
      <div className="card p-4">
        <p className="t-caption text-ink-muted">{t('Signed in as {name} · {role}', { name: t(PEOPLE.preparer.name), role: t('Preparer') })}</p>
        <ol className="mt-3 space-y-1.5">
          <Step done={st.analyzed} label={t('Analysis')} t={t} />
          <Step done={st.agent} label={t('Preparation agent')} t={t} />
          {needsVerification && <Step done={!!st.outcome} label={t('Independent verification')} t={t} />}
          <Step done={st.submitted || !!st.decision} label={t('Submitted for review')} t={t} />
        </ol>
      </div>
      <div className="card border-t-[3px] border-t-brand-600 p-4">
        <h3 className="text-[15px] font-semibold">{t('Next action')}</h3>
        {!st.analyzed && (
          <>
            <p className="mt-1 text-[13px] text-ink-muted">{t('Simulated analysis — no model is called in Demo Mode.')}</p>
            <Button className="mt-3 w-full" onClick={() => update({ analyzed: true }, t('analysis completed (simulated)'))}>{t('Run analysis')}</Button>
          </>
        )}
        {st.analyzed && !st.agent && (
          <Button className="mt-3 w-full" onClick={() => update({ agent: true }, t('preparation agent completed (simulated)'))}>
            <Bot className="h-4 w-4" aria-hidden /> {t('Run preparation agent')}
          </Button>
        )}
        {st.agent && needsVerification && !st.outcome && (
          <div className="mt-2 space-y-3 text-[13px]">
            <Notice tone="review">
              <span className="flex items-center gap-1.5 font-semibold"><Phone className="h-3.5 w-3.5" aria-hidden /> <Ltr>{s.verification!.channel}</Ltr></span>
              <span className="block">{t(s.verification!.channelSource)}. {t('Never use contact details from the request.')}</span>
            </Notice>
            <label htmlFor="demo-notes" className="block font-semibold">{t('What the supplier said')}</label>
            <textarea id="demo-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="field-input text-[13px]" />
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => update({ outcome: { outcome: 'CONFIRMED', notes } }, t('verification recorded — confirmed'))}>{t('Confirmed')}</Button>
              <Button size="sm" variant="secondary" onClick={() => update({ outcome: { outcome: 'NOT_CONFIRMED', notes } }, t('verification recorded — not confirmed'))}>{t('Not confirmed')}</Button>
            </div>
          </div>
        )}
        {canSubmit && (
          <Button className="mt-3 w-full" arrow onClick={() => update({ submitted: true }, t('submitted for review'))}>{t('Submit for review')}</Button>
        )}
        {st.submitted && !st.decision && <p className="mt-2 text-[13px] text-ink-muted">{t('Waiting for a reviewer. Switch the demo identity to Reviewer to continue.')}</p>}
        {st.decision && <p className="mt-2 text-[13px] text-ink-muted">{t('Decision recorded: {decision}.', { decision: t(DECISION_LABELS[st.decision.decision]) })}</p>}
      </div>
      {st.agent && (
        <div className="border border-white/10 bg-navy-900 p-4 text-white">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold"><Bot className="h-4 w-4" aria-hidden /> {t('Agent trace (simulated)')}</h3>
          <ol className="mt-2 space-y-1" dir="ltr">
            {trace.map((x, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px]"><Check className="h-3.5 w-3.5 text-signal-green" aria-hidden /><code className="font-mono text-white/80">{x}</code></li>
            ))}
          </ol>
          <p className="mt-2 text-[12.5px] text-white/60">{t('Waiting for:')} {needsVerification && !st.outcome ? t('a person to verify through the reference channel.') : t('the preparer to submit for review.')}</p>
        </div>
      )}
      <p className="text-[12px] text-ink-muted">{t('Status:')} {t(STATUS_LABELS[status])}</p>
    </>
  );
}

function ReviewerActions({ s, st, update, t }: { s: DemoScenario; st: Stage; status: CaseStatus; update: Upd; t: T }) {
  const [rationale, setRationale] = useState(t(s.decisionNote));
  const [error, setError] = useState<string | null>(null);
  const approveBlocked = isHighRisk(s.requestType) && st.outcome?.outcome !== 'CONFIRMED';
  if (!st.submitted || st.decision)
    return (
      <div className="card p-4 text-[14px]">
        <p className="t-caption text-ink-muted">{t('Signed in as {name} · {role}', { name: t(PEOPLE.reviewer.name), role: t('Reviewer') })}</p>
        <p className="mt-2">{st.decision ? t('Decision recorded: {decision}.', { decision: t(DECISION_LABELS[st.decision.decision]) }) : t('This case is not in your review queue yet. Switch to Preparer and prepare it first.')}</p>
      </div>
    );
  const decide = (d: 'APPROVED' | 'REJECTED' | 'RETURNED') => {
    if (rationale.trim().length < 20) return setError(t('Write a rationale of at least 20 characters.'));
    if (d === 'APPROVED' && approveBlocked) return setError(t('Approval is blocked: a confirmed independent verification is required for this request type.'));
    setError(null);
    update({ decision: { decision: d, rationale }, submitted: d !== 'RETURNED' }, `${t('review decision')} — ${t(DECISION_LABELS[d]).toLowerCase()}`);
  };
  return (
    <div className="card space-y-3 border-t-[3px] border-t-brand-600 p-4">
      <p className="t-caption text-ink-muted">{t('Signed in as {name} · {role}', { name: t(PEOPLE.reviewer.name), role: t('Reviewer (not the case creator)') })}</p>
      <h3 className="text-[15px] font-semibold">{t('Record your decision')}</h3>
      {approveBlocked && <Notice tone="review">{t('Approval stays blocked until a confirmed verification is recorded.')}</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      <label htmlFor="demo-rationale" className="block text-[13px] font-semibold">{t('Rationale')}</label>
      <textarea id="demo-rationale" rows={4} value={rationale} onChange={(e) => setRationale(e.target.value)} className="field-input text-[13px]" />
      <div className="grid gap-2">
        <Button onClick={() => decide('APPROVED')} disabled={approveBlocked}>{t('Approve within workflow')}</Button>
        <Button variant="danger" onClick={() => decide('REJECTED')}>{t('Reject')}</Button>
        <Button variant="secondary" onClick={() => decide('RETURNED')}>{t('Return for information')}</Button>
      </div>
    </div>
  );
}

function AdminView({ s, log, t }: { s: DemoScenario; log: Log[]; t: T }) {
  return (
    <section className="min-w-0 space-y-5" aria-label={t('Organization admin (demo)')}>
      <div>
        <p className="t-caption text-ink-muted">{t('Signed in as {name} · {role}', { name: t(PEOPLE.admin.name), role: t('Organization admin') })}</p>
        <h1 className="text-[26px] font-semibold uppercase tracking-[-0.01em]">{t('Al Waha Trading (demo organization)')}</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold"><ShieldCheck className="h-4 w-4" aria-hidden /> {t('Supplier reference')}</h2>
          <p className="t-caption mt-1 text-ink-muted">{t('Reference information reviewed by the business.')}</p>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <KeyValue label={t('Supplier')}><bdi>{s.supplier.name}</bdi></KeyValue>
            <KeyValue label={t('Expected beneficiary')}>{s.supplier.expectedBeneficiaryName}</KeyValue>
            <KeyValue label={t('Reference IBAN')}><Ltr mono>{maskAccount(s.supplier.referenceIban)}</Ltr></KeyValue>
            <KeyValue label={t('Usual currency')}>{s.supplier.usualCurrency}</KeyValue>
            <KeyValue label={t('Recorded email')}><Ltr>{s.supplier.recordedEmail}</Ltr></KeyValue>
            <KeyValue label={t('Recorded phone')}>{s.supplier.recordedPhone ? <Ltr>{s.supplier.recordedPhone}</Ltr> : null}</KeyValue>
            <div className="col-span-2"><KeyValue label={t('Source of reference')}>{t(s.supplier.referenceSource)}</KeyValue></div>
          </dl>
        </div>
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold"><Users className="h-4 w-4" aria-hidden /> {t('Members')}</h2>
          <ul className="mt-3 divide-y divide-line text-[14px]">
            {(Object.keys(PEOPLE) as Persona[]).map((p) => (
              <li key={p} className="flex justify-between py-2"><span>{t(PEOPLE[p].name)}</span><span className="text-ink-muted">{t(PEOPLE[p].role)}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-ink-muted">{t('In live mode, admins invite members with single-use links, change roles and remove members. The last admin can never be removed.')}</p>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold"><FlaskConical className="h-4 w-4" aria-hidden /> {t('Demo activity log')}</h2>
        {log.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-muted">{t('No demo actions yet. Switch to Preparer and work a case — every action appears here, like the live audit trail.')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-[13px]">
            {log.map((l, i) => (
              <li key={i} className="grid grid-cols-[70px_120px_1fr] gap-3 py-2"><span className="text-ink-muted">{l.at}</span><span className="font-semibold">{l.who}</span><span>{l.what}</span></li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

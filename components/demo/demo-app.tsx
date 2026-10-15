'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Check, CircleDashed, FlaskConical, Phone, RotateCcw, ShieldCheck, Users } from 'lucide-react';
import { Button, KeyValue, Logo, Ltr, Notice, SeverityBadge, StatusBadge, cx } from '@/components/ui';
import { HighlightedText, toneFor } from '@/components/evidence';
import { DEMO_SCENARIOS, type DemoScenario } from '@/lib/demo-data';
import { DECISION_LABELS, FIELD_LABELS, OUTCOME_LABELS, REQUEST_TYPE_LABELS, isHighRisk, type CaseStatus } from '@/lib/constants';
import { maskAccount } from '@/lib/iban';
import { liveHref } from '@/lib/site';

type Persona = 'preparer' | 'reviewer' | 'admin';
const PEOPLE: Record<Persona, { name: string; role: string }> = {
  preparer: { name: 'Omar (demo)', role: 'Preparer' },
  reviewer: { name: 'Sara (demo)', role: 'Reviewer' },
  admin: { name: 'Layla (demo)', role: 'Organization admin' },
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

export function DemoApp({ initialScenario, initialPersona }: { initialScenario: string; initialPersona: Persona }) {
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
    setLog((l) => [{ at: new Date().toLocaleTimeString('en-GB'), who: PEOPLE[persona].name, what: `${s.caseNumber}: ${what}` }, ...l].slice(0, 40));
  };
  const reset = () => {
    setStages({});
    setLog([]);
    setActive(null);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Bayyinah home"><Logo size="sm" /></Link>
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[12px] font-bold text-amber-900">Demo Mode</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-[13px] font-semibold text-amber-900 sm:inline" id="persona-label">Demo identity:</span>
            <div role="radiogroup" aria-labelledby="persona-label" className="flex rounded-full border border-amber-300 bg-white p-0.5">
              {(Object.keys(PEOPLE) as Persona[]).map((p) => (
                <button key={p} role="radio" aria-checked={persona === p} onClick={() => setPersona(p)} className={cx('rounded-full px-3 py-1 text-[13px] font-semibold', persona === p ? 'bg-navy text-white' : 'text-ink-soft hover:text-ink')}>
                  {PEOPLE[p].role}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset demo
            </Button>
            <Link href={liveHref('/signup')} className="hidden text-[13px] font-semibold text-brand-700 hover:underline md:inline">Switch to live mode</Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <Notice tone="review" title="Demonstration data and simulated AI results.">
          Fictional companies and people. Nothing here reads or writes live records, calls an AI model, or signs you in. The identity switcher above exists only in Demo Mode.
        </Notice>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <nav aria-label="Demo scenarios" className="space-y-2">
            <p className="t-caption px-1 text-ink-muted">Scenarios</p>
            {DEMO_SCENARIOS.map((x) => (
              <button key={x.id} onClick={() => { setScenarioId(x.id); setActive(null); }} aria-current={x.id === s.id ? 'true' : undefined} className={cx('w-full rounded-xl border px-3.5 py-3 text-left transition-colors', x.id === s.id ? 'border-brand-400 bg-white shadow-card' : 'border-line bg-white/60 hover:bg-white')}>
                <span className="block text-[14px] font-bold">{x.title}</span>
                <span className="block text-[12.5px] text-ink-muted">{REQUEST_TYPE_LABELS[x.requestType]} · {x.supplier.name}</span>
                <StatusBadge status={statusOf(x, stages[x.id] ?? fresh())} className="mt-2" />
              </button>
            ))}
          </nav>

          {persona === 'admin' ? (
            <AdminView s={s} log={log} />
          ) : (
            <section aria-label="Demo case" className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="t-caption text-ink-muted"><Ltr>{s.caseNumber}</Ltr> · {REQUEST_TYPE_LABELS[s.requestType]}</p>
                  <h1 className="text-[26px] font-bold tracking-[-0.03em]">{s.supplier.name}</h1>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.15fr_320px]">
                <div className="card p-5">
                  <h2 className="text-[15px] font-bold">Source — pasted email</h2>
                  <div className="mt-3 whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-[13px] leading-6 text-ink-soft">
                    {st.analyzed ? <HighlightedText text={s.source} activeId={active} marks={s.findings.filter((f) => f.quote).map((f) => ({ id: f.id, quote: f.quote!, tone: toneFor(f.severity) }))} /> : s.source}
                  </div>
                </div>

                <div className="space-y-4">
                  <PassportSection k="A" title="Request">
                    {st.analyzed ? (
                      <>
                        <p className="text-[14px]">{s.summary}</p>
                        <dl className="mt-3 grid grid-cols-2 gap-3">
                          {(['amount', 'beneficiaryName', 'iban', 'senderEmail'] as const).map((k) => (
                            <KeyValue key={k} label={FIELD_LABELS[k]}>{s.fields[k] ? <Ltr mono={k === 'iban'}>{k === 'amount' ? `${s.fields.currency ?? ''} ${s.fields[k]}` : s.fields[k]}</Ltr> : <span className="text-amber-700">Missing</span>}</KeyValue>
                          ))}
                        </dl>
                      </>
                    ) : (
                      <p className="text-[14px] text-ink-muted">Not analyzed yet.</p>
                    )}
                  </PassportSection>
                  <PassportSection k="B" title="Evidence & findings">
                    {st.analyzed ? (
                      <ul className="space-y-2">
                        {s.findings.map((f) => (
                          <li key={f.id}>
                            <button onClick={() => setActive(f.quote ? f.id : null)} className="w-full rounded-lg border border-line p-2.5 text-left hover:border-line-strong">
                              <span className="flex flex-wrap items-center gap-2"><SeverityBadge severity={f.severity} /><span className="text-[12px] font-semibold text-ink-muted">{f.source === 'RULE' ? `Rule ${f.label}` : `Simulated AI · ${f.label}`}</span></span>
                              <span className="mt-1 block text-[13px] leading-5">{f.explanation}</span>
                              {f.quote && <span className="mt-1 block text-[12px] text-brand-700">Show quote in source</span>}
                            </button>
                          </li>
                        ))}
                        {s.missing.map((m) => (
                          <li key={m} className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-2.5 py-2 text-[13px] text-amber-900">Missing: {m}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[14px] text-ink-muted">Findings appear after analysis.</p>
                    )}
                  </PassportSection>
                  <PassportSection k="C" title="Differences from reference">
                    {st.analyzed && s.findings.some((f) => f.reference) ? (
                      <table className="w-full text-[13px]">
                        <thead><tr className="text-left text-ink-muted"><th className="pb-1 font-medium">Field</th><th className="pb-1 font-medium">Reference</th><th className="pb-1 font-medium">Submitted</th></tr></thead>
                        <tbody>
                          {s.findings.filter((f) => f.reference).map((f) => (
                            <tr key={f.id} className="border-t border-line"><td className="py-1.5 pr-2 font-semibold">{f.label.replace('R-', '').replace('-COMPARE', '').replace('-DOMAIN', ' domain').toLowerCase()}</td><td className="py-1.5 pr-2"><Ltr mono>{f.reference}</Ltr></td><td className="py-1.5 text-red-700"><Ltr mono>{f.submitted}</Ltr></td></tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-[14px] text-ink-muted">{st.analyzed ? 'No differences from the reference. This does not prove authenticity.' : 'Compared after analysis.'}</p>
                    )}
                  </PassportSection>
                  <PassportSection k="D" title="Independent verification">
                    {!s.verification ? (
                      <p className="text-[14px] text-ink-muted">{st.agent ? 'Not required by the rules for this case.' : 'Determined by the preparation agent.'}</p>
                    ) : st.outcome ? (
                      <div className="text-[14px]">
                        <p className="font-semibold">{OUTCOME_LABELS[st.outcome.outcome]}</p>
                        <p className="text-ink-soft">{st.outcome.notes}</p>
                        <p className="t-caption mt-1 text-ink-muted">Verification outcome recorded by {PEOPLE.preparer.name}.</p>
                      </div>
                    ) : st.agent ? (
                      <p className="text-[14px]">Open task: {s.verification.task} — <Ltr>{s.verification.channel}</Ltr></p>
                    ) : (
                      <p className="text-[14px] text-ink-muted">Required for this request type. The agent will create the task.</p>
                    )}
                  </PassportSection>
                  <PassportSection k="E" title="Decision">
                    {st.decision ? (
                      <div className="text-[14px]">
                        <p className="font-semibold">{DECISION_LABELS[st.decision.decision]}</p>
                        <p className="text-ink-soft">{st.decision.rationale}</p>
                        <p className="t-caption mt-1 text-ink-muted">Recorded by {PEOPLE.reviewer.name}. {st.decision.decision === 'APPROVED' ? 'An authorized reviewer recorded approval within this workflow; no transfer was made.' : ''}</p>
                      </div>
                    ) : (
                      <p className="text-[14px] text-ink-muted">No decision yet.</p>
                    )}
                  </PassportSection>
                </div>

                <aside aria-label="Next action" className="space-y-4">
                  {persona === 'preparer' ? <PreparerActions s={s} st={st} status={status} update={update} /> : <ReviewerActions s={s} st={st} status={status} update={update} />}
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
      <h2 className="flex items-center gap-2 text-[15px] font-bold"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-navy text-[12px] text-white">{k}</span>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-[13px]">
      {done ? <Check className="h-4 w-4 text-emerald-600" aria-label="completed" /> : <CircleDashed className="h-4 w-4 text-ink-faint" aria-label="not completed" />}
      <span className={done ? 'text-ink' : 'text-ink-muted'}>{label}</span>
    </li>
  );
}

type Upd = (p: Partial<Stage>, what: string) => void;

function PreparerActions({ s, st, status, update }: { s: DemoScenario; st: Stage; status: CaseStatus; update: Upd }) {
  const [notes, setNotes] = useState(s.outcomeNote);
  const needsVerification = !!s.verification;
  const canSubmit = st.analyzed && st.agent && (!needsVerification || !!st.outcome) && !st.submitted && !st.decision;
  const trace = useMemo(
    () => ['get_case_context', 'get_supplier_snapshot', 'get_extracted_evidence', 'compare_payment_details', 'get_missing_requirements', ...(needsVerification ? ['create_internal_verification_task'] : []), 'get_missing_requirements', 'prepare_review_summary'],
    [needsVerification],
  );
  return (
    <>
      <div className="card p-4">
        <p className="t-caption text-ink-muted">Signed in as {PEOPLE.preparer.name} · Preparer</p>
        <ol className="mt-3 space-y-1.5">
          <Step done={st.analyzed} label="Analysis" />
          <Step done={st.agent} label="Preparation agent" />
          {needsVerification && <Step done={!!st.outcome} label="Independent verification" />}
          <Step done={st.submitted || !!st.decision} label="Submitted for review" />
        </ol>
      </div>
      <div className="card p-4">
        <h3 className="text-[15px] font-bold">Next action</h3>
        {!st.analyzed && (
          <>
            <p className="mt-1 text-[13px] text-ink-muted">Simulated analysis — no model is called in Demo Mode.</p>
            <Button className="mt-3 w-full" onClick={() => update({ analyzed: true }, 'analysis completed (simulated)')}>Run analysis</Button>
          </>
        )}
        {st.analyzed && !st.agent && (
          <Button className="mt-3 w-full" onClick={() => update({ agent: true }, 'preparation agent completed (simulated)')}>
            <Bot className="h-4 w-4" aria-hidden /> Run preparation agent
          </Button>
        )}
        {st.agent && needsVerification && !st.outcome && (
          <div className="mt-2 space-y-3 text-[13px]">
            <Notice tone="review">
              <span className="flex items-center gap-1.5 font-semibold"><Phone className="h-3.5 w-3.5" aria-hidden /> <Ltr>{s.verification!.channel}</Ltr></span>
              <span className="block">{s.verification!.channelSource}. Never use contact details from the request.</span>
            </Notice>
            <label htmlFor="demo-notes" className="block font-semibold">What the supplier said</label>
            <textarea id="demo-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="field-input text-[13px]" />
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => update({ outcome: { outcome: 'CONFIRMED', notes } }, 'verification recorded — confirmed')}>Confirmed</Button>
              <Button size="sm" variant="secondary" onClick={() => update({ outcome: { outcome: 'NOT_CONFIRMED', notes } }, 'verification recorded — not confirmed')}>Not confirmed</Button>
            </div>
          </div>
        )}
        {canSubmit && (
          <Button className="mt-3 w-full" arrow onClick={() => update({ submitted: true }, 'submitted for review')}>Submit for review</Button>
        )}
        {st.submitted && !st.decision && <p className="mt-2 text-[13px] text-ink-muted">Waiting for a reviewer. Switch the demo identity to <strong>Reviewer</strong> to continue.</p>}
        {st.decision && <p className="mt-2 text-[13px] text-ink-muted">Decision recorded: {DECISION_LABELS[st.decision.decision]}.</p>}
      </div>
      {st.agent && (
        <div className="card p-4">
          <h3 className="flex items-center gap-2 text-[15px] font-bold"><Bot className="h-4 w-4" aria-hidden /> Agent trace (simulated)</h3>
          <ol className="mt-2 space-y-1">
            {trace.map((t, i) => (
              <li key={i} className="flex items-center gap-2 text-[12.5px]"><Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /><code className="font-mono">{t}</code></li>
            ))}
          </ol>
          <p className="mt-2 text-[12.5px] text-ink-muted">Waiting for: {needsVerification && !st.outcome ? 'a person to verify through the reference channel.' : 'the preparer to submit for review.'}</p>
        </div>
      )}
      <p className="text-[12px] text-ink-muted">Status: {status.replace(/_/g, ' ').toLowerCase()}</p>
    </>
  );
}

function ReviewerActions({ s, st, update }: { s: DemoScenario; st: Stage; status: CaseStatus; update: Upd }) {
  const [rationale, setRationale] = useState(s.decisionNote);
  const [error, setError] = useState<string | null>(null);
  const approveBlocked = isHighRisk(s.requestType) && st.outcome?.outcome !== 'CONFIRMED';
  if (!st.submitted || st.decision)
    return (
      <div className="card p-4 text-[14px]">
        <p className="t-caption text-ink-muted">Signed in as {PEOPLE.reviewer.name} · Reviewer</p>
        <p className="mt-2">{st.decision ? `Decision recorded: ${DECISION_LABELS[st.decision.decision]}.` : 'This case is not in your review queue yet. Switch to Preparer and prepare it first.'}</p>
      </div>
    );
  const decide = (d: 'APPROVED' | 'REJECTED' | 'RETURNED') => {
    if (rationale.trim().length < 20) return setError('Write a rationale of at least 20 characters.');
    if (d === 'APPROVED' && approveBlocked) return setError('Approval is blocked: a confirmed independent verification is required for this request type.');
    setError(null);
    update({ decision: { decision: d, rationale }, submitted: d !== 'RETURNED' }, `review decision — ${DECISION_LABELS[d].toLowerCase()}`);
  };
  return (
    <div className="card space-y-3 p-4">
      <p className="t-caption text-ink-muted">Signed in as {PEOPLE.reviewer.name} · Reviewer (not the case creator)</p>
      <h3 className="text-[15px] font-bold">Record your decision</h3>
      {approveBlocked && <Notice tone="review">Approval stays blocked until a confirmed verification is recorded.</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      <label htmlFor="demo-rationale" className="block text-[13px] font-semibold">Rationale</label>
      <textarea id="demo-rationale" rows={4} value={rationale} onChange={(e) => setRationale(e.target.value)} className="field-input text-[13px]" />
      <div className="grid gap-2">
        <Button onClick={() => decide('APPROVED')} disabled={approveBlocked}>Approve within workflow</Button>
        <Button variant="danger" onClick={() => decide('REJECTED')}>Reject</Button>
        <Button variant="secondary" onClick={() => decide('RETURNED')}>Return for information</Button>
      </div>
    </div>
  );
}

function AdminView({ s, log }: { s: DemoScenario; log: Log[] }) {
  return (
    <section className="min-w-0 space-y-5" aria-label="Organization admin (demo)">
      <div>
        <p className="t-caption text-ink-muted">Signed in as {PEOPLE.admin.name} · Organization admin</p>
        <h1 className="text-[26px] font-bold tracking-[-0.03em]">Al Waha Trading (demo organization)</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-[16px] font-bold"><ShieldCheck className="h-4 w-4" aria-hidden /> Supplier reference</h2>
          <p className="t-caption mt-1 text-ink-muted">Reference information reviewed by the business.</p>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <KeyValue label="Supplier">{s.supplier.name}</KeyValue>
            <KeyValue label="Expected beneficiary">{s.supplier.expectedBeneficiaryName}</KeyValue>
            <KeyValue label="Reference IBAN"><Ltr mono>{maskAccount(s.supplier.referenceIban)}</Ltr></KeyValue>
            <KeyValue label="Usual currency">{s.supplier.usualCurrency}</KeyValue>
            <KeyValue label="Recorded email"><Ltr>{s.supplier.recordedEmail}</Ltr></KeyValue>
            <KeyValue label="Recorded phone">{s.supplier.recordedPhone ? <Ltr>{s.supplier.recordedPhone}</Ltr> : null}</KeyValue>
            <div className="col-span-2"><KeyValue label="Source of reference">{s.supplier.referenceSource}</KeyValue></div>
          </dl>
        </div>
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-[16px] font-bold"><Users className="h-4 w-4" aria-hidden /> Members</h2>
          <ul className="mt-3 divide-y divide-line text-[14px]">
            {(Object.keys(PEOPLE) as Persona[]).map((p) => (
              <li key={p} className="flex justify-between py-2"><span>{PEOPLE[p].name}</span><span className="text-ink-muted">{PEOPLE[p].role}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-ink-muted">In live mode, admins invite members with single-use links, change roles and remove members. The last admin can never be removed.</p>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="flex items-center gap-2 text-[16px] font-bold"><FlaskConical className="h-4 w-4" aria-hidden /> Demo activity log</h2>
        {log.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-muted">No demo actions yet. Switch to Preparer and work a case — every action appears here, like the live audit trail.</p>
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

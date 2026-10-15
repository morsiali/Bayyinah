import Link from 'next/link';
import { ArrowUpRight, Check, FileText, Landmark, Minus, UserPlus } from 'lucide-react';
import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { QuickCheck } from '@/components/site/quick-check';
import { LinkButton, Pill, SectionTitle, SeverityBadge, Ltr, cx } from '@/components/ui';
import { HighlightedText, toneFor } from '@/components/evidence';
import { DEMO_SCENARIOS } from '@/lib/demo-data';
import { REQUEST_TYPE_LABELS } from '@/lib/constants';

const SIGNALS = [
  'IBAN checksum',
  'Reference account comparison',
  'Beneficiary name match',
  'Sender domain comparison',
  'Urgency language',
  'Requests for secrecy',
  'Requests to skip verification',
  'New contact details',
  'Embedded instructions',
  'Currency against usual',
  'Amount against expected',
  'Missing required details',
];

const WORKFLOW = [
  {
    n: '01',
    title: 'Prepare',
    lead: 'Turn a message into a structured case.',
    persona: 'preparer',
    items: [
      { t: 'Add the request', d: 'Paste the text or upload a text-based PDF' },
      { t: 'Review the extraction', d: 'Correct any field; the original is preserved' },
      { t: 'Compare with the reference', d: 'Rules check account, name, domain, amount' },
      { t: 'Run the preparation agent', d: 'Creates the verification tasks the case needs' },
    ],
  },
  {
    n: '02',
    title: 'Verify',
    lead: 'A person confirms through a channel you already trust.',
    persona: 'preparer',
    items: [
      { t: 'Use the reference channel', d: 'Never a number or link from the request' },
      { t: 'Record the outcome', d: 'Channel, source, notes and optional evidence' },
    ],
  },
  {
    n: '03',
    title: 'Decide',
    lead: 'A different person reviews and records the decision.',
    persona: 'reviewer',
    items: [
      { t: 'Separate reviewer', d: 'The case creator can never approve it' },
      { t: 'Decision Passport', d: 'Request, evidence, differences, verification, decision' },
      { t: 'Printable report', d: 'Save as PDF with the evidence version used' },
      { t: 'Audit history', d: 'Every change, by whom and when' },
    ],
  },
];

const FAQ = [
  { q: 'Does Bayyinah tell me whether a request is fraud?', a: 'No. It shows what the request says, where it differs from the details you hold, and what still has to be verified by a person. Language indicators and differences are reasons to check, not verdicts.' },
  { q: 'Does it make payments or connect to my bank?', a: 'No. Bayyinah never moves money, authorizes transfers or connects to banking systems. An approval in Bayyinah records a decision within your workflow; the payment itself happens in your normal banking process.' },
  { q: 'Who can approve a bank account change?', a: 'Only a member with the Reviewer role who did not create the case — and only after a person has recorded an independent verification with a “confirmed” outcome through a channel from your supplier reference.' },
  { q: 'What happens to the documents we upload?', a: 'Files are stored privately and are visible only to members of your organization. When an AI provider is configured, the request text is sent to that provider for analysis; the case page names the provider before you run it. Retention is configurable per organization.' },
  { q: 'Can a document trick the AI into approving something?', a: 'Embedded instructions are treated as data and flagged. More importantly, no tool available to the AI or the agent can approve, close, edit supplier details or contact anyone — those actions only exist for authenticated people with the right role.' },
  { q: 'Does it read scanned PDFs or images?', a: 'Not in this version. Scanned or image-only PDFs are recorded as unreadable and you are asked to paste the text. Bayyinah never invents an extraction.' },
  { q: 'Is there a cost?', a: 'Bayyinah is in its pilot phase. Contact us to discuss a pilot for your business.' },
];

export default function HomePage() {
  const example = DEMO_SCENARIOS[1];
  return (
    <>
      <div className="px-2 pt-2 md:px-3 md:pt-3">
        <section className="panel-hero" aria-labelledby="hero-title">
          <div className="dot-field pointer-events-none absolute inset-0" aria-hidden />
          <SiteHeader />
          <main id="main" className="relative mx-auto grid max-w-[1240px] gap-12 px-5 pb-10 pt-10 md:px-8 lg:grid-cols-[1.08fr_1fr] lg:gap-14 lg:pb-14 lg:pt-16">
            <div className="animate-fade-up">
              <Link href="/demo" className="pill hover:border-line-strong">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                Pilot version for UAE small businesses
                <ArrowUpRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              </Link>
              <h1 id="hero-title" className="t-display mt-7">
                Turn a payment request
                <br />
                <span className="text-brand-600">into a decision you can show.</span>
              </h1>
              <p className="t-lead mt-6 max-w-[34rem] text-[18px]">
                For the moment an <strong className="font-semibold text-ink">invoice</strong>, a <strong className="font-semibold text-ink">bank account change</strong> or a <strong className="font-semibold text-ink">new beneficiary</strong> lands in your inbox: compare it with what you know, verify it with a person you trust, and record who decided — and why.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <LinkButton href="/signup" size="lg" arrow>
                  Register your organization
                </LinkButton>
                <LinkButton href="/demo" size="lg" variant="secondary">
                  Explore the demo
                </LinkButton>
              </div>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line/80 pt-6">
                <div>
                  <dt className="t-caption text-ink-muted">Request types</dt>
                  <dd className="text-[28px] font-bold tracking-[-0.03em]">3</dd>
                </div>
                <div>
                  <dt className="t-caption text-ink-muted">People per approval</dt>
                  <dd className="text-[28px] font-bold tracking-[-0.03em]">2</dd>
                </div>
                <div>
                  <dt className="t-caption text-ink-muted">Payments it can make</dt>
                  <dd className="text-[28px] font-bold tracking-[-0.03em]">0</dd>
                </div>
              </dl>
            </div>
            <div className="lg:pt-2">
              <QuickCheck />
            </div>
          </main>
          <div className="relative overflow-hidden border-t border-white/60 bg-white/40 py-4 backdrop-blur-sm" aria-label="Signals Bayyinah checks">
            <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
              {[...SIGNALS, ...SIGNALS].map((s, i) => (
                <span key={i} aria-hidden={i >= SIGNALS.length} className="whitespace-nowrap rounded-full border border-white bg-white/70 px-4 py-1.5 text-[14px] font-semibold text-navy-700 shadow-pill">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Illustrative example */}
      <section id="example" className="mx-auto max-w-[1240px] scroll-mt-6 px-5 pt-24 md:px-8 md:pt-32" aria-labelledby="example-title">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <Pill dot="amber">Fictional example — illustrative only</Pill>
            <h2 id="example-title" className="t-headline mt-5">
              One request.
              <br />
              <span className="text-brand-600">Every claim traced to its source.</span>
            </h2>
            <p className="t-lead mt-4 max-w-xl">
              This is how Bayyinah lays out a case as a <em className="not-italic font-semibold text-ink">Decision Passport</em>. Each finding links to an exact quote, a reference comparison, a recorded verification or a named business rule. There is no fraud score.
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="t-caption text-ink-muted">{REQUEST_TYPE_LABELS[example.requestType]}</p>
                <p className="text-[20px] font-bold tracking-[-0.02em]">{example.supplier.name}</p>
              </div>
              <Ltr mono className="rounded-lg bg-zinc-100 px-2 py-1 text-[12px] text-ink-soft">
                {example.caseNumber}
              </Ltr>
            </div>
            <div className="mt-4 whitespace-pre-wrap rounded-xl border border-line bg-zinc-50 p-3 text-[13px] leading-6 text-ink-soft">
              <HighlightedText text={example.source} marks={example.findings.filter((f) => f.quote).map((f) => ({ id: f.id, quote: f.quote!, tone: toneFor(f.severity) }))} />
            </div>
          </div>
        </div>

        <div className="-mx-5 mt-10 flex snap-x gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5">
          {[
            { k: 'A', t: 'Request', body: example.summary },
            { k: 'B', t: 'Evidence', body: `1 pasted email. ${example.findings.filter((f) => f.quote).length} quoted indicators, each found verbatim in the source.` },
            { k: 'C', t: 'Differences', body: 'Account differs from the reference (ending 9101 → 7777). Sender domain differs from the recorded one.' },
            { k: 'D', t: 'Independent verification', body: `Call ${example.supplier.recordedPhone} — the number from the supplier reference, never one from the email.` },
            { k: 'E', t: 'Decision', body: 'Recorded by a reviewer who did not prepare the case, with rationale and evidence version.' },
          ].map((s) => (
            <article key={s.k} className="card min-w-[250px] snap-start p-5 md:min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy text-[13px] font-bold text-white">{s.k}</span>
                <h3 className="text-[16px] font-bold tracking-[-0.01em]">{s.t}</h3>
              </div>
              <p className="mt-3 text-[14px] leading-6 text-ink-soft">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Scenarios */}
      <section className="pt-24 md:pt-28" aria-labelledby="scenarios-title">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 md:flex-row md:items-end md:justify-between md:px-8">
          <SectionTitle first="Five scenarios." second="Patterns every finance team meets." intro="Walk through each one in Demo Mode as a preparer, a reviewer or an administrator. All companies, people and accounts are fictional." />
          <LinkButton href="/demo" variant="secondary" size="lg" className="self-start md:self-auto">
            Open Demo Mode
          </LinkButton>
        </div>
        <div className="mt-10 flex snap-x scroll-px-5 gap-5 overflow-x-auto px-5 pb-6 md:px-8 xl:px-[max(2rem,calc((100vw-1240px)/2+2rem))]">
          {DEMO_SCENARIOS.map((s, i) => (
            <Link key={s.id} href={`/demo?scenario=${s.id}`} className="group w-[300px] shrink-0 snap-start">
              <div className={cx('relative h-[188px] overflow-hidden rounded-2xl border border-line bg-gradient-to-b p-4 shadow-card transition-shadow group-hover:shadow-lift', s.tone)}>
                <span className="absolute left-4 top-4 rounded-full bg-white px-2 py-0.5 text-[12px] font-bold shadow-pill">{String(i + 1).padStart(2, '0')}</span>
                <div className="absolute inset-x-6 bottom-0 top-12 rounded-t-xl border border-line bg-white p-3 shadow-card">
                  <p className="text-[11px] font-semibold text-ink-muted">{s.caseNumber}</p>
                  <p className="text-[13px] font-bold leading-4">{s.supplier.name}</p>
                  <div className="mt-2 space-y-1.5">
                    {s.findings.slice(0, 3).map((f) => (
                      <div key={f.id} className="flex items-center gap-1.5">
                        <SeverityBadge severity={f.severity} />
                        <span className="truncate text-[11px] text-ink-soft">{f.label.startsWith('R-') ? 'Business rule' : f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="t-caption mt-4 text-ink-muted">{REQUEST_TYPE_LABELS[s.requestType]}</p>
              <h3 className="text-[19px] font-bold tracking-[-0.02em] group-hover:text-brand-700">{s.title}</h3>
              <p className="mt-1 text-[14px] leading-6 text-ink-muted">{s.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-[1240px] scroll-mt-6 px-5 pt-24 md:px-8 md:pt-28" aria-labelledby="workflow-title">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="workflow-title" className="t-headline">
              Three steps,
              <br />
              <span className="text-brand-600">one clear next action at a time.</span>
            </h2>
            <p className="t-lead mt-4 max-w-xl">The workflow is the product. Each step unlocks only when the one before it is complete, and each is done by a person with the right role.</p>
          </div>
          <LinkButton href="/signup" arrow className="self-start md:self-auto">
            Start a live case
          </LinkButton>
        </div>
        <div className="mt-12 border-t border-line">
          {WORKFLOW.map((w) => (
            <div key={w.n} className="grid gap-6 border-b border-line py-10 md:grid-cols-[minmax(0,320px)_1fr]">
              <div className="flex gap-4">
                <span className="pt-1.5 font-mono text-[13px] font-semibold text-brand-600">{w.n}</span>
                <div>
                  <h3 className="text-[30px] font-bold tracking-[-0.03em]">{w.title}</h3>
                  <p className="mt-1 max-w-[16rem] text-[15px] text-ink-muted">{w.lead}</p>
                </div>
              </div>
              <ul className="grid gap-x-8 sm:grid-cols-2">
                {w.items.map((it) => (
                  <li key={it.t}>
                    <Link href={`/demo?persona=${w.persona}`} className="group flex items-start justify-between gap-4 border-b border-line py-4 hover:border-ink/20">
                      <span>
                        <span className="block text-[16px] font-bold tracking-[-0.01em]">{it.t}</span>
                        <span className="block text-[14px] text-ink-muted">{it.d}</span>
                      </span>
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-brand-600" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Who + AI role */}
      <section id="ai" className="mx-auto max-w-[1240px] scroll-mt-6 px-5 pt-24 md:px-8 md:pt-28" aria-labelledby="ai-title">
        <SectionTitle first="Built for the people who move money." second="With an assistant that knows its place." intro="Preparers build cases, reviewers decide, administrators keep supplier references honest. Each person signs in with their own account; the company is never a shared login." />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="card p-7">
            <h3 id="ai-title" className="t-sub">What the AI assistant does</h3>
            <ul className="mt-5 space-y-3 text-[15px]">
              {['Reads the request and extracts amount, beneficiary, account and sender', 'Flags urgency, secrecy, requests to bypass procedure and new contact details', 'Quotes the exact words behind every indicator — unsupported quotes are discarded', 'Suggests questions to ask through your reference channel', 'Prepares the case and creates the verification task it needs'].map((x) => (
                <li key={x} className="flex gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-7">
            <h3 className="t-sub">What it never does</h3>
            <ul className="mt-5 space-y-3 text-[15px]">
              {['Approve, reject or close a case', 'Execute payments or authorize bank transfers', 'Contact suppliers, send messages or follow links', 'Edit supplier bank details or invent a verification outcome', 'Declare a request “fraud” or “safe”, or produce a fraud score'].map((x) => (
                <li key={x} className="flex gap-3">
                  <Minus className="mt-1 h-4 w-4 shrink-0 text-[color:var(--danger)]" aria-hidden />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Request types */}
      <section id="types" className="mx-auto max-w-[1240px] scroll-mt-6 px-5 pt-24 md:px-8 md:pt-28" aria-labelledby="types-title">
        <h2 id="types-title" className="t-headline">
          Three request types.
          <br />
          <span className="text-brand-600">Each with its own rules.</span>
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: FileText, t: 'Invoice payment', d: 'Compares the invoice with the supplier reference. Verification is required as soon as the account, beneficiary, amount or sender differs, or the wording asks to bypass procedure.' },
            { icon: Landmark, t: 'Bank account change', d: 'Always requires a recorded independent verification through a reference channel and a reviewer who is not the case creator. The AI cannot waive either.' },
            { icon: UserPlus, t: 'New beneficiary', d: 'Treated like an account change: the new details must be confirmed through an established channel, and the name must match — or the difference explained.' },
          ].map((x) => (
            <div key={x.t} className="card-flat p-7">
              <x.icon className="h-6 w-6 text-brand-600" aria-hidden />
              <h3 className="mt-5 text-[20px] font-bold tracking-[-0.02em]">{x.t}</h3>
              <p className="mt-2 text-[15px] leading-7 text-ink-soft">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-[1240px] scroll-mt-6 px-5 py-24 md:px-8 md:py-28" aria-labelledby="faq-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <h2 id="faq-title" className="t-headline">
              Plain questions.
              <br />
              <span className="text-brand-600">Honest limits.</span>
            </h2>
            <p className="t-lead mt-4">Something else on your mind? Write to us from the contact block below.</p>
          </div>
          <div className="border-t border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-bold tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-[15px] leading-7 text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

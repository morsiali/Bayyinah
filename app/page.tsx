import Link from 'next/link';
import { ArrowUpRight, FileText, Landmark, UserPlus } from 'lucide-react';
import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { QuickCheck } from '@/components/site/quick-check';
import { Eyebrow, LinkButton, SeverityBadge, Ltr, cx, flipRtl } from '@/components/ui';
import { HighlightedText, toneFor } from '@/components/evidence';
import { DEMO_SCENARIOS } from '@/lib/demo-data';
import { REQUEST_TYPE_LABELS } from '@/lib/constants';
import { getT } from '@/lib/i18n/server';
import { liveHref } from '@/lib/site';

const TOTAL = '07';
const idx = (n: number) => `${String(n).padStart(2, '0')} / ${TOTAL}`;
const BAR = ['border-signal-green', 'border-signal-blue', 'border-brand-600', 'border-signal-red', 'border-signal-teal'];
const BAR_S = ['border-s-signal-green', 'border-s-signal-blue', 'border-s-brand-600'];

export default async function HomePage() {
  const { t } = await getT();
  const example = DEMO_SCENARIOS[1];

  const SIGNALS = [
    t('IBAN checksum'),
    t('Reference account comparison'),
    t('Beneficiary name match'),
    t('Sender domain comparison'),
    t('Urgency language'),
    t('Requests for secrecy'),
    t('Requests to skip verification'),
    t('New contact details'),
    t('Embedded instructions'),
    t('Currency against usual'),
    t('Amount against expected'),
    t('Missing required details'),
  ];

  const WORKFLOW = [
    {
      n: '01',
      title: t('Prepare'),
      lead: t('Turn a message into a structured case.'),
      persona: 'preparer',
      items: [
        { t: t('Add the request'), d: t('Paste the text or upload a text-based PDF') },
        { t: t('Review the extraction'), d: t('Correct any field; the original is preserved') },
        { t: t('Compare with the reference'), d: t('Rules check account, name, domain, amount') },
        { t: t('Run the preparation agent'), d: t('Creates the verification tasks the case needs') },
      ],
    },
    {
      n: '02',
      title: t('Verify'),
      lead: t('A person confirms through a channel you already trust.'),
      persona: 'preparer',
      items: [
        { t: t('Use the reference channel'), d: t('Never a number or link from the request') },
        { t: t('Record the outcome'), d: t('Channel, source, notes and optional evidence') },
      ],
    },
    {
      n: '03',
      title: t('Decide'),
      lead: t('A different person reviews and records the decision.'),
      persona: 'reviewer',
      items: [
        { t: t('Separate reviewer'), d: t('The case creator can never approve it') },
        { t: t('Decision Passport'), d: t('Request, evidence, differences, verification, decision') },
        { t: t('Printable report'), d: t('Save as PDF with the evidence version used') },
        { t: t('Audit history'), d: t('Every change, by whom and when') },
      ],
    },
  ];

  const FAQ = [
    { q: t('Does Bayyinah tell me whether a request is fraud?'), a: t('No. It shows what the request says, where it differs from the details you hold, and what still has to be verified by a person. Language indicators and differences are reasons to check, not verdicts.') },
    { q: t('Does it make payments or connect to my bank?'), a: t('No. Bayyinah never moves money, authorizes transfers or connects to banking systems. An approval in Bayyinah records a decision within your workflow; the payment itself happens in your normal banking process.') },
    { q: t('Who can approve a bank account change?'), a: t('Only a member with the Reviewer role who did not create the case — and only after a person has recorded an independent verification with a “confirmed” outcome through a channel from your supplier reference.') },
    { q: t('What happens to the documents we upload?'), a: t('Files are stored privately and are visible only to members of your organization. When an AI provider is configured, the request text is sent to that provider for analysis; the case page names the provider before you run it. Retention is configurable per organization.') },
    { q: t('Can a document trick the AI into approving something?'), a: t('Embedded instructions are treated as data and flagged. More importantly, no tool available to the AI or the agent can approve, close, edit supplier details or contact anyone — those actions only exist for authenticated people with the right role.') },
    { q: t('Does it read scanned PDFs or images?'), a: t('Not in this version. Scanned or image-only PDFs are recorded as unreadable and you are asked to paste the text. Bayyinah never invents an extraction.') },
    { q: t('Can I use it in Arabic?'), a: t('Yes. The whole interface is available in Arabic and English — switch with the language button at the top of any page. Requests can be written in either language.') },
    { q: t('Is there a cost?'), a: t('Bayyinah is in its pilot phase. Contact us to discuss a pilot for your business.') },
  ];

  const passport = [
    { k: 'T+00', t: t('Request'), body: t(example.summary) },
    { k: 'T+01', t: t('Evidence'), body: t('1 pasted email. {n} quoted indicators, each found verbatim in the source.', { n: example.findings.filter((f) => f.quote).length }) },
    { k: 'T+02', t: t('Differences'), body: t('Account differs from the reference (ending 9101 → 7777). Sender domain differs from the recorded one.') },
    { k: 'T+03', t: t('Independent verification'), body: t('Call {phone} — the number from the supplier reference, never one from the email.', { phone: example.supplier.recordedPhone ?? '' }) },
    { k: 'T+04', t: t('Decision'), body: t('Recorded by a reviewer who did not prepare the case, with rationale and evidence version.') },
  ];

  return (
    <>
      {/* Hero */}
      <section className="panel-hero" aria-labelledby="hero-title">
        <div className="dot-field pointer-events-none absolute inset-0" aria-hidden />
        <SiteHeader />
        <main id="main" className="relative mx-auto grid max-w-[1240px] gap-12 px-5 pb-16 pt-14 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <p className="t-eyebrow !text-white/80">{t('Pilot for UAE small businesses. A human decision on every case.')}</p>
            <h1 id="hero-title" className="t-display mt-6 text-white">
              {t('Turn a payment request into a decision you can show.')}
            </h1>
            <p className="mt-6 max-w-[36rem] text-[18px] leading-[1.6] text-white/90">
              {t('For the moment an invoice, a bank account change or a new beneficiary lands in your inbox: compare it with what you know, verify it with a person you trust, and record who decided — and why.')}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <LinkButton href={liveHref('/signup')} size="lg">
                {t('Register your organization')}
              </LinkButton>
              <LinkButton href="/demo" size="lg" variant="outline-light" arrow>
                {t('Explore the demo')}
              </LinkButton>
            </div>
            <dl className="mt-10 flex flex-wrap gap-2.5">
              {[
                { v: '3', l: t('Request types') },
                { v: '2', l: t('People per approval') },
                { v: '0', l: t('Payments it can make') },
              ].map((s) => (
                <div key={s.l} className="flex items-center gap-2.5 rounded-sm border border-white/40 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <dd className="font-mono text-[15px] font-semibold text-white">{s.v}</dd>
                  <dt className="text-[13px] text-white/85">{s.l}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:pt-6">
            <QuickCheck />
          </div>
        </main>
      </section>

      {/* Signals strip */}
      <div className="relative overflow-hidden border-b border-line bg-white py-5" aria-label={t('Signals Bayyinah checks')}>
        <div className="flex w-max animate-marquee gap-10 hover:[animation-play-state:paused] rtl:animate-marquee-rtl">
          {[...SIGNALS, ...SIGNALS].map((s, i) => (
            <span key={i} aria-hidden={i >= SIGNALS.length} className="t-eyebrow whitespace-nowrap !text-ink-faint">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* 01 — the problem */}
      <section className="panel-mist" aria-labelledby="problem-title">
        <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28">
          <Eyebrow label={t('The problem')} index={idx(1)} />
          <h2 id="problem-title" className="t-headline mt-8 max-w-4xl">
            {t('A payment request is easy to fake.')} <span className="text-brand-600">{t('A decision is hard to defend.')}</span>
          </h2>
          <p className="t-lead mt-6 max-w-3xl">
            {t('Supplier emails get spoofed, bank details get “updated”, and the person who paid is left explaining why. Most teams have no record of what was checked, by whom, or against what.')}
          </p>
          <div className="mt-12 border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
              <p className="t-eyebrow !text-ink">{t('The decision ledger')}</p>
              <p className="t-eyebrow !text-ink-faint">{t('Every compared detail lands in exactly one column')}</p>
            </div>
            <div className="grid md:grid-cols-3">
              {[
                { c: 'text-[color:var(--done)]', h: t('Matches the reference'), d: t('The detail agrees with the supplier record you hold. Recorded — but a match never proves a request is genuine.') },
                { c: 'text-signal-red', h: t('Differs from the reference'), d: t('Account, name, sender domain or amount disagrees. Quoted from the source, and it makes independent verification mandatory.') },
                { c: 'text-ink-faint', h: t('Not yet verified'), d: t('Nobody has confirmed it through a trusted channel. On most requests this is the column that matters most.') },
              ].map((x, i) => (
                <div key={x.h} className={cx('p-5 md:p-6', i > 0 && 'border-t border-line md:border-s md:border-t-0')}>
                  <p className={cx('t-eyebrow font-semibold', x.c)}>{x.h}</p>
                  <p className="mt-3 text-[15px] leading-6 text-ink-muted">{x.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 grid gap-6 border-t-[3px] border-signal-green bg-navy-900 p-7 text-white md:grid-cols-2 md:p-9">
            <div>
              <p className="t-eyebrow !text-signal-green">{t('With Bayyinah')}</p>
              <p className="t-headline mt-4 !text-[clamp(1.5rem,2.6vw,2rem)] text-white">{t('Every approval carries its evidence.')}</p>
            </div>
            <p className="self-end text-[16px] leading-7 text-white/70">
              {t('The request, the quotes behind each indicator, the comparison with your reference, the verification call and the reviewer’s rationale — kept together as one Decision Passport you can print or show an auditor.')}
            </p>
          </div>
        </div>
      </section>

      {/* 02 — example (dark) */}
      <section id="example" className="panel-dark scroll-mt-6" aria-labelledby="example-title">
        <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28">
          <Eyebrow label={t('Fictional example — illustrative only')} index={idx(2)} tone="light" />
          <h2 id="example-title" className="t-headline mt-8 max-w-4xl text-white">
            {t('Open a case.')} <span className="text-brand-400">{t('See every claim traced to its source.')}</span>
          </h2>
          <p className="mt-6 max-w-3xl text-[18px] leading-7 text-white/70">
            {t('This is how Bayyinah lays out a case as a Decision Passport. Each finding links to an exact quote, a reference comparison, a recorded verification or a named business rule. There is no fraud score.')}
          </p>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div>
              <p className="t-eyebrow !text-white/45">{t('What the request says')}</p>
              <div className="mt-4 border border-white/10 bg-[#0d0d0f]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <span className="font-mono text-[12px] text-signal-green">$ {t(REQUEST_TYPE_LABELS[example.requestType])} · <bdi>{example.supplier.name}</bdi></span>
                  <Ltr mono className="text-[12px] text-white/50">{example.caseNumber}</Ltr>
                </div>
                <div className="ltr whitespace-pre-wrap p-4 font-mono text-[12.5px] leading-6 text-white/80" dir="ltr">
                  <HighlightedText text={example.source} marks={example.findings.filter((f) => f.quote).map((f) => ({ id: f.id, quote: f.quote!, tone: toneFor(f.severity) }))} />
                </div>
              </div>
            </div>
            <div>
              <p className="t-eyebrow !text-white/45">{t('What the Decision Passport records')}</p>
              <ol className="mt-4 space-y-px">
                {passport.map((s, i) => (
                  <li key={s.k} className={cx('flex gap-4 border-s-[3px] bg-[#0d0d0f] px-5 py-4', BAR[i])}>
                    <span className="ltr mt-0.5 shrink-0 font-mono text-[11.5px] text-white/45" dir="ltr">{s.k}</span>
                    <div>
                      <h3 className="text-[16px] font-semibold text-white">{s.t}</h3>
                      <p className="mt-1 text-[14px] leading-6 text-white/65">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* 03 — AI under control */}
      <section id="ai" className="scroll-mt-6" aria-labelledby="ai-title">
        <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28">
          <Eyebrow label={t('Rules of engagement')} index={idx(3)} />
          <h2 id="ai-title" className="t-headline mt-8 max-w-4xl">
            {t('Fully assisted.')} <span className="text-brand-600">{t('Entirely under your control.')}</span>
          </h2>
          <p className="t-lead mt-6 max-w-3xl">{t('Preparers build cases, reviewers decide, administrators keep supplier references honest. Each person signs in with their own account; the company is never a shared login.')}</p>
          <div className="mt-12 grid border-t-[3px] border-brand-600 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { h: t('Reads and quotes'), d: t('Extracts amount, beneficiary, account and sender, and quotes the exact words behind every indicator. Unsupported quotes are discarded.') },
              { h: t('Flags, never judges'), d: t('Urgency, secrecy, requests to bypass procedure and new contact details are reasons to check — never a verdict, never a fraud score.') },
              { h: t('Bounded agent'), d: t('Seven allow-listed tools. It prepares the case and creates the verification task — it cannot approve, close, contact anyone or edit supplier details.') },
              { h: t('Full audit trail'), d: t('Every analysis, correction, tool call, verification and decision is recorded with who, when and on which evidence version.') },
            ].map((x, i) => (
              <div key={x.h} className={cx('p-6', i > 0 && 'border-t border-line sm:border-t-0', i % 2 === 1 && 'sm:border-s sm:border-line', i >= 2 && 'lg:border-s lg:border-line', i === 2 && 'sm:border-t lg:border-t-0')}>
                <h3 className="text-[17px] font-semibold">{x.h}</h3>
                <p className="mt-3 text-[14.5px] leading-6 text-ink-muted">{x.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 border-s-[3px] border-signal-green ps-6">
            <p className="t-eyebrow">{t('Not ready to use live data')}</p>
            <p className="mt-3 max-w-3xl text-[16px] leading-7 text-ink-muted">
              {t('Run the whole workflow in Demo Mode first — fictional companies, simulated AI, three roles to switch between. Nothing you do there touches a real organization.')}{' '}
              <Link href="/demo" className="link">{t('Open Demo Mode')}</Link>
            </p>
          </div>
        </div>
      </section>

      {/* 04 — workflow */}
      <section id="workflow" className="panel-mist scroll-mt-6" aria-labelledby="workflow-title">
        <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28">
          <Eyebrow label={t('How it works')} index={idx(4)} />
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="workflow-title" className="t-headline max-w-4xl">
                {t('Three steps.')} <span className="text-brand-600">{t('One clear next action at a time.')}</span>
              </h2>
              <p className="t-lead mt-6 max-w-2xl">{t('The workflow is the product. Each step unlocks only when the one before it is complete, and each is done by a person with the right role.')}</p>
            </div>
            <LinkButton href={liveHref('/signup')} arrow className="self-start md:self-auto">
              {t('Start a live case')}
            </LinkButton>
          </div>
          <div className="mt-12 space-y-3">
            {WORKFLOW.map((w, i) => (
              <div key={w.n} className={cx('grid gap-6 border border-line border-s-[3px] bg-white p-6 md:grid-cols-[minmax(0,300px)_1fr] md:p-8', BAR_S[i])}>
                <div className="flex gap-4">
                  <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-semibold text-white', ['bg-signal-green', 'bg-signal-blue', 'bg-brand-600'][i])}>{i + 1}</span>
                  <div>
                    <h3 className="text-[24px] font-semibold uppercase tracking-[-0.01em]">{w.title}</h3>
                    <p className="mt-1 max-w-[16rem] text-[15px] text-ink-muted">{w.lead}</p>
                  </div>
                </div>
                <ul className="grid gap-x-8 sm:grid-cols-2">
                  {w.items.map((it) => (
                    <li key={it.t}>
                      <Link href={`/demo?persona=${w.persona}`} className="group flex items-start justify-between gap-4 border-b border-line py-4 hover:border-ink/30">
                        <span>
                          <span className="block text-[16px] font-semibold">{it.t}</span>
                          <span className="block font-mono text-[12.5px] text-ink-muted">{it.d}</span>
                        </span>
                        <ArrowUpRight className={cx('mt-1 h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-brand-600', flipRtl)} aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 05 — scenarios */}
      <section className="py-20 md:py-28" aria-labelledby="scenarios-title">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <Eyebrow label={t('Inside the product')} index={idx(5)} />
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="scenarios-title" className="t-headline max-w-4xl">
                {t('Five scenarios.')} <span className="text-brand-600">{t('Patterns every finance team meets.')}</span>
              </h2>
              <p className="t-lead mt-6 max-w-2xl">{t('Walk through each one in Demo Mode as a preparer, a reviewer or an administrator. All companies, people and accounts are fictional.')}</p>
            </div>
            <LinkButton href="/demo" variant="secondary" size="lg" className="self-start md:self-auto">
              {t('Open Demo Mode')}
            </LinkButton>
          </div>
        </div>
        <div className="mt-12 flex snap-x scroll-px-5 gap-4 overflow-x-auto px-5 pb-6 md:px-8 xl:px-[max(2rem,calc((100vw-1240px)/2+2rem))]">
          {DEMO_SCENARIOS.map((s, i) => (
            <Link key={s.id} href={`/demo?scenario=${s.id}`} className="group w-[300px] shrink-0 snap-start border border-line bg-white transition-colors hover:border-ink/40">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="ltr font-mono text-[12px] text-ink-muted" dir="ltr">[ {String(i + 1).padStart(2, '0')} ]</span>
                <span className="t-eyebrow">{t(REQUEST_TYPE_LABELS[s.requestType])}</span>
              </div>
              <div className="bg-mist px-4 py-4">
                <Ltr mono className="text-[11px] text-ink-muted">{s.caseNumber}</Ltr>
                <p className="text-[13px] font-semibold" dir="auto">{s.supplier.name}</p>
                <div className="mt-2.5 space-y-1.5">
                  {s.findings.slice(0, 3).map((f) => (
                    <div key={f.id} className="flex items-center gap-1.5">
                      <SeverityBadge severity={f.severity} />
                      <span className="truncate text-[11.5px] text-ink-soft">{f.label.startsWith('R-') ? t('Business rule') : t(f.label)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-4 py-4">
                <h3 className="text-[18px] font-semibold group-hover:text-brand-700">{t(s.title)}</h3>
                <p className="mt-1 text-[14px] leading-6 text-ink-muted">{t(s.tagline)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 06 — request types */}
      <section id="types" className="panel-mist scroll-mt-6" aria-labelledby="types-title">
        <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28">
          <Eyebrow label={t('Request types')} index={idx(6)} />
          <h2 id="types-title" className="t-headline mt-8 max-w-4xl">
            {t('Three request types.')} <span className="text-brand-600">{t('Each with its own rules.')}</span>
          </h2>
          <div className="mt-12 grid gap-px border border-line bg-line md:grid-cols-3">
            {[
              { icon: FileText, t: t('Invoice payment'), d: t('Compares the invoice with the supplier reference. Verification is required as soon as the account, beneficiary, amount or sender differs, or the wording asks to bypass procedure.'), tag: t('Rules: account · name · domain · amount') },
              { icon: Landmark, t: t('Bank account change'), d: t('Always requires a recorded independent verification through a reference channel and a reviewer who is not the case creator. The AI cannot waive either.'), tag: t('Always verified · separate reviewer') },
              { icon: UserPlus, t: t('New beneficiary'), d: t('Treated like an account change: the new details must be confirmed through an established channel, and the name must match — or the difference explained.'), tag: t('Always verified · name must match') },
            ].map((x) => (
              <div key={x.t} className="flex flex-col bg-white p-7">
                <x.icon className="h-6 w-6 text-brand-600" aria-hidden />
                <h3 className="mt-5 text-[20px] font-semibold uppercase tracking-[-0.01em]">{x.t}</h3>
                <p className="mt-2 flex-1 text-[15px] leading-7 text-ink-muted">{x.d}</p>
                <p className="t-eyebrow mt-6 border-t border-line pt-4">{x.tag}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 07 — FAQ */}
      <section id="faq" className="scroll-mt-6" aria-labelledby="faq-title">
        <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28">
          <Eyebrow label={t('Straight answers')} index={idx(7)} />
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <h2 id="faq-title" className="t-headline">
                {t('Plain questions.')} <span className="text-brand-600">{t('Honest limits.')}</span>
              </h2>
              <p className="t-lead mt-5">{t('Something else on your mind? Write to us from the contact block below.')}</p>
            </div>
            <div className="border-t border-ink">
              {FAQ.map((f) => (
                <details key={f.q} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-line-strong font-mono text-ink-muted transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-6 text-[15px] leading-7 text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

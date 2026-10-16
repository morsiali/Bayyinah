'use client';

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { StatusBadge, buttonClass, cx } from '@/components/ui';
import { useI18n } from '@/components/i18n';
import { STATUS_LABELS, type CaseStatus } from '@/lib/constants';
import { EDGES, LANES, SCENARIOS, STATUS_FLOW, STEPS, ZONES, laneIndex, statusesAlong, stepById, type Edge, type LaneId, type Step } from '@/lib/workflow';
import { liveHref } from '@/lib/site';

const PLAY_MS = 2600;
const ekey = (e: { from: string; to: string }) => `${e.from}>${e.to}`;
const stepNo = (id: string) => STEPS.findIndex((s) => s.id === id) + 1;
const laneOf = (id: LaneId) => LANES[laneIndex(id)];

type Geo = { d: string; lx: number; ly: number };

export function WorkflowMap() {
  const { t, locale } = useI18n();
  const rtl = locale === 'ar';
  const [scenarioId, setScenarioId] = useState('all');
  const [pos, setPos] = useState(0);
  const [lane, setLane] = useState<LaneId | 'all'>('all');
  const [playing, setPlaying] = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const stops = scenario.stops;
  const stop = stops[Math.min(pos, stops.length - 1)];
  const step = stepById(stop.id);
  const statuses = useMemo(() => statusesAlong(stops), [stops]);
  const status = statuses[Math.min(pos, stops.length - 1)];
  const isPath = scenario.id !== 'all';
  const inPath = useMemo(() => new Set(stops.map((s) => s.id)), [stops]);
  const traversed = useMemo(() => {
    const set = new Set<string>();
    if (isPath) for (let i = 1; i <= pos; i++) set.add(ekey({ from: stops[i - 1].id, to: stops[i].id }));
    return set;
  }, [isPath, pos, stops]);
  const arriving = isPath && pos > 0 ? ekey({ from: stops[pos - 1].id, to: stops[pos].id }) : null;

  // Shareable state: ?scenario=…&step=…
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const sc = SCENARIOS.find((s) => s.id === q.get('scenario'));
    if (sc) setScenarioId(sc.id);
    const n = Number(q.get('step'));
    if (n >= 1 && n <= (sc ?? SCENARIOS[0]).stops.length) setPos(n - 1);
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    q.set('scenario', scenarioId);
    q.set('step', String(pos + 1));
    window.history.replaceState(null, '', `${window.location.pathname}?${q}`);
  }, [scenarioId, pos]);

  // Play walks the current scenario one stop at a time.
  useEffect(() => {
    if (!playing) return;
    if (pos >= stops.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setPos((p) => p + 1), PLAY_MS);
    return () => clearTimeout(id);
  }, [playing, pos, stops.length]);

  const go = useCallback((n: number) => setPos(Math.max(0, Math.min(stops.length - 1, n))), [stops.length]);
  const pickScenario = (id: string) => {
    setScenarioId(id);
    setPos(0);
    setPlaying(id !== 'all');
  };
  const pickStep = (id: string) => {
    setPlaying(false);
    if (inPath.has(id)) {
      const after = stops.findIndex((s, i) => i > pos && s.id === id);
      go(after >= 0 ? after : stops.findIndex((s) => s.id === id));
    } else {
      setScenarioId('all');
      setPos(SCENARIOS[0].stops.findIndex((s) => s.id === id));
    }
  };
  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (pos >= stops.length - 1) setPos(0);
    setPlaying(true);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input,textarea,select')) return;
    const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) (setPlaying(false), go(pos + 1), e.preventDefault());
    else if (e.key === back) (setPlaying(false), go(pos - 1), e.preventDefault());
  };

  const outgoing = EDGES.filter((e) => e.from === step.id);
  const demoHref = `/demo?${new URLSearchParams({ ...(scenario.demo ? { scenario: scenario.demo } : {}), persona: step.demoPersona })}`;

  return (
    <div onKeyDown={onKey} data-testid="workflow">
      {/* Legend */}
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium text-ink-soft">
        {LANES.map((l) => (
          <li key={l.id} className="flex items-center gap-2">
            <span className={cx('h-2.5 w-2.5 rounded-full', l.dot)} aria-hidden />
            {t(l.role)}
          </li>
        ))}
      </ul>

      {/* Controls */}
      <div className="sticky top-0 z-20 -mx-5 mt-8 border-b border-line bg-white/95 px-5 pb-0 pt-4 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('Filter by role')}>
            <button type="button" aria-pressed={lane === 'all'} onClick={() => setLane('all')} className={cx('h-9 border px-3.5 text-[13px] font-semibold', lane === 'all' ? 'border-navy bg-navy text-white' : 'border-line-strong bg-white text-ink-soft hover:border-ink')}>
              {t('All roles')}
            </button>
            {LANES.map((l) => (
              <button key={l.id} type="button" aria-pressed={lane === l.id} onClick={() => setLane(lane === l.id ? 'all' : l.id)} className={cx('flex h-9 items-center gap-2 border px-3.5 text-[13px] font-semibold', lane === l.id ? 'border-navy bg-navy text-white' : 'border-line-strong bg-white text-ink-soft hover:border-ink')}>
                <span className={cx('h-2 w-2 rounded-full', l.dot)} aria-hidden />
                {t(l.name)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => (setPlaying(false), go(pos - 1))} disabled={pos === 0} aria-label={t('Previous step')} className="flex h-9 w-9 items-center justify-center border border-line-strong bg-white hover:border-ink disabled:opacity-40">
              <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            </button>
            <button type="button" onClick={togglePlay} aria-label={playing ? t('Pause') : t('Play')} data-testid="workflow-play" className="flex h-9 w-9 items-center justify-center bg-navy text-white hover:bg-navy-700">
              {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4 rtl:-scale-x-100" aria-hidden />}
            </button>
            <button type="button" onClick={() => (setPlaying(false), go(pos + 1))} disabled={pos >= stops.length - 1} aria-label={t('Next step')} className="flex h-9 w-9 items-center justify-center border border-line-strong bg-white hover:border-ink disabled:opacity-40">
              <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            </button>
            <span className="ms-2 min-w-[96px] font-mono text-[12.5px] text-ink-muted" aria-live="polite" data-testid="workflow-counter">
              {t('Step {a} of {b}', { a: pos + 1, b: stops.length })}
            </span>
          </div>
        </div>

        {/* Scenarios */}
        <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-3" role="group" aria-label={t('Walk a scenario')}>
          <span className="t-eyebrow shrink-0">{t('Scenario')}</span>
          {SCENARIOS.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === scenarioId} onClick={() => pickScenario(s.id)} className={cx('shrink-0 whitespace-nowrap border-b-2 px-1 py-1 text-[13px] font-semibold', s.id === scenarioId ? 'border-brand-600 text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
              {t(s.name)}
            </button>
          ))}
        </div>
        <div className="h-[3px] bg-line" aria-hidden>
          <div className="h-full bg-brand-600 transition-[width] duration-500" style={{ width: `${((pos + 1) / stops.length) * 100}%` }} />
        </div>
      </div>

      <p className="mt-5 max-w-3xl text-[15px] leading-6 text-ink-muted">
        {t(scenario.summary)}
        {scenario.demo && (
          <>
            {' '}
            <Link href={`/demo?scenario=${scenario.demo}`} className="link">{t('Try this scenario in Demo Mode')}</Link>
          </>
        )}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_370px]">
        {/* Swimlane map (large screens) */}
        <Lanes stepId={step.id} lane={lane} isPath={isPath} inPath={inPath} traversed={traversed} arriving={arriving} rtl={rtl} onPick={pickStep} />

        {/* Ordered list (small screens) */}
        <ol className="space-y-2 lg:hidden" aria-label={t('Steps')}>
          {stops.map((s, i) => {
            const st = stepById(s.id);
            const l = laneOf(st.lane);
            const current = i === pos;
            if (lane !== 'all' && st.lane !== lane) return null;
            return (
              <li key={`${s.id}-${i}`}>
                <button type="button" onClick={() => (setPlaying(false), go(i))} aria-current={current ? 'step' : undefined} className={cx('flex w-full items-center gap-3 border border-s-[3px] bg-white px-3 py-2.5 text-start', l.color, current ? 'border-brand-600' : 'border-line')}>
                  <span className="font-mono text-[11px] text-ink-muted" dir="ltr">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{t(st.title)}</span>
                    <span className="block text-[12px] text-ink-muted">{t(l.name)} · {t(st.sub)}</span>
                  </span>
                </button>
                {current && (
                  <div className="border border-t-0 border-line bg-white p-4">
                    <Detail step={st} note={s.note} status={status} outgoing={outgoing} demoHref={demoHref} onPick={pickStep} onPrev={() => go(pos - 1)} onNext={() => go(pos + 1)} first={pos === 0} last={pos >= stops.length - 1} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {/* Detail panel (large screens) */}
        <aside className="hidden lg:block" aria-label={t('Step details')}>
          <div className="float-panel sticky top-36 p-6" data-testid="workflow-detail">
            <Detail step={step} note={stop.note} status={status} outgoing={outgoing} demoHref={demoHref} onPick={pickStep} onPrev={() => (setPlaying(false), go(pos - 1))} onNext={() => (setPlaying(false), go(pos + 1))} first={pos === 0} last={pos >= stops.length - 1} />
          </div>
        </aside>
      </div>

      <StatusMap status={status} />
    </div>
  );
}

function Detail({ step, note, status, outgoing, demoHref, onPick, onPrev, onNext, first, last }: { step: Step; note?: string; status?: CaseStatus; outgoing: Edge[]; demoHref: string; onPick: (id: string) => void; onPrev: () => void; onNext: () => void; first: boolean; last: boolean }) {
  const { t } = useI18n();
  const l = laneOf(step.lane);
  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full bg-mist px-2.5 py-1 text-[12px] font-semibold">
        <span className={cx('h-2 w-2 rounded-full', l.dot)} aria-hidden />
        {t(l.name)} · {t('Step {n}', { n: stepNo(step.id) })}
      </span>
      <h2 className="mt-3 text-[24px] font-semibold leading-tight tracking-[-0.01em]" data-testid="workflow-title">{t(step.title)}</h2>
      <p className="mt-3 text-[15px] leading-6 text-ink-muted">{t(step.description)}</p>
      {note && (
        <p className="mt-4 border-s-[3px] border-brand-600 bg-brand-50/60 px-3 py-2 text-[14px] leading-6">
          <span className="t-eyebrow block !text-brand-700">{t('In this scenario')}</span>
          {t(note)}
        </p>
      )}
      <dl className="mt-4 space-y-2.5">
        <div className="bg-mist px-3.5 py-3">
          <dt className="t-eyebrow">{t('Screen')}</dt>
          <dd className="mt-1 text-[14px] font-semibold">{t(step.screen)}</dd>
        </div>
        <div className="bg-mist px-3.5 py-3">
          <dt className="t-eyebrow">{t('Result')}</dt>
          <dd className="mt-1 text-[14px] font-semibold">{t(step.result)}</dd>
        </div>
        {status && (
          <div className="bg-mist px-3.5 py-3">
            <dt className="t-eyebrow">{t('Case status')}</dt>
            <dd className="mt-1.5"><StatusBadge status={status} /></dd>
          </div>
        )}
      </dl>
      {outgoing.length > 0 && (
        <div className="mt-4">
          <p className="t-eyebrow">{t('What can happen next')}</p>
          <ul className="mt-2 space-y-1.5">
            {outgoing.map((e) => (
              <li key={ekey(e)}>
                <button type="button" onClick={() => onPick(e.to)} className="group flex w-full items-start gap-2 text-start text-[13.5px] hover:text-brand-700">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint group-hover:text-brand-600 rtl:-scale-x-100" aria-hidden />
                  <span>
                    {e.label ? <span className="text-ink-muted">{t(e.label)}: </span> : null}
                    <span className="font-semibold">{t(stepById(e.to).title)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={demoHref} className={buttonClass('primary', 'md')}>
          {t('Try it in Demo Mode')}
          <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
        </Link>
        <Link href={liveHref(step.liveRoute)} className={buttonClass('secondary', 'md')}>
          {t('Open the live screen')}
        </Link>
      </div>
      <div className="mt-5 flex justify-between gap-2 border-t border-dashed border-line pt-4">
        <button type="button" onClick={onPrev} disabled={first} className={buttonClass('secondary', 'sm', 'disabled:opacity-40')}>
          <ChevronLeft className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden /> {t('Previous step')}
        </button>
        <button type="button" onClick={onNext} disabled={last} className={buttonClass('secondary', 'sm', 'disabled:opacity-40')}>
          {t('Next step')} <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Four swimlanes, one step per row, connectors drawn from measured positions. */
function Lanes({ stepId, lane, isPath, inPath, traversed, arriving, rtl, onPick }: { stepId: string; lane: LaneId | 'all'; isPath: boolean; inPath: Set<string>; traversed: Set<string>; arriving: string | null; rtl: boolean; onPick: (id: string) => void }) {
  const { t } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const [geo, setGeo] = useState<Record<string, Geo>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Rows: a separator for each zone, then one row per step.
  const rows = useMemo(() => {
    const out: ({ kind: 'zone'; label: string } | { kind: 'step'; step: Step })[] = [];
    for (const z of ZONES) {
      out.push({ kind: 'zone', label: z.label });
      for (const s of STEPS.filter((x) => x.zone === z.id)) out.push({ kind: 'step', step: s });
    }
    return out;
  }, []);

  const measure = useCallback(() => {
    const box = boxRef.current;
    if (!box || box.offsetParent === null) return;
    const b = box.getBoundingClientRect();
    const rect = (id: string) => {
      const r = nodes.current.get(id)!.getBoundingClientRect();
      return { l: r.left - b.left, r: r.right - b.left, t: r.top - b.top, b: r.bottom - b.top, cx: (r.left + r.right) / 2 - b.left, cy: (r.top + r.bottom) / 2 - b.top };
    };
    const out: Record<string, Geo> = {};
    let loop = 0;
    for (const e of EDGES) {
      const s = rect(e.from);
      const g = rect(e.to);
      if (g.t > s.b) {
        const y1 = s.b + 12;
        const d = Math.abs(s.cx - g.cx) < 2 ? `M${s.cx},${s.b} V${g.t}` : `M${s.cx},${s.b} V${y1} H${g.cx} V${g.t}`;
        out[ekey(e)] = { d, lx: g.cx, ly: Math.max(y1 + 6, g.t - 26) };
      } else {
        // Loops back up the map run in the outer gutter of the leftmost (rightmost in Arabic) box.
        const off = 14 + 7 * loop++;
        const gx = rtl ? Math.max(s.r, g.r) + off : Math.min(s.l, g.l) - off;
        const sx = rtl ? s.r : s.l;
        const tx = rtl ? g.r : g.l;
        out[ekey(e)] = { d: `M${sx},${s.cy} H${gx} V${g.cy} H${tx}`, lx: gx, ly: (s.cy + g.cy) / 2 };
      }
    }
    setGeo(out);
    setSize({ w: b.width, h: b.height });
  }, [rtl]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const dim = (s: Step) => (lane !== 'all' && s.lane !== lane) || (isPath && !inPath.has(s.id));
  const edgeState = (e: Edge) => {
    const k = ekey(e);
    if (k === arriving) return 'arriving';
    if (traversed.has(k)) return 'path';
    if (e.from === stepId || e.to === stepId) return 'near';
    return 'idle';
  };

  let row = 1;
  return (
    <div className="hidden lg:block">
      {/* Lane headers */}
      <div className="grid grid-cols-4 gap-x-3 px-12">
        {LANES.map((l) => (
          <div key={l.id} className={cx('flex items-center justify-center gap-2 border border-b-0 border-line bg-mist py-3 text-[14px] font-semibold', lane !== 'all' && lane !== l.id && 'opacity-40')}>
            <span className={cx('h-2.5 w-2.5 rounded-full', l.dot)} aria-hidden />
            {t(l.name)}
          </div>
        ))}
      </div>
      <div ref={boxRef} className="relative px-12 pb-6">
        {/* Lane backgrounds */}
        <div className="pointer-events-none absolute inset-y-0 inset-x-12 grid grid-cols-4 gap-x-3" aria-hidden>
          {LANES.map((l) => (
            <div key={l.id} className="border border-t-0 border-line bg-mist/50" />
          ))}
        </div>

        {/* Connectors */}
        <svg className="pointer-events-none absolute inset-0 z-10 overflow-visible" width={size.w} height={size.h} aria-hidden>
          <defs>
            {[['idle', '#c4c7cf'], ['near', '#0a0a14'], ['path', '#6d5aff']].map(([k, c]) => (
              <marker key={k} id={`wf-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,1 L9,5 L0,9 z" fill={c} />
              </marker>
            ))}
          </defs>
          {EDGES.map((e) => {
            const g = geo[ekey(e)];
            if (!g) return null;
            const st = edgeState(e);
            const color = st === 'idle' ? '#c4c7cf' : st === 'near' ? '#0a0a14' : '#6d5aff';
            const faded = lane !== 'all' && stepById(e.from).lane !== lane && stepById(e.to).lane !== lane;
            return (
              <path
                key={ekey(e)}
                d={g.d}
                fill="none"
                stroke={color}
                strokeWidth={st === 'idle' ? 1.25 : 2}
                strokeDasharray={st === 'arriving' ? '6 6' : e.kind === 'loop' ? '5 4' : undefined}
                className={cx(st === 'arriving' && 'wf-flow', faded && 'opacity-30')}
                markerEnd={`url(#wf-arrow-${st === 'arriving' ? 'path' : st})`}
                data-edge={ekey(e)}
                data-state={st}
              />
            );
          })}
        </svg>

        {/* Labels of the connectors around the selected step */}
        {EDGES.filter((e) => e.label && geo[ekey(e)] && edgeState(e) !== 'idle').map((e) => {
          const g = geo[ekey(e)];
          return (
            <span key={`l-${ekey(e)}`} className="pointer-events-none absolute z-20 max-w-[170px] -translate-x-1/2 border border-line bg-white px-1.5 py-0.5 text-center text-[11px] font-medium leading-4 text-ink-soft" style={{ left: g.lx, top: g.ly - 9 }}>
              {t(e.label!)}
            </span>
          );
        })}

        {/* Rows */}
        <div className="relative z-10 grid grid-cols-4 gap-x-3">
          {rows.map((r, i) => {
            const at = row++;
            if (r.kind === 'zone')
              return (
                <div key={`z-${i}`} className="relative col-span-4 flex items-center justify-center py-5" style={{ gridRow: at }}>
                  <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-line-strong" aria-hidden />
                  <span className="t-eyebrow relative bg-white px-3">{t(r.label)}</span>
                </div>
              );
            const s = r.step;
            const l = laneOf(s.lane);
            const current = s.id === stepId;
            return (
              <div key={s.id} className="px-2 py-3" style={{ gridRow: at, gridColumn: laneIndex(s.lane) + 1 }}>
                <button
                  type="button"
                  ref={(el) => {
                    if (el) nodes.current.set(s.id, el);
                  }}
                  onClick={() => onPick(s.id)}
                  aria-current={current ? 'step' : undefined}
                  data-step={s.id}
                  className={cx(
                    'relative w-full border bg-white px-3 py-3 text-center transition-[opacity,box-shadow,border-color]',
                    current ? 'border-brand-600 shadow-[0_0_0_4px_rgba(109,90,255,0.15)]' : 'border-line-strong hover:border-ink',
                    dim(s) && !current && 'opacity-35',
                  )}
                >
                  <span className={cx('absolute -top-2.5 -start-2.5 flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-semibold text-white', l.dot)}>{stepNo(s.id)}</span>
                  <span className="block text-[13.5px] font-semibold leading-5">{t(s.title)}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-4 text-ink-muted">{t(s.sub)}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The case status machine, with the status of the selected step highlighted. */
function StatusMap({ status }: { status?: CaseStatus }) {
  const { t } = useI18n();
  const order: CaseStatus[] = ['DRAFT', 'ANALYZED', 'INDEPENDENT_CHECK_REQUIRED', 'READY_FOR_REVIEW', 'NEEDS_INFORMATION', 'CLOSED_APPROVED', 'CLOSED_REJECTED', 'CLOSED_INCONCLUSIVE'];
  return (
    <section className="mt-16" aria-labelledby="status-map">
      <p className="t-eyebrow">/ {t('Case status')}</p>
      <h2 id="status-map" className="t-headline mt-4 text-[clamp(1.6rem,3vw,2.2rem)]">
        {t('Eight statuses.')} <span className="text-brand-600">{t('Every change has a cause.')}</span>
      </h2>
      <p className="t-lead mt-4 max-w-3xl">{t('A case only moves along these arrows, on the server, with an audit entry each time. Anything else is refused — even if two people act at once.')}</p>
      <ol className="mt-8 flex flex-wrap items-center gap-2" aria-label={t('Statuses')}>
        {order.map((s, i) => (
          <Fragment key={s}>
            <li className={cx('transition-transform', s === status && 'scale-110')} data-status={s} aria-current={s === status ? 'true' : undefined}>
              <StatusBadge status={s} className={cx(s === status && 'ring-2 ring-brand-600 ring-offset-2')} />
            </li>
            {i < 3 && <li aria-hidden className="text-ink-faint"><ChevronRight className="h-4 w-4 rtl:-scale-x-100" /></li>}
            {i === 3 && <li aria-hidden className="mx-2 h-5 w-px bg-line-strong" />}
          </Fragment>
        ))}
      </ol>
      <div className="mt-8 overflow-x-auto border border-line">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead className="bg-mist text-[12.5px] text-ink-muted">
            <tr>
              <th className="px-4 py-2.5 text-start font-semibold">{t('From')}</th>
              <th className="px-4 py-2.5 text-start font-semibold">{t('To')}</th>
              <th className="px-4 py-2.5 text-start font-semibold">{t('Who')}</th>
              <th className="px-4 py-2.5 text-start font-semibold">{t('Why')}</th>
            </tr>
          </thead>
          <tbody>
            {STATUS_FLOW.map((f, i) => {
              const hot = status && (f.to === status || f.from.includes(status));
              const l = laneOf(f.by);
              return (
                <tr key={i} className={cx('border-t border-line align-top', hot ? 'bg-brand-50/50' : '')}>
                  <td className="px-4 py-2.5">{f.from.map((s) => t(STATUS_LABELS[s])).join(t(', '))}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={f.to} /></td>
                  <td className="px-4 py-2.5"><span className="flex items-center gap-2 whitespace-nowrap"><span className={cx('h-2 w-2 rounded-full', l.dot)} aria-hidden />{t(l.name)}</span></td>
                  <td className="px-4 py-2.5 text-ink-muted">{t(f.trigger)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

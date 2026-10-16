import { describe, expect, it } from 'vitest';
import { EDGES, LANES, SCENARIOS, STATUS_FLOW, STEPS, statusesAlong, stepById } from '@/lib/workflow';
import { TRANSITIONS } from '@/lib/services/workflow';
import { CASE_STATUSES, type CaseStatus } from '@/lib/constants';

const ids = new Set(STEPS.map((s) => s.id));
const edge = (a: string, b: string) => EDGES.some((e) => e.from === a && e.to === b);

describe('Workflow map', () => {
  it('has unique steps in known lanes, and every connector joins real steps', () => {
    expect(ids.size).toBe(STEPS.length);
    for (const s of STEPS) expect(LANES.map((l) => l.id)).toContain(s.lane);
    for (const e of EDGES) {
      expect(ids.has(e.from), e.from).toBe(true);
      expect(ids.has(e.to), e.to).toBe(true);
    }
  });

  it('reaches every step from the first one, and every step except the last has a way on', () => {
    const seen = new Set(['A1']);
    const queue = ['A1'];
    while (queue.length) {
      const at = queue.shift();
      for (const e of EDGES.filter((x) => x.from === at)) if (!seen.has(e.to)) (seen.add(e.to), queue.push(e.to));
    }
    expect([...ids].filter((i) => !seen.has(i))).toEqual([]);
    const dead = STEPS.filter((s) => !EDGES.some((e) => e.from === s.id)).map((s) => s.id);
    expect(dead).toEqual(['F4']);
  });

  it('every scenario walks along existing connectors', () => {
    for (const sc of SCENARIOS.filter((s) => s.id !== 'all')) {
      for (let i = 1; i < sc.stops.length; i++) expect(edge(sc.stops[i - 1].id, sc.stops[i].id), `${sc.id}: ${sc.stops[i - 1].id} → ${sc.stops[i].id}`).toBe(true);
    }
  });

  it('every status change along a scenario is one the server allows', () => {
    for (const sc of SCENARIOS) {
      const st = statusesAlong(sc.stops);
      for (let i = 1; i < st.length; i++) {
        const [a, b] = [st[i - 1], st[i]];
        if (!a || !b || a === b) continue;
        expect(TRANSITIONS[a].includes(b), `${sc.id} at ${sc.stops[i].id}: ${a} → ${b}`).toBe(true);
      }
    }
  });

  it('scenarios end where their decision says', () => {
    const last = (id: string) => {
      const sc = SCENARIOS.find((s) => s.id === id)!;
      return statusesAlong(sc.stops).at(-1);
    };
    expect(last('account-change-denied')).toBe('CLOSED_REJECTED');
    expect(last('account-change-confirmed')).toBe('CLOSED_APPROVED');
    expect(last('returned')).toBe('CLOSED_APPROVED');
    // Bank account changes always pass through independent verification.
    for (const id of ['account-change-denied', 'account-change-confirmed', 'reference-changed']) expect(SCENARIOS.find((s) => s.id === id)!.stops.map((s) => s.id)).toContain('C7');
    // The reviewer's lane only ever follows a submission.
    for (const sc of SCENARIOS.filter((s) => s.id !== 'all')) sc.stops.forEach((s, i) => s.id === 'C10' && expect(sc.stops[i - 1].id).toBe('C9'));
  });

  it('the status table matches the server transitions exactly', () => {
    const listed = new Set(STATUS_FLOW.flatMap((f) => f.from.map((x) => `${x}>${f.to}`)));
    const server = new Set(CASE_STATUSES.flatMap((from) => TRANSITIONS[from as CaseStatus].filter((to) => to !== from).map((to) => `${from}>${to}`)));
    expect([...listed].sort()).toEqual([...server].sort());
  });

  it('demo links point at real Demo Mode scenarios', async () => {
    const { DEMO_SCENARIOS } = await import('@/lib/demo-data');
    for (const sc of SCENARIOS.filter((s) => s.demo)) expect(DEMO_SCENARIOS.map((d) => d.id)).toContain(sc.demo);
    expect(stepById('C7').demoPersona).toBe('preparer');
  });
});

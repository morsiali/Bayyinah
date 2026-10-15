import { Fragment } from 'react';
import { normalizeForQuote } from '@/lib/text';

export type Mark = { id: string; quote: string; tone?: 'warn' | 'review' | 'info' };

/**
 * Renders source text with exact evidence quotes highlighted where they occur.
 * Matching is done on the raw text first, then on a whitespace/case-insensitive scan, so the
 * highlight always points at real characters in the source.
 */
export function HighlightedText({ text, marks, activeId }: { text: string; marks: Mark[]; activeId?: string | null }) {
  const ranges: { start: number; end: number; mark: Mark }[] = [];
  for (const m of marks) {
    if (!m.quote) continue;
    let idx = text.indexOf(m.quote.trim());
    let len = m.quote.trim().length;
    if (idx < 0) {
      const r = fuzzyFind(text, m.quote);
      if (r) [idx, len] = r;
    }
    if (idx >= 0 && !ranges.some((r) => idx < r.end && idx + len > r.start)) ranges.push({ start: idx, end: idx + len, mark: m });
  }
  ranges.sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start > pos) out.push(<Fragment key={`t${pos}`}>{text.slice(pos, r.start)}</Fragment>);
    const cls = r.mark.id === activeId ? 'evidence evidence-active' : r.mark.tone === 'warn' ? 'evidence-warn' : r.mark.tone === 'review' ? 'evidence-review' : 'evidence';
    out.push(
      <mark key={`m${r.start}`} id={`ev-${r.mark.id}`} className={cls}>
        {text.slice(r.start, r.end)}
      </mark>,
    );
    pos = r.end;
  }
  if (pos < text.length) out.push(<Fragment key={`t${pos}`}>{text.slice(pos)}</Fragment>);
  return <>{out}</>;
}

/** Finds a quote in text ignoring case and whitespace differences; returns [index, length] in the original text. */
function fuzzyFind(text: string, quote: string): [number, number] | null {
  const q = normalizeForQuote(quote);
  if (q.length < 4) return null;
  const map: number[] = [];
  let norm = '';
  let lastSpace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (!lastSpace && norm.length) {
        norm += ' ';
        map.push(i);
      }
      lastSpace = true;
    } else {
      const n = normalizeForQuote(ch) || ch.toLowerCase();
      for (const c of n) {
        norm += c;
        map.push(i);
      }
      lastSpace = false;
    }
  }
  const at = norm.indexOf(q);
  if (at < 0) return null;
  const start = map[at];
  const end = map[Math.min(at + q.length - 1, map.length - 1)] + 1;
  return [start, end - start];
}

export const toneFor = (severity: string): Mark['tone'] => (severity === 'critical' || severity === 'warning' ? 'warn' : severity === 'review' ? 'review' : 'info');

// Documented normalization used for evidence-quote verification and name comparison.
// Quote check: Unicode NFKC → lower-case → unify quotes/dashes → strip Arabic diacritics & tatweel
// → collapse all whitespace to one space → trim. Nothing else (no stemming, no fuzzy matching).

export function normalizeForQuote(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‚‛′`´]/g, "'")
    .replace(/[“”„‟″«»]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function quoteIsInSource(quote: string, sources: string[]): number {
  const q = normalizeForQuote(quote);
  if (q.length < 4) return -1;
  return sources.findIndex((s) => normalizeForQuote(s).includes(q));
}

const COMPANY_SUFFIXES = /\b(l\.?\s?l\.?\s?c\.?|llc|fze|fzco|fz-llc|fz llc|co\.?|company|est\.?|establishment|trading|ltd\.?|limited|inc\.?|plc)\b/g;

/** Name comparison: case/punctuation/whitespace-insensitive; legal suffixes compared separately. */
export function normalizeName(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/[.,'"()&/\\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function namesEquivalent(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  const strip = (s: string) => s.replace(COMPANY_SUFFIXES, ' ').replace(/\s+/g, ' ').trim();
  return strip(na) === strip(nb) && strip(na).length > 0;
}

export const emailDomain = (e: string | null | undefined) => (e && e.includes('@') ? e.split('@').pop()!.trim().toLowerCase() : null);

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

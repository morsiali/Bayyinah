// Decimal-safe money handling: amounts are parsed into integer minor units (BigInt).
// No floating-point arithmetic is ever applied to monetary values.

const CURRENCY_ALIASES: Record<string, string> = {
  AED: 'AED', DHS: 'AED', DH: 'AED', 'DIRHAM': 'AED', 'DIRHAMS': 'AED', 'د.إ': 'AED', 'درهم': 'AED',
  USD: 'USD', '$': 'USD', US$: 'USD', EUR: 'EUR', '€': 'EUR', GBP: 'GBP', '£': 'GBP', SAR: 'SAR', QAR: 'QAR',
  OMR: 'OMR', KWD: 'KWD', BHD: 'BHD', INR: 'INR',
};
const THREE_DECIMAL = new Set(['OMR', 'KWD', 'BHD']);

export function normalizeCurrency(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const k = raw.trim().toUpperCase().replace(/\.$/, '');
  return CURRENCY_ALIASES[k] ?? CURRENCY_ALIASES[raw.trim()] ?? (/^[A-Z]{3}$/.test(k) ? k : null);
}

export const minorDigits = (currency?: string | null) => (currency && THREE_DECIMAL.has(currency) ? 3 : 2);

/**
 * Parses "45,000.50", "AED 45 000", "45.000,50" (EU style) into integer minor units.
 * Rules: if both "." and "," appear, the last one is the decimal separator. If only one kind
 * appears more than once, it is a thousands separator. A single separator followed by exactly
 * three digits is treated as a thousands separator (except "." for 3-decimal currencies).
 * Returns null when the text is not an unambiguous amount.
 */
export function parseAmountToMinor(raw: string | null | undefined, currency?: string | null): bigint | null {
  if (!raw) return null;
  let s = raw.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)); // Arabic-Indic digits
  s = s.replace(/[^\d.,-]/g, '');
  const negative = s.startsWith('-');
  s = s.replace(/^-/, '');
  if (!s || s.includes('-') || !/\d/.test(s)) return null;
  const digits = minorDigits(currency);
  let intPart = s;
  let frac = '';
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    const dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const i = s.lastIndexOf(dec);
    intPart = s.slice(0, i);
    frac = s.slice(i + 1);
  } else if (hasDot || hasComma) {
    const sep = hasDot ? '.' : ',';
    const parts = s.split(sep);
    if (parts.length === 2) {
      const after = parts[1];
      const thousands = after.length === 3 && !(sep === '.' && digits === 3);
      if (!thousands) {
        intPart = parts[0];
        frac = after;
      }
    }
  }
  intPart = intPart.replace(/[.,]/g, '');
  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(frac) || frac.length > digits) return null;
  const minor = BigInt(intPart) * 10n ** BigInt(digits) + BigInt((frac || '0').padEnd(digits, '0'));
  return negative ? -minor : minor;
}

export function formatMinor(minor: bigint, currency?: string | null): string {
  const digits = minorDigits(currency);
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;
  const base = 10n ** BigInt(digits);
  const int = (abs / base).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = (abs % base).toString().padStart(digits, '0');
  return `${neg ? '-' : ''}${currency ? currency + ' ' : ''}${int}.${frac}`;
}

// IBAN structure checks (ISO 13616 mod-97). A valid format never establishes ownership.

const COUNTRY_LENGTHS: Record<string, number> = {
  AE: 23, SA: 24, QA: 29, BH: 22, KW: 30, OM: 23, JO: 30, EG: 29, LB: 28, TR: 26,
  GB: 22, DE: 22, FR: 27, NL: 18, CH: 21, IT: 27, ES: 24, IE: 22, BE: 16, PK: 24,
};

export const compactIban = (v: string) => v.replace(/[\s-]/g, '').toUpperCase();

export function ibanProblem(raw: string): string | null {
  const iban = compactIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return 'does not have the structure of an IBAN';
  const expected = COUNTRY_LENGTHS[iban.slice(0, 2)];
  if (expected && iban.length !== expected) return `has ${iban.length} characters; ${iban.slice(0, 2)} IBANs have ${expected}`;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1 ? null : 'fails the IBAN checksum';
}

export const isValidIban = (raw: string) => ibanProblem(raw) === null;

/** Display helper: keep only the last 4 characters visible. */
export function maskAccount(v: string | null | undefined): string | null {
  if (!v) return null;
  const c = compactIban(v);
  if (c.length <= 4) return '••••';
  return `${c.slice(0, 2)}•• •••• ${c.slice(-4)}`;
}

import { describe, expect, it } from 'vitest';
import { runRules } from '@/lib/analysis/rules';
import { isValidIban, ibanProblem, maskAccount } from '@/lib/iban';
import { makeIban } from '@/lib/iban-gen';
import { parseAmountToMinor, formatMinor } from '@/lib/money';
import { namesEquivalent, normalizeForQuote } from '@/lib/text';

const ref = makeIban('AE', '0260001015333439101');
const supplier = { name: 'Gulf', expectedBeneficiaryName: 'Gulf Supplies Co. LLC', referenceIban: ref, recordedEmail: 'finance@gulfsupplies.example', recordedPhone: '+97145550202', usualCurrency: 'AED', reviewStatus: 'REVIEWED' };

describe('IBAN checks', () => {
  it('accepts valid IBANs and rejects bad checksums and lengths', () => {
    expect(isValidIban('AE07 0331 2345 6789 0123 456')).toBe(true);
    expect(isValidIban('GB82WEST12345698765432')).toBe(true);
    expect(ibanProblem('AE070331234567890123457')).toMatch(/checksum/);
    expect(ibanProblem('AE07033123456789012345')).toMatch(/characters/);
    expect(ibanProblem('hello')).toMatch(/structure/);
  });
  it('masks accounts to the last four characters', () => {
    expect(maskAccount(ref)).toBe(`AE•• •••• ${ref.slice(-4)}`);
  });
});

describe('Valid IBAN does not prove ownership', () => {
  it('says so explicitly', () => {
    const f = runRules({ requestType: 'INVOICE_PAYMENT', fields: { iban: ref, amount: '10', beneficiaryName: 'Gulf Supplies Co. LLC' }, supplier });
    const fmt = f.find((x) => x.ruleId === 'R-IBAN-FORMAT')!;
    expect(fmt.severity).toBe('info');
    expect(fmt.explanation).toMatch(/does not establish who owns/);
  });
});

describe('Matching data does not guarantee safety', () => {
  it('notes the match without calling it safe, and still requires verification for an account change', () => {
    const f = runRules({ requestType: 'BANK_ACCOUNT_CHANGE', fields: { iban: ref, beneficiaryName: 'Gulf Supplies Co LLC', senderEmail: 'a@gulfsupplies.example' }, supplier });
    expect(f.find((x) => x.ruleId === 'R-REFERENCE-MATCH')?.explanation).toMatch(/do not prove/);
    expect(f.some((x) => x.ruleId === 'R-INDEPENDENT-VERIFICATION' && x.severity === 'critical')).toBe(true);
    expect(JSON.stringify(f)).not.toMatch(/\bsafe\b|verified beneficiary/i);
  });
});

describe('Comparisons', () => {
  it('flags a different account on an invoice as significant', () => {
    const f = runRules({ requestType: 'INVOICE_PAYMENT', fields: { iban: makeIban('AE', '0337777777777777777'), amount: '1' }, supplier });
    expect(f.find((x) => x.ruleId === 'R-IBAN-COMPARE')?.severity).toBe('critical');
  });
  it('treats a different domain as a discrepancy, not fraud', () => {
    const f = runRules({ requestType: 'INVOICE_PAYMENT', fields: { senderEmail: 'x@other.example', amount: '1' }, supplier });
    const d = f.find((x) => x.ruleId === 'R-EMAIL-DOMAIN')!;
    expect(d.explanation).toMatch(/not proof of fraud/);
  });
  it('keeps missing data visibly missing', () => {
    const f = runRules({ requestType: 'NEW_BENEFICIARY', fields: {}, supplier });
    expect(f.find((x) => x.ruleId === 'R-REQUIRED-FIELDS')?.explanation).toMatch(/beneficiary name, IBAN or account number/);
  });
  it('compares amounts with exact decimals', () => {
    const same = runRules({ requestType: 'INVOICE_PAYMENT', fields: { amount: '18,750.00', currency: 'AED' }, supplier, expectedAmount: '18750', expectedCurrency: 'AED' });
    expect(same.some((x) => x.ruleId === 'R-AMOUNT')).toBe(false);
    const diff = runRules({ requestType: 'INVOICE_PAYMENT', fields: { amount: '18,750.01', currency: 'AED' }, supplier, expectedAmount: '18750', expectedCurrency: 'AED' });
    expect(diff.find((x) => x.ruleId === 'R-AMOUNT')?.category).toBe('amount_mismatch');
  });
  it('flags a missing reference channel', () => {
    const f = runRules({ requestType: 'BANK_ACCOUNT_CHANGE', fields: {}, supplier: { name: 'X' } });
    expect(f.some((x) => x.ruleId === 'R-REFERENCE-CHANNEL')).toBe(true);
  });
  it('ignores case, punctuation and legal suffixes in names', () => {
    expect(namesEquivalent('Gulf Supplies Co.', 'GULF SUPPLIES CO LLC')).toBe(true);
    expect(namesEquivalent('Emirates Technology Services', 'Emirates Tech Solutions FZ-LLC')).toBe(false);
  });
});

describe('Money', () => {
  it.each([
    ['45,000.00', 'AED', 4500000n],
    ['45 000', 'AED', 4500000n],
    ['45.000,50', 'EUR', 4500050n],
    ['1.500', 'OMR', 1500n],
    ['١٢٣', 'AED', 12300n],
  ])('parses %s %s', (raw, cur, minor) => {
    expect(parseAmountToMinor(raw, cur)).toBe(minor);
  });
  it('rejects ambiguous input and formats without floats', () => {
    expect(parseAmountToMinor('abc')).toBeNull();
    expect(parseAmountToMinor('1.2345', 'AED')).toBeNull();
    expect(formatMinor(123456789n, 'AED')).toBe('AED 1,234,567.89');
  });
});

describe('Quote normalization', () => {
  it('collapses whitespace, case, quotes and Arabic diacritics only', () => {
    expect(normalizeForQuote('  Keep THIS\n “confidential” ')).toBe('keep this "confidential"');
    expect(normalizeForQuote('عاجلٌ')).toBe('عاجل');
  });
});

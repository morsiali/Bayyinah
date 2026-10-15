// Deterministic business rules. Pure functions: no I/O, no model calls.
// Every finding names its rule so it can be traced to an explicit business rule.

import { isHighRisk, type ExtractedFields, type Severity } from '@/lib/constants';
import { compactIban, ibanProblem, maskAccount } from '@/lib/iban';
import { formatMinor, normalizeCurrency, parseAmountToMinor } from '@/lib/money';
import { emailDomain, namesEquivalent } from '@/lib/text';

export type SupplierSnapshot = {
  name: string;
  expectedBeneficiaryName?: string | null;
  referenceIban?: string | null;
  referenceBankAccount?: string | null;
  recordedEmail?: string | null;
  recordedPhone?: string | null;
  usualCurrency?: string | null;
  referenceSource?: string | null;
  reviewStatus?: string | null;
};

export type RuleFinding = {
  source: 'RULE';
  ruleId: string;
  category: string;
  severity: Severity;
  explanation: string;
  fieldName?: string;
  referenceValue?: string | null;
  submittedValue?: string | null;
};

export const RULE_DESCRIPTIONS: Record<string, string> = {
  'R-IBAN-FORMAT': 'Checks IBAN structure, country length and the ISO 13616 mod-97 checksum. A valid format never proves who owns the account.',
  'R-IBAN-COMPARE': 'Compares the submitted IBAN with the supplier reference after removing spaces and case differences.',
  'R-ACCOUNT-COMPARE': 'Compares the submitted account number with the supplier reference after normalization.',
  'R-NAME-COMPARE': 'Compares the beneficiary name with the expected name, ignoring case, punctuation and legal suffixes such as LLC.',
  'R-EMAIL-DOMAIN': 'Compares the sender email domain with the domain of the recorded supplier email. A different domain is a discrepancy, not proof of fraud.',
  'R-REQUIRED-FIELDS': 'Lists details that the request type requires but that were not found. Missing data is never treated as a positive signal.',
  'R-INDEPENDENT-VERIFICATION': 'Bank account changes and new beneficiaries always require a recorded independent verification and a reviewer other than the case creator.',
  'R-REFERENCE-CHANNEL': 'Checks whether the supplier reference holds a phone or email that can be used for independent verification.',
  'R-CURRENCY': 'Compares the requested currency with the supplier’s usual currency.',
  'R-AMOUNT': 'Compares the requested amount with the amount the preparer expected, using exact decimal arithmetic.',
  'R-TYPE-MISMATCH': 'Flags when the document appears to request something different from the case type.',
  'R-SUPPLIER-REFERENCE-REVIEW': 'Flags supplier references that have not yet been reviewed by the business.',
  'R-REFERENCE-MATCH': 'Notes when compared details match the reference. Matching details do not prove authenticity.',
};

export type RulesInput = {
  requestType: string;
  detectedRequestType?: string | null;
  fields: ExtractedFields;
  supplier: SupplierSnapshot;
  expectedAmount?: string | null;
  expectedCurrency?: string | null;
};

const norm = (v: string | null | undefined) => (v ?? '').replace(/[\s-]/g, '').toUpperCase();

export function runRules(input: RulesInput): RuleFinding[] {
  const out: RuleFinding[] = [];
  const f = input.fields ?? {};
  const s = input.supplier ?? ({ name: '' } as SupplierSnapshot);
  const highRisk = isHighRisk(input.requestType);
  const add = (r: Omit<RuleFinding, 'source'>) => out.push({ source: 'RULE', ...r });
  let compared = 0;
  let differed = 0;

  // R-IBAN-FORMAT
  if (f.iban) {
    const problem = ibanProblem(f.iban);
    if (problem) {
      add({ ruleId: 'R-IBAN-FORMAT', category: 'iban_format_invalid', severity: 'warning', fieldName: 'iban', submittedValue: f.iban, explanation: `The submitted IBAN ${problem}. Check the source for a typing error before any verification call.` });
    } else {
      add({ ruleId: 'R-IBAN-FORMAT', category: 'iban_format_valid', severity: 'info', fieldName: 'iban', explanation: 'The submitted IBAN has a valid format. A valid format does not establish who owns the account.' });
    }
  }

  // R-IBAN-COMPARE
  if (f.iban && s.referenceIban) {
    compared++;
    if (compactIban(f.iban) !== compactIban(s.referenceIban)) {
      differed++;
      add({
        ruleId: 'R-IBAN-COMPARE',
        category: 'iban_mismatch',
        severity: highRisk ? 'review' : 'critical',
        fieldName: 'iban',
        referenceValue: maskAccount(s.referenceIban),
        submittedValue: f.iban,
        explanation: highRisk
          ? 'The submitted account differs from the supplier reference. This is expected for a change request, and is exactly what independent verification must confirm.'
          : 'The submitted account differs from the supplier reference. An invoice should normally be paid to the reference account; independent verification is required.',
      });
    }
  } else if (f.iban && !s.referenceIban && !highRisk) {
    add({ ruleId: 'R-IBAN-COMPARE', category: 'no_reference_account', severity: 'review', fieldName: 'iban', explanation: 'The supplier reference has no IBAN to compare against. The submitted account cannot be compared.' });
  }

  // R-ACCOUNT-COMPARE
  if (f.accountNumber && s.referenceBankAccount) {
    compared++;
    if (norm(f.accountNumber) !== norm(s.referenceBankAccount)) {
      differed++;
      add({ ruleId: 'R-ACCOUNT-COMPARE', category: 'account_mismatch', severity: highRisk ? 'review' : 'critical', fieldName: 'accountNumber', referenceValue: maskAccount(s.referenceBankAccount), submittedValue: f.accountNumber, explanation: 'The submitted account number differs from the supplier reference.' });
    }
  }

  // R-NAME-COMPARE
  if (f.beneficiaryName && s.expectedBeneficiaryName) {
    compared++;
    if (!namesEquivalent(f.beneficiaryName, s.expectedBeneficiaryName)) {
      differed++;
      add({ ruleId: 'R-NAME-COMPARE', category: 'beneficiary_name_mismatch', severity: 'warning', fieldName: 'beneficiaryName', referenceValue: s.expectedBeneficiaryName, submittedValue: f.beneficiaryName, explanation: 'The beneficiary name differs from the expected beneficiary name in the supplier reference.' });
    }
  }

  // R-EMAIL-DOMAIN
  const sd = emailDomain(f.senderEmail);
  const rd = emailDomain(s.recordedEmail);
  if (sd && rd) {
    compared++;
    if (sd !== rd) {
      differed++;
      add({ ruleId: 'R-EMAIL-DOMAIN', category: 'email_domain_mismatch', severity: 'warning', fieldName: 'senderEmail', referenceValue: rd, submittedValue: sd, explanation: 'The sender email domain differs from the recorded supplier domain. A different domain is a discrepancy, not proof of fraud. Do not reply to this address to verify.' });
    }
  }

  // R-REQUIRED-FIELDS
  const missing: string[] = [];
  if (highRisk) {
    if (!f.beneficiaryName) missing.push('beneficiary name');
    if (!f.iban && !f.accountNumber) missing.push('IBAN or account number');
  } else {
    if (!f.amount) missing.push('amount');
    if (!f.beneficiaryName && !f.iban && !f.accountNumber) missing.push('beneficiary or account details');
  }
  if (missing.length) {
    add({ ruleId: 'R-REQUIRED-FIELDS', category: 'missing_required_field', severity: 'warning', fieldName: 'required', explanation: `Required information was not found in the source: ${missing.join(', ')}. It remains missing until a person adds evidence or corrects the extraction.` });
  }

  // R-INDEPENDENT-VERIFICATION
  if (highRisk) {
    add({ ruleId: 'R-INDEPENDENT-VERIFICATION', category: 'independent_check_required', severity: 'critical', fieldName: 'requestType', explanation: 'Independent verification is required. Contact the supplier through a channel from the supplier reference — never through contact details contained in this request — and record the outcome. A different person must review the case.' });
  }

  // R-REFERENCE-CHANNEL
  if (!s.recordedPhone && !s.recordedEmail) {
    add({ ruleId: 'R-REFERENCE-CHANNEL', category: 'no_reference_channel', severity: highRisk ? 'warning' : 'review', fieldName: 'referenceChannel', explanation: 'The supplier reference has no recorded phone or email, so there is no established channel for independent verification. An administrator must source one from an approved record.' });
  }

  // R-CURRENCY
  const cur = normalizeCurrency(f.currency);
  const usual = normalizeCurrency(s.usualCurrency);
  if (cur && usual && cur !== usual) {
    add({ ruleId: 'R-CURRENCY', category: 'currency_mismatch', severity: 'review', fieldName: 'currency', referenceValue: usual, submittedValue: cur, explanation: `The request is in ${cur}, while this supplier is usually paid in ${usual}.` });
  }

  // R-AMOUNT
  if (input.expectedAmount && f.amount) {
    const expCur = normalizeCurrency(input.expectedCurrency) ?? usual ?? cur;
    const a = parseAmountToMinor(f.amount, cur ?? expCur);
    const e = parseAmountToMinor(input.expectedAmount, expCur);
    if (a === null) {
      add({ ruleId: 'R-AMOUNT', category: 'amount_unparseable', severity: 'review', fieldName: 'amount', submittedValue: f.amount, explanation: 'The requested amount could not be read unambiguously. Correct the extracted amount before comparison.' });
    } else if (e !== null && (a !== e || (cur && expCur && cur !== expCur))) {
      add({ ruleId: 'R-AMOUNT', category: 'amount_mismatch', severity: 'warning', fieldName: 'amount', referenceValue: formatMinor(e, expCur), submittedValue: formatMinor(a, cur ?? expCur), explanation: 'The requested amount differs from the amount the preparer expected for this case.' });
    } else if (e !== null) {
      compared++;
    }
  }

  // R-TYPE-MISMATCH
  if (input.detectedRequestType && input.detectedRequestType !== 'UNKNOWN' && input.detectedRequestType !== input.requestType) {
    add({ ruleId: 'R-TYPE-MISMATCH', category: 'request_type_mismatch', severity: 'warning', fieldName: 'requestType', referenceValue: input.requestType, submittedValue: input.detectedRequestType, explanation: 'The document appears to request something different from this case type. Confirm the case type; bank detail changes must be handled as a bank account change case.' });
  }

  // R-SUPPLIER-REFERENCE-REVIEW
  if (s.reviewStatus && s.reviewStatus !== 'REVIEWED') {
    add({ ruleId: 'R-SUPPLIER-REFERENCE-REVIEW', category: 'reference_not_reviewed', severity: 'review', fieldName: 'supplier', explanation: 'The supplier reference used by this case has not yet been marked as reviewed by the business.' });
  }

  // R-REFERENCE-MATCH
  if (compared > 0 && differed === 0) {
    add({ ruleId: 'R-REFERENCE-MATCH', category: 'reference_match', severity: 'info', fieldName: 'reference', explanation: 'The compared details match the supplier reference. Matching details do not prove that the request is authentic.' });
  }

  return out;
}

// Shared, UI-independent vocabulary. Business rules import from here, never from components.

export const ROLES = ['ORG_ADMIN', 'PREPARER', 'REVIEWER'] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  ORG_ADMIN: 'Organization admin',
  PREPARER: 'Preparer',
  REVIEWER: 'Reviewer',
};

export const REQUEST_TYPES = ['INVOICE_PAYMENT', 'BANK_ACCOUNT_CHANGE', 'NEW_BENEFICIARY'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  INVOICE_PAYMENT: 'Invoice payment',
  BANK_ACCOUNT_CHANGE: 'Bank account change',
  NEW_BENEFICIARY: 'New beneficiary',
};
/** Request types that always require recorded independent verification + a separate reviewer. */
export const HIGH_RISK_TYPES: readonly RequestType[] = ['BANK_ACCOUNT_CHANGE', 'NEW_BENEFICIARY'];
export const isHighRisk = (t: string) => (HIGH_RISK_TYPES as readonly string[]).includes(t);

export const CASE_STATUSES = [
  'DRAFT',
  'ANALYZED',
  'NEEDS_INFORMATION',
  'INDEPENDENT_CHECK_REQUIRED',
  'READY_FOR_REVIEW',
  'CLOSED_APPROVED',
  'CLOSED_REJECTED',
  'CLOSED_INCONCLUSIVE',
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
export const STATUS_LABELS: Record<CaseStatus, string> = {
  DRAFT: 'Draft',
  ANALYZED: 'Analyzed',
  NEEDS_INFORMATION: 'Needs information',
  INDEPENDENT_CHECK_REQUIRED: 'Independent check required',
  READY_FOR_REVIEW: 'Ready for review',
  CLOSED_APPROVED: 'Closed · approved',
  CLOSED_REJECTED: 'Closed · rejected',
  CLOSED_INCONCLUSIVE: 'Closed · inconclusive',
};
export const isClosed = (s: string) => s.startsWith('CLOSED_');
/** States in which a preparer may add evidence, correct, analyze, run the agent and record verification. */
export const EDITABLE_STATUSES: readonly CaseStatus[] = ['DRAFT', 'ANALYZED', 'NEEDS_INFORMATION', 'INDEPENDENT_CHECK_REQUIRED'];
export const isEditable = (s: string) => (EDITABLE_STATUSES as readonly string[]).includes(s);

export const SEVERITIES = ['info', 'review', 'warning', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];
export const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, review: 2, info: 3 };
export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Significant',
  warning: 'Discrepancy',
  review: 'Review',
  info: 'Note',
};

export const AI_FINDING_CATEGORIES = [
  'urgency',
  'secrecy',
  'bypass_procedure',
  'contact_change',
  'beneficiary_mismatch',
  'amount_anomaly',
  'email_anomaly',
  'missing_information',
  'prompt_injection_attempt',
  'other',
] as const;
export type AiFindingCategory = (typeof AI_FINDING_CATEGORIES)[number];

export const VERIFICATION_OUTCOMES = ['CONFIRMED', 'NOT_CONFIRMED', 'INCONCLUSIVE', 'UNABLE_TO_COMPLETE'] as const;
export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];
export const OUTCOME_LABELS: Record<VerificationOutcome, string> = {
  CONFIRMED: 'Confirmed by supplier',
  NOT_CONFIRMED: 'Not confirmed',
  INCONCLUSIVE: 'Inconclusive',
  UNABLE_TO_COMPLETE: 'Unable to complete',
};

export const CHANNELS = ['REFERENCE_PHONE', 'REFERENCE_EMAIL', 'IN_PERSON', 'OTHER_ESTABLISHED'] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABELS: Record<Channel, string> = {
  REFERENCE_PHONE: 'Phone call to the reference number',
  REFERENCE_EMAIL: 'Email to the reference address',
  IN_PERSON: 'In person with a known contact',
  OTHER_ESTABLISHED: 'Other established channel',
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  CALL_REFERENCE_PHONE: 'Call supplier on the reference phone number',
  EMAIL_REFERENCE_ADDRESS: 'Email supplier at the reference address',
  CONFIRM_INVOICE_DETAILS: 'Confirm invoice details through a reference channel',
  ESTABLISH_INDEPENDENT_CHANNEL: 'Establish an independent contact channel',
};

export const DECISIONS = ['APPROVED', 'REJECTED', 'RETURNED', 'CLOSED_INCONCLUSIVE'] as const;
export type Decision = (typeof DECISIONS)[number];
export const DECISION_LABELS: Record<Decision, string> = {
  APPROVED: 'Approved within workflow',
  REJECTED: 'Rejected',
  RETURNED: 'Returned for information',
  CLOSED_INCONCLUSIVE: 'Closed as inconclusive',
};

export const EXTRACTED_FIELDS = ['amount', 'currency', 'beneficiaryName', 'iban', 'accountNumber', 'senderEmail', 'requestedPaymentDate', 'invoiceNumber'] as const;
export type ExtractedFieldKey = (typeof EXTRACTED_FIELDS)[number];
export type ExtractedFields = Partial<Record<ExtractedFieldKey, string | null>>;
export const FIELD_LABELS: Record<ExtractedFieldKey, string> = {
  amount: 'Amount',
  currency: 'Currency',
  beneficiaryName: 'Beneficiary name',
  iban: 'IBAN',
  accountNumber: 'Account number',
  senderEmail: 'Sender email',
  requestedPaymentDate: 'Requested payment date',
  invoiceNumber: 'Invoice number',
};
/** Corrections to these fields are material: they re-run comparison rules and supersede verification. */
export const MATERIAL_FIELDS: readonly ExtractedFieldKey[] = ['amount', 'currency', 'beneficiaryName', 'iban', 'accountNumber', 'senderEmail'];

export const DISCLAIMER =
  'Bayyinah supports verification and decision documentation. It does not execute payments, authorize bank transfers, prove account ownership or guarantee that a transaction is safe.';
export const REPORT_NOTICE =
  'This report records a verification workflow and human decision. It is not a safety certificate, proof of account ownership, or confirmation of payment execution.';

import { z } from 'zod';
import { AI_FINDING_CATEGORIES, EXTRACTED_FIELDS, SEVERITIES, type ExtractedFields, type RequestType } from '@/lib/constants';

export const ANALYSIS_SCHEMA_VERSION = '2.0';

const nullableText = (max: number) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v === null || v === undefined ? null : String(v).trim()))
    .transform((v) => (v && v.length > 0 && !/^(null|n\/a|none|unknown|-)$/i.test(v) ? v.slice(0, max) : null));

const fieldsShape = Object.fromEntries(EXTRACTED_FIELDS.map((k) => [k, nullableText(160).optional()])) as Record<
  (typeof EXTRACTED_FIELDS)[number],
  z.ZodOptional<ReturnType<typeof nullableText>>
>;

const requestTypeEnum = z
  .string()
  .transform((s) => s.trim().toUpperCase().replace(/[\s-]+/g, '_'))
  .pipe(z.enum(['INVOICE_PAYMENT', 'BANK_ACCOUNT_CHANGE', 'NEW_BENEFICIARY', 'UNKNOWN']));

/** Strict schema for every analyzer output (model or local). Unknown enum values are rejected. */
export const analysisOutputSchema = z.object({
  requestType: requestTypeEnum,
  summary: z.string().trim().min(1).max(800).transform((s) => s.slice(0, 600)),
  extractedFields: z.object(fieldsShape).strict(),
  findings: z
    .array(
      z.object({
        category: z.enum(AI_FINDING_CATEGORIES),
        severity: z.enum(SEVERITIES),
        explanation: z.string().trim().min(1).max(600),
        sourceId: z.union([z.string(), z.null()]).optional(),
        evidenceQuote: z.union([z.string().max(600), z.null()]).optional(),
      }),
    )
    .max(20),
  missingInformation: z.array(z.string().trim().min(1).max(200)).max(12),
  suggestedVerificationQuestions: z.array(z.string().trim().min(1).max(240)).max(10),
});

export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
export type AnalyzerFinding = AnalysisOutput['findings'][number];

export function cleanFields(f: AnalysisOutput['extractedFields']): ExtractedFields {
  const out: ExtractedFields = {};
  for (const k of EXTRACTED_FIELDS) out[k] = f[k] ?? null;
  return out;
}

export type DetectedType = RequestType | 'UNKNOWN';

/** JSON shape described to the model (kept in sync with analysisOutputSchema). */
export const MODEL_JSON_CONTRACT = `{
  "requestType": "invoice_payment" | "bank_account_change" | "new_beneficiary" | "unknown",
  "summary": string (max 600 chars, neutral, no conclusions about fraud),
  "extractedFields": {
    "amount": string|null, "currency": string|null, "beneficiaryName": string|null,
    "iban": string|null, "accountNumber": string|null, "senderEmail": string|null,
    "requestedPaymentDate": string|null, "invoiceNumber": string|null
  },
  "findings": [{
    "category": "urgency"|"secrecy"|"bypass_procedure"|"contact_change"|"beneficiary_mismatch"|"amount_anomaly"|"email_anomaly"|"missing_information"|"prompt_injection_attempt"|"other",
    "severity": "info"|"review"|"warning"|"critical",
    "explanation": string (max 500 chars),
    "sourceId": string|null (the id attribute of the <source> the quote comes from),
    "evidenceQuote": string|null (an EXACT, verbatim excerpt copied from that source)
  }],
  "missingInformation": string[],
  "suggestedVerificationQuestions": string[]
}`;

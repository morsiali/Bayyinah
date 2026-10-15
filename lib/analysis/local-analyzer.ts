// Bayyinah local language analyzer — deterministic pattern matching, no network.
// Used when no model provider is configured, and by the public "quick check" in the browser.
// It is labelled as provider "local" everywhere it appears; it is not presented as AI.
// Every quote it emits is a verbatim slice of the source, so it always passes citation checks.

import type { AnalysisOutput, AnalyzerFinding, DetectedType } from './schema';
import { compactIban } from '@/lib/iban';
import { normalizeCurrency } from '@/lib/money';
import { REQUEST_TYPE_LABELS, type ExtractedFields, type RequestType } from '@/lib/constants';

export const LOCAL_ANALYZER = { provider: 'local', model: 'bayyinah-rules-analyzer-2' } as const;

type Pattern = { category: AnalyzerFinding['category']; severity: AnalyzerFinding['severity']; re: RegExp; explain: string };

const PATTERNS: Pattern[] = [
  {
    category: 'prompt_injection_attempt',
    severity: 'critical',
    re: /(ignore (all |any |the )?(previous|prior|above|earlier) (instructions|rules|prompts?)|disregard (the |all |your |any )?(previous |prior )?(instructions|rules|system|policy)|system prompt|you are now (an?|the) |developer mode|(approve|authori[sz]e) (this|the) (payment|request|case|transfer) (automatically|without)|mark (this|the) (case|request|payment) as (approved|verified|safe)|تجاهل (جميع |كل )?التعليمات)/i,
    explain: 'The document contains text that tries to instruct the system. It was treated as data only and gained no authority. Embedded instructions are a strong reason for caution.',
  },
  {
    category: 'bypass_procedure',
    severity: 'warning',
    re: /(skip(ping)? (the )?(usual |normal |standard )?(verification|approval|checks?|call|process)|bypass(ing)? (the )?(usual |normal )?(verification|approval|process|checks?)|without (the )?(usual |normal |standard )?(verification|call(ing)?|approval|checks?)|no need to (call|verify|confirm|check)|(please )?(do not|don't) call|exception (to|from) (the |your )?(process|policy|procedure)|دون (ال)?تحقق|بدون (ال)?تحقق|لا داعي للاتصال)/i,
    explain: 'The request asks to skip or shortcut the normal verification procedure.',
  },
  {
    category: 'secrecy',
    severity: 'warning',
    re: /(strictly confidential|keep (this|it) (between us|quiet|private|confidential)|(do not|don't) (tell|share|discuss|inform|mention|copy)|discreet(ly)?|\bsecret\b|بسرية|سري للغاية|لا تخبر)/i,
    explain: 'The request asks for secrecy or limits who may know about it.',
  },
  {
    category: 'urgency',
    severity: 'review',
    re: /(\burgent(ly)?\b|\bimmediately\b|\basap\b|as soon as possible|right away|within (the )?(next )?(hour|\d+ ?(hours?|hrs?|minutes?))|time[- ]sensitive|before (end of (the )?day|eod|close of business|cob)|\bfinal notice\b|\btoday\b|عاجل|فوراً|فورا|في أسرع وقت|بأسرع وقت)/i,
    explain: 'The request uses urgency language. Pressure to act quickly is a common feature of payment-diversion attempts and is not a reason to shorten verification.',
  },
  {
    category: 'contact_change',
    severity: 'review',
    re: /(new (phone|mobile|telephone|contact) (number|details)|our (new|updated) (email|e-mail|address|number|contact)|(changed|updated) our (phone|email|e-mail|number|contact)|(contact|call|reach) (us|me) (only )?(at|on) (this|the following|our new)|رقم (هاتف )?جديد|بريد (إلكتروني )?جديد)/i,
    explain: 'The request introduces new contact details. Contact details supplied in a request are never an independent verification channel.',
  },
];

const ACCOUNT_CHANGE_RE = /(new (bank )?account|new iban|(receiving |bank |our )?(account|bank details|banking details|iban) (has|have) (been )?(changed|updated)|(changed|change|updated?) (of |to )?(our |the )?(bank|account|banking|payment) (details|account|information)|bank (details|account) (have|has) (changed|been updated)|(please )?(use|remit to|pay into|transfer to) (the |our )?(new|following|updated) (account|bank|iban)|حساب (بنكي )?جديد|تغيير (ال)?حساب|تحديث (ال)?بيانات (ال)?بنكية)/i;
const NEW_BENEFICIARY_RE = /(new (beneficiary|payee|vendor)|add (us |our company |a )?(as a )?(new )?(beneficiary|payee)|register (our|a|the|the following) (new )?(beneficiary|account)|following beneficiary|مستفيد جديد|إضافة مستفيد)/i;
const INVOICE_RE = /(\binvoice\b|\binv[-\s#]|\bamount due\b|\bpayment (of|for)\b|\btotal\b|فاتورة|المبلغ المستحق)/i;

const CURRENCY_TOKEN = '(AED|USD|EUR|GBP|SAR|QAR|OMR|KWD|BHD|Dhs?\\.?|dirhams?|درهم|\\$|€|£)';
const NUMBER_TOKEN = '([0-9\\u0660-\\u0669][0-9\\u0660-\\u0669,.\\s]*[0-9\\u0660-\\u0669]|[0-9\\u0660-\\u0669])';

function firstMatch(text: string, re: RegExp): RegExpExecArray | null {
  re.lastIndex = 0;
  return re.exec(text);
}

/** The sentence (or line) around an index, as an exact substring of the text, ≤ 240 chars. */
export function excerptAround(text: string, index: number, length: number): string {
  const boundary = /[.!?؟\n]/;
  let start = index;
  while (start > 0 && !boundary.test(text[start - 1]) && index - start < 160) start--;
  let end = index + length;
  while (end < text.length && !boundary.test(text[end]) && end - index < 200) end++;
  if (end < text.length && /[.!?؟]/.test(text[end])) end++;
  return text.slice(start, end).trim().slice(0, 240);
}

function clean(v: string | undefined | null, max = 120): string | null {
  if (!v) return null;
  const t = v.replace(/\s+/g, ' ').replace(/^[\s:;,\-–]+|[\s:;,.\-–]+$/g, '').trim();
  return t ? t.slice(0, max) : null;
}

export function extractFields(text: string): ExtractedFields {
  const fields: ExtractedFields = {};

  // IBAN — scan an upper-cased copy, then take the compact form.
  const ibanM = firstMatch(text.toUpperCase(), /\b([A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{2,4}){3,8})\b/);
  if (ibanM) fields.iban = compactIban(ibanM[1]);

  const accM = firstMatch(text, /(?:account\s*(?:no\.?|number|#)|a\/c(?:\s*no\.?)?|رقم الحساب)\s*[:\-]?\s*([0-9][0-9\s-]{5,24}[0-9])/i);
  if (accM) fields.accountNumber = accM[1].replace(/[\s-]/g, '');

  // Amount — prefer one introduced by an amount keyword.
  const amountKw = new RegExp(`(?:amount(?: due)?|total(?: due)?|sum of|payment of|balance(?: due)?|المبلغ)\\s*[:\\-]?\\s*(?:${CURRENCY_TOKEN}\\s?)?${NUMBER_TOKEN}(?:\\s?${CURRENCY_TOKEN})?`, 'i');
  const curFirst = new RegExp(`${CURRENCY_TOKEN}\\s?${NUMBER_TOKEN}`, 'i');
  const numFirst = new RegExp(`${NUMBER_TOKEN}\\s?${CURRENCY_TOKEN}`, 'i');
  let m = firstMatch(text, amountKw);
  if (m && (m[1] || m[3])) {
    fields.amount = clean(m[2], 40);
    fields.currency = normalizeCurrency(m[1] ?? m[3]);
  } else if ((m = firstMatch(text, curFirst))) {
    fields.amount = clean(m[2], 40);
    fields.currency = normalizeCurrency(m[1]);
  } else if ((m = firstMatch(text, numFirst))) {
    fields.amount = clean(m[1], 40);
    fields.currency = normalizeCurrency(m[2]);
  } else if (m === null) {
    const bare = firstMatch(text, new RegExp(`(?:amount(?: due)?|total(?: due)?|المبلغ)\\s*[:\\-]?\\s*${NUMBER_TOKEN}`, 'i'));
    if (bare) fields.amount = clean(bare[1], 40);
  }

  // Labels must be followed by ":" or "-" so prose such as "beneficiary for the project" is not mistaken for a name.
  const benM =
    firstMatch(text, /(?:beneficiary(?:\s+name)?|account\s+(?:name|holder)|payee(?:\s+name)?|اسم المستفيد|المستفيد)\s*[:\-–]\s*([^\n,;|]{3,90})/i) ??
    firstMatch(text, /(?:account name|in (?:the )?name of)\s+([^\n,;|]{3,90})/i);
  if (benM) {
    const raw = benM[1].split(/\s+(?:IBAN|iban|account|bank|swift|at|with)\b|\s{2,}|\.\s/)[0];
    fields.beneficiaryName = clean(raw, 90);
  }

  const fromM = firstMatch(text, /^\s*(?:from|sender|من)\s*:\s*[^\n]*?([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/im);
  const anyEmail = firstMatch(text, /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/);
  fields.senderEmail = (fromM?.[1] ?? anyEmail?.[1] ?? null)?.toLowerCase() ?? null;

  const invPrefixed = firstMatch(text, /\b(INV[-\/ ]?[A-Z0-9][A-Z0-9\-\/]{1,30})\b/i);
  const invKeyword = firstMatch(text, /(?:invoice|فاتورة)\s*(?:no\.?|number|#|ref\.?|رقم)?\s*[:\-#]?\s*([A-Z0-9][A-Z0-9\-\/]{2,30})/i);
  const inv = [invPrefixed?.[1], invKeyword?.[1]].find((v) => v && /\d/.test(v));
  if (inv) fields.invoiceNumber = inv.toUpperCase();

  const dateM = firstMatch(
    text,
    /(?:due(?: date)?|payment date|pay(?:ment)? by|by|before|on)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
  );
  if (dateM) fields.requestedPaymentDate = dateM[1];

  for (const k of ['amount', 'currency', 'beneficiaryName', 'iban', 'accountNumber', 'senderEmail', 'requestedPaymentDate', 'invoiceNumber'] as const) {
    if (fields[k] === undefined) fields[k] = null;
  }
  return fields;
}

export function detectRequestType(text: string): DetectedType {
  if (ACCOUNT_CHANGE_RE.test(text)) return 'BANK_ACCOUNT_CHANGE';
  if (NEW_BENEFICIARY_RE.test(text)) return 'NEW_BENEFICIARY';
  if (INVOICE_RE.test(text)) return 'INVOICE_PAYMENT';
  return 'UNKNOWN';
}

export type LocalSource = { id: string; text: string };

export function analyzeLocally(sources: LocalSource[], caseType?: RequestType): AnalysisOutput {
  const joined = sources.map((s) => s.text).join('\n\n');
  const fields = extractFields(joined);
  const detected = detectRequestType(joined);
  const type = (caseType ?? (detected === 'UNKNOWN' ? undefined : detected)) as RequestType | undefined;

  const findings: AnalyzerFinding[] = [];
  for (const p of PATTERNS) {
    for (const src of sources) {
      const m = firstMatch(src.text, new RegExp(p.re.source, p.re.flags));
      if (m) {
        findings.push({ category: p.category, severity: p.severity, explanation: p.explain, sourceId: src.id, evidenceQuote: excerptAround(src.text, m.index, m[0].length) });
        break;
      }
    }
  }

  const missing: string[] = [];
  const highRisk = type === 'BANK_ACCOUNT_CHANGE' || type === 'NEW_BENEFICIARY';
  if (!fields.beneficiaryName) missing.push('Beneficiary name');
  if (!fields.iban && !fields.accountNumber) missing.push('IBAN or account number');
  if (!highRisk && !fields.amount) missing.push('Amount');
  if (!highRisk && !fields.invoiceNumber) missing.push('Invoice number');
  if (!fields.senderEmail) missing.push('Sender email or origin of the request');
  for (const item of missing.filter((x) => x !== 'Invoice number')) {
    findings.push({ category: 'missing_information', severity: 'info', explanation: `${item} was not found in the source.`, sourceId: null, evidenceQuote: null });
  }

  const questions: string[] = [];
  if (highRisk) {
    questions.push('Using the phone number in your supplier reference (not one from this request), can the supplier confirm they asked to change or add these bank details?');
    questions.push('Can the supplier confirm the full IBAN and beneficiary name for the new account?');
  } else {
    questions.push('Can the supplier confirm this invoice number, amount and the account it should be paid to?');
  }
  if (findings.some((f) => f.category === 'urgency')) questions.push('Why is this payment urgent, and who at the supplier set the deadline?');
  if (findings.some((f) => f.category === 'contact_change')) questions.push('Did the supplier really change their contact details? Confirm using previously recorded details only.');

  const typeLabel = detected === 'UNKNOWN' ? 'Payment-related request' : `${REQUEST_TYPE_LABELS[detected]} request`;
  const parts = [typeLabel];
  if (fields.senderEmail) parts.push(`from ${fields.senderEmail}`);
  if (fields.amount) parts.push(`for ${fields.currency ? fields.currency + ' ' : ''}${fields.amount}`);
  if (fields.beneficiaryName) parts.push(`to ${fields.beneficiaryName}`);
  if (fields.iban) parts.push(`(IBAN ending ${fields.iban.slice(-4)})`);
  const flagged = findings.filter((f) => f.category !== 'missing_information').length;
  const summary = `${parts.join(' ')}. ${flagged ? `${flagged} language indicator${flagged > 1 ? 's' : ''} found.` : 'No language indicators found.'}`;

  return {
    requestType: detected,
    summary,
    extractedFields: fields as AnalysisOutput['extractedFields'],
    findings,
    missingInformation: missing,
    suggestedVerificationQuestions: questions,
  };
}

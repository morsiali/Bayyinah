// SMS intake: parsing of provider webhooks, Twilio signature checks and phone-number comparison.
// Pure functions only — no database — so they are easy to test.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '@/lib/errors';

export const SMS_MAX_CHARS = 2000;
export const SMS_PROVIDERS = ['TWILIO', 'FORWARDER', 'TEST'] as const;
export type SmsProvider = (typeof SMS_PROVIDERS)[number];

export type ParsedSms = {
  provider: SmsProvider;
  from: string;
  to: string | null;
  body: string;
  providerMessageId: string | null;
  sentAt: Date | null;
  truncated: boolean;
};

/** Keeps "+" and digits; turns a leading "00" into "+". Returns '' for nothing usable. */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const s = String(raw).trim();
  const plus = s.startsWith('+') || s.startsWith('00');
  const digits = s.replace(/\D/g, '').replace(/^00/, '');
  if (!digits) return '';
  return plus ? `+${digits}` : digits;
}

/**
 * Whether two phone numbers plausibly name the same line. National and international forms
 * match ("04 555 0202" and "+971 4 555 0202"). Used only to suggest a supplier — never as proof.
 */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizePhone(a).replace(/^\+/, '').replace(/^0+/, '');
  const y = normalizePhone(b).replace(/^\+/, '').replace(/^0+/, '');
  if (x.length < 7 || y.length < 7) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return long.endsWith(short) && long.length - short.length <= 3;
}

/** Text as stored: control characters removed (newlines kept), trimmed, capped. */
export function cleanBody(raw: unknown): { body: string; truncated: boolean } {
  const s = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‎‏‪-‮⁦-⁩]/g, '')
    .trim();
  if (s.length <= SMS_MAX_CHARS) return { body: s, truncated: false };
  return { body: s.slice(0, SMS_MAX_CHARS), truncated: true };
}

function cleanSender(raw: unknown): string {
  // Alphanumeric sender IDs ("ADCB", "Etisalat") are common in the UAE; keep them readable.
  const s = String(raw ?? '').replace(/[^\p{L}\p{N}+\-() .]/gu, '').trim().slice(0, 40);
  return /^[+\d][\d\s\-().]*$/.test(s) ? normalizePhone(s) : s;
}

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : /^\d+$/.test(String(v)) ? Number(v) : NaN;
  const d = Number.isFinite(n) ? new Date(n < 1e12 ? n * 1000 : n) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

const pick = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== '') return o[k];
  return undefined;
};

/** Twilio (form-encoded) or a generic JSON forwarder. Throws VALIDATION when sender or text is missing. */
export function parseInboundSms(contentType: string, raw: string): ParsedSms {
  const ct = contentType.toLowerCase();
  let fields: Record<string, unknown>;
  let provider: SmsProvider;
  if (ct.includes('application/x-www-form-urlencoded')) {
    fields = Object.fromEntries(new URLSearchParams(raw));
    provider = fields.MessageSid || fields.SmsMessageSid ? 'TWILIO' : 'FORWARDER';
  } else {
    try {
      const j = JSON.parse(raw);
      if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('not an object');
      fields = j as Record<string, unknown>;
    } catch {
      throw new AppError('VALIDATION', 'The message must be JSON or form-encoded.');
    }
    provider = 'FORWARDER';
  }
  const from = cleanSender(pick(fields, ['From', 'from', 'sender', 'phone', 'number', 'msisdn', 'originator']));
  const { body, truncated } = cleanBody(pick(fields, ['Body', 'body', 'text', 'message', 'msg', 'content']));
  if (!from) throw new AppError('VALIDATION', 'The message has no sender number.');
  if (!body) throw new AppError('VALIDATION', 'The message has no text.');
  const to = cleanSender(pick(fields, ['To', 'to', 'receiver', 'recipient'])) || null;
  const idRaw = pick(fields, ['MessageSid', 'SmsMessageSid', 'id', 'messageId', 'message_id']);
  const providerMessageId = idRaw === undefined ? null : String(idRaw).replace(/[^\w\-.:]/g, '').slice(0, 80) || null;
  const sentAt = parseDate(pick(fields, ['sentAt', 'sent_at', 'sentStamp', 'timestamp', 'date', 'receivedStamp']));
  return { provider, from, to, body, providerMessageId, sentAt, truncated };
}

/** Twilio's request signature: base64 HMAC-SHA1 over the full URL followed by each POST param (sorted) as key+value. */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  return createHmac('sha1', authToken).update(data, 'utf8').digest('base64');
}

export function verifyTwilioSignature(authToken: string, url: string, params: Record<string, string>, header: string | null): boolean {
  if (!header) return false;
  const expected = Buffer.from(twilioSignature(authToken, url, params));
  const got = Buffer.from(header);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/** The evidence text a case receives: a short header recorded by Bayyinah, then the message exactly as received. */
export function smsEvidenceText(m: { fromNumber: string; toNumber: string | null; receivedAt: Date; provider: string; body: string }): string {
  return [
    'SMS received by Bayyinah',
    `From: ${m.fromNumber}`,
    ...(m.toNumber ? [`To: ${m.toNumber}`] : []),
    `Received: ${m.receivedAt.toISOString()}`,
    `Via: ${m.provider}`,
    '',
    m.body,
  ].join('\n');
}

// ───────── Per-organization rate limit (in memory; one process) ─────────

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

/** True when this organization may accept another message now. */
export function allowSms(orgId: string, limitPerMinute = 30, now = Date.now()): boolean {
  const list = (hits.get(orgId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= limitPerMinute) {
    hits.set(orgId, list);
    return false;
  }
  list.push(now);
  hits.set(orgId, list);
  return true;
}

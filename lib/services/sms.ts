// SMS intake: every text sent to an organization's intake address lands in its Bayyinah inbox first.
// Nothing in a message is acted on automatically; a preparer turns it into a case or dismisses it.
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { newToken, hashToken } from '@/lib/tokens';
import { EDITABLE_STATUSES, REQUEST_TYPES } from '@/lib/constants';
import { allowSms, cleanBody, normalizePhone, phonesMatch, smsEvidenceText, type ParsedSms } from '@/lib/sms';
import { analyzeLocally, detectRequestType } from '@/lib/analysis/local-analyzer';
import { requireRole, type Actor } from './access';
import { createCase } from './cases';
import { bumpRevision } from './workflow';

export const smsPath = (token: string) => `/api/sms/inbound/${token}`;
export const smsUrl = (token: string) => `${env.appUrl()}${smsPath(token)}`;

// ───────────── Admin: the intake address ─────────────

export async function getSmsSettings(actor: Actor, orgId: string) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { smsEnabled: true, smsTokenHash: true } });
  const [received, waiting] = await Promise.all([prisma.inboundMessage.count({ where: { orgId } }), prisma.inboundMessage.count({ where: { orgId, status: 'NEW' } })]);
  return { enabled: org.smsEnabled && !!org.smsTokenHash, received, waiting, twilioSignatureChecked: !!process.env.TWILIO_AUTH_TOKEN };
}

/** Creates (or replaces) the secret intake address. The full URL is shown once; only its hash is stored. */
export async function createSmsAddress(actor: Actor, orgId: string) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const before = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { smsTokenHash: true } });
  const { token, hash } = newToken();
  await prisma.organization.update({ where: { id: orgId }, data: { smsTokenHash: hash, smsEnabled: true } });
  await audit({ orgId, actor, action: before.smsTokenHash ? 'sms.address_rotated' : 'sms.address_created', entityType: 'organization', entityId: orgId });
  return { url: smsUrl(token), path: smsPath(token) };
}

export async function disableSms(actor: Actor, orgId: string) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  await prisma.organization.update({ where: { id: orgId }, data: { smsTokenHash: null, smsEnabled: false } });
  await audit({ orgId, actor, action: 'sms.address_disabled', entityType: 'organization', entityId: orgId });
}

/** Resolves an intake token to an active organization with SMS turned on. Unknown and disabled look the same. */
export async function orgForSmsToken(token: string) {
  if (!token || token.length < 20 || token.length > 100) throw notFound('Record');
  const org = await prisma.organization.findUnique({ where: { smsTokenHash: hashToken(token) }, select: { id: true, status: true, smsEnabled: true } });
  if (!org || !org.smsEnabled || org.status !== 'ACTIVE') throw notFound('Record');
  return org;
}

// ───────────── Receiving ─────────────

/** Stores one inbound message. Repeated deliveries of the same provider message id are ignored. */
export async function receiveSms(orgId: string, sms: ParsedSms) {
  if (!allowSms(orgId)) throw new AppError('RATE_LIMITED', 'Too many messages in a short time. Try again in a minute.');
  if (sms.providerMessageId) {
    const dup = await prisma.inboundMessage.findUnique({ where: { orgId_providerMessageId: { orgId, providerMessageId: sms.providerMessageId } }, select: { id: true } });
    if (dup) return { id: dup.id, duplicate: true };
  }
  try {
    const m = await prisma.inboundMessage.create({
      data: { orgId, provider: sms.provider, providerMessageId: sms.providerMessageId, fromNumber: sms.from, toNumber: sms.to, body: sms.body, sentAt: sms.sentAt },
    });
    await audit({ orgId, actor: null, action: 'sms.received', entityType: 'inboundMessage', entityId: m.id, changedFields: { from: sms.from, provider: sms.provider, chars: sms.body.length, truncated: sms.truncated } });
    return { id: m.id, duplicate: false };
  } catch (e) {
    // Two deliveries racing on the unique key: the first one wins.
    if ((e as { code?: string }).code === 'P2002' && sms.providerMessageId) {
      const dup = await prisma.inboundMessage.findUniqueOrThrow({ where: { orgId_providerMessageId: { orgId, providerMessageId: sms.providerMessageId } }, select: { id: true } });
      return { id: dup.id, duplicate: true };
    }
    throw e;
  }
}

export const testSmsSchema = z.object({
  from: z.string().trim().min(3, 'Enter the sender number.').max(40),
  body: z.string().trim().min(1, 'Enter the message text.').max(4000),
});

/** Lets an admin try the inbox without a phone or provider. Marked as a test everywhere it appears. */
export async function sendTestSms(actor: Actor, orgId: string, input: z.infer<typeof testSmsSchema>) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const data = testSmsSchema.parse(input);
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { smsEnabled: true, smsTokenHash: true } });
  if (!org.smsEnabled || !org.smsTokenHash) throw new AppError('BLOCKED', 'Create the SMS intake address first.');
  const from = /^[+\d][\d\s\-().]*$/.test(data.from) ? normalizePhone(data.from) : data.from;
  const { body, truncated } = cleanBody(data.body);
  return receiveSms(orgId, { provider: 'TEST', from, to: null, body, providerMessageId: null, sentAt: null, truncated });
}

// ───────────── Inbox ─────────────

const INBOX_ROLES = ['PREPARER', 'ORG_ADMIN'] as const;

export async function newSmsCount(orgId: string) {
  return prisma.inboundMessage.count({ where: { orgId, status: 'NEW' } });
}

const LANGUAGE_CATEGORIES = new Set(['prompt_injection_attempt', 'bypass_procedure', 'secrecy', 'urgency', 'contact_change']);

/** Language indicators from the local analyzer (no network), shown before anyone opens a case. */
export function smsIndicators(text: string): { category: string; severity: string }[] {
  const seen = new Set<string>();
  return analyzeLocally([{ id: 'sms', text }])
    .findings.filter((f) => LANGUAGE_CATEGORIES.has(f.category) && !seen.has(f.category) && seen.add(f.category))
    .map((f) => ({ category: f.category, severity: f.severity }));
}

export type InboxMessage = Awaited<ReturnType<typeof listInbox>>['messages'][number];

export async function listInbox(actor: Actor, orgId: string, view: 'new' | 'handled' = 'new') {
  await requireRole(actor, orgId, [...INBOX_ROLES]);
  const [messages, suppliers, counts] = await Promise.all([
    prisma.inboundMessage.findMany({
      where: { orgId, status: view === 'new' ? 'NEW' : { in: ['CASE_CREATED', 'DISMISSED'] } },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    }),
    prisma.supplier.findMany({ where: { orgId, isActive: true }, select: { id: true, name: true, recordedPhone: true, usualCurrency: true, reviewStatus: true }, orderBy: { name: 'asc' } }),
    prisma.inboundMessage.groupBy({ by: ['status'], where: { orgId }, _count: true }),
  ]);
  const caseIds = messages.map((m) => m.caseId).filter((x): x is string => !!x);
  const cases = caseIds.length ? await prisma.case.findMany({ where: { orgId, id: { in: caseIds } }, select: { id: true, caseNumber: true } }) : [];
  const handlerIds = [...new Set(messages.map((m) => m.handledBy).filter((x): x is string => !!x))];
  const handlers = handlerIds.length ? await prisma.user.findMany({ where: { id: { in: handlerIds } }, select: { id: true, name: true } }) : [];
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  return {
    suppliers,
    counts: { new: count('NEW'), handled: count('CASE_CREATED') + count('DISMISSED') },
    messages: messages.map((m) => {
      const match = suppliers.find((s) => phonesMatch(s.recordedPhone, m.fromNumber));
      return {
        ...m,
        detectedType: m.body ? detectRequestType(m.body) : 'UNKNOWN',
        indicators: m.body ? smsIndicators(m.body) : [],
        suggestedSupplierId: match?.id ?? null,
        caseNumber: cases.find((c) => c.id === m.caseId)?.caseNumber ?? null,
        handlerName: handlers.find((h) => h.id === m.handledBy)?.name ?? null,
      };
    }),
  };
}

export const smsToCaseSchema = z.object({
  supplierId: z.string().min(1, 'Choose a supplier.'),
  requestType: z.enum(REQUEST_TYPES, { errorMap: () => ({ message: 'Choose a request type.' }) }),
  expectedAmount: z.string().trim().max(40).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

/** Turns a new message into a case whose first source is the SMS exactly as received. */
export async function createCaseFromSms(actor: Actor, orgId: string, messageId: string, input: z.infer<typeof smsToCaseSchema>) {
  await requireRole(actor, orgId, 'PREPARER');
  const data = smsToCaseSchema.parse(input);
  const m = await prisma.inboundMessage.findFirst({ where: { id: messageId, orgId } });
  if (!m) throw notFound('Message');
  if (!m.body) throw new AppError('BLOCKED', 'This message’s text was removed under the retention policy.');
  // Claim the message first so two preparers cannot open two cases from it.
  const claimed = await prisma.inboundMessage.updateMany({ where: { id: m.id, orgId, status: 'NEW' }, data: { status: 'CASE_CREATED', handledBy: actor.id, handledAt: new Date() } });
  if (claimed.count !== 1) throw new AppError('CONFLICT', 'Someone already handled this message. Reload the inbox.');
  try {
    const supplier = await prisma.supplier.findFirst({ where: { id: data.supplierId, orgId }, select: { usualCurrency: true } });
    const c = await createCase(actor, orgId, { supplierId: data.supplierId, requestType: data.requestType, expectedAmount: data.expectedAmount || null, expectedCurrency: supplier?.usualCurrency ?? null, note: data.note || null });
    const text = smsEvidenceText({ fromNumber: m.fromNumber, toNumber: m.toNumber, receivedAt: m.receivedAt, provider: m.provider, body: m.body });
    await prisma.$transaction(async (tx) => {
      const current = await tx.case.findUniqueOrThrow({ where: { id: c.id }, select: { currentInputVersionId: true } });
      const doc = await tx.sourceDocument.create({
        data: { caseId: c.id, orgId, caseInputVersionId: current.currentInputVersionId!, kind: 'SMS', label: `SMS from ${m.fromNumber}`, rawText: text, sizeBytes: Buffer.byteLength(text), extractionStatus: 'COMPLETED', uploadedBy: actor.id },
      });
      await bumpRevision(tx, c.id, orgId, EDITABLE_STATUSES);
      await tx.inboundMessage.update({ where: { id: m.id }, data: { caseId: c.id } });
      await audit({ orgId, actor, action: 'sms.case_created', entityType: 'inboundMessage', entityId: m.id, changedFields: { caseId: c.id, caseNumber: c.caseNumber, sourceDocumentId: doc.id }, caseInputVersionId: current.currentInputVersionId }, tx);
    });
    return c;
  } catch (e) {
    await prisma.inboundMessage.updateMany({ where: { id: m.id, orgId, caseId: null }, data: { status: 'NEW', handledBy: null, handledAt: null } });
    throw e;
  }
}

export const dismissSmsSchema = z.object({ reason: z.string().trim().min(3, 'Say briefly why this message needs no case.').max(300) });

export async function dismissSms(actor: Actor, orgId: string, messageId: string, input: z.infer<typeof dismissSmsSchema>) {
  await requireRole(actor, orgId, [...INBOX_ROLES]);
  const { reason } = dismissSmsSchema.parse(input);
  const res = await prisma.inboundMessage.updateMany({ where: { id: messageId, orgId, status: 'NEW' }, data: { status: 'DISMISSED', dismissedReason: reason, handledBy: actor.id, handledAt: new Date() } });
  if (res.count !== 1) {
    if (!(await prisma.inboundMessage.findFirst({ where: { id: messageId, orgId }, select: { id: true } }))) throw notFound('Message');
    throw new AppError('CONFLICT', 'Someone already handled this message. Reload the inbox.');
  }
  await audit({ orgId, actor, action: 'sms.dismissed', entityType: 'inboundMessage', entityId: messageId, reason });
}

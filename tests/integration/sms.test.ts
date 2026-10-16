import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { createCaseFromSms, createSmsAddress, disableSms, dismissSms, listInbox, newSmsCount, sendTestSms } from '@/lib/services/sms';
import { runAnalysis } from '@/lib/services/analysis';
import { runAgent } from '@/lib/services/agent';
import { purgeExpiredEvidence } from '@/lib/services/retention';
import { twilioSignature } from '@/lib/sms';
import { POST, GET } from '@/app/api/sms/inbound/[token]/route';
import { mkOrg } from '../helpers';

async function code(p: Promise<unknown>) {
  try {
    await p;
    return 'OK';
  } catch (e) {
    return e instanceof AppError ? e.code : `THROWN:${(e as Error).name}`;
  }
}

const tokenOf = (path: string) => path.split('/').pop()!;
const call = (path: string, init: RequestInit) => POST(new Request(`http://localhost:3000${path}`, { method: 'POST', ...init }), { params: Promise.resolve({ token: tokenOf(path) }) });
const json = (path: string, body: unknown) => call(path, { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const FRAUD = 'Gulf Supplies: our bank account has changed. Pay INV-2026-0412 AED 18,750.00 to the new IBAN today. Do not call, we are travelling.';

afterEach(() => {
  delete process.env.TWILIO_AUTH_TOKEN;
});

describe('SMS intake', () => {
  it('only admins manage the address; the URL is shown once and only its hash is stored', async () => {
    const o = await mkOrg();
    expect(await code(createSmsAddress(o.preparer, o.org.id))).toBe('FORBIDDEN');
    const a = await createSmsAddress(o.admin, o.org.id);
    expect(a.path).toMatch(/^\/api\/sms\/inbound\/[\w-]{40,}$/);
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: o.org.id } });
    expect(org.smsEnabled).toBe(true);
    expect(org.smsTokenHash).not.toContain(tokenOf(a.path));
    expect((await GET(new Request(`http://localhost:3000${a.path}`), { params: Promise.resolve({ token: tokenOf(a.path) }) })).status).toBe(200);

    // Rotating replaces the address: the old one stops working.
    const b = await createSmsAddress(o.admin, o.org.id);
    expect((await json(a.path, { from: '+971500000001', text: 'hello there' })).status).toBe(404);
    expect((await json(b.path, { from: '+971500000001', text: 'hello there' })).status).toBe(200);
    await disableSms(o.admin, o.org.id);
    expect((await json(b.path, { from: '+971500000001', text: 'hello again' })).status).toBe(404);
    expect(await prisma.auditEvent.count({ where: { orgId: o.org.id, action: { in: ['sms.address_created', 'sms.address_rotated', 'sms.address_disabled'] } } })).toBe(3);
  });

  it('a forwarded text lands in the inbox first, once, with a supplier suggestion', async () => {
    const o = await mkOrg();
    const { path } = await createSmsAddress(o.admin, o.org.id);
    const r = await json(path, { from: '04 555 0202', text: FRAUD, id: 'fwd-1' });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ ok: true, duplicate: false });
    // The phone retries: stored once.
    expect(await (await json(path, { from: '04 555 0202', text: FRAUD, id: 'fwd-1' })).json()).toMatchObject({ duplicate: true, id: body.id });
    expect(await newSmsCount(o.org.id)).toBe(1);

    const inbox = await listInbox(o.preparer, o.org.id);
    const m = inbox.messages[0];
    expect(m.suggestedSupplierId).toBe(o.supplier.id);
    expect(m.detectedType).toBe('BANK_ACCOUNT_CHANGE');
    expect(m.indicators.map((i) => i.category)).toEqual(expect.arrayContaining(['urgency', 'bypass_procedure']));
    expect(await code(listInbox(o.reviewer, o.org.id))).toBe('FORBIDDEN');
    expect(await prisma.auditEvent.count({ where: { orgId: o.org.id, action: 'sms.received' } })).toBe(1);
  });

  it('rejects malformed messages and other organizations cannot see them', async () => {
    const o = await mkOrg();
    const other = await mkOrg();
    const { path } = await createSmsAddress(o.admin, o.org.id);
    expect((await json(path, { text: 'no sender here' })).status).toBe(400);
    expect((await call(path, { headers: { 'content-type': 'application/json' }, body: 'x'.repeat(20000) })).status).toBe(400);
    expect((await json('/api/sms/inbound/not-a-real-token-at-all-000000000', { from: '+971500000000', text: 'hi' })).status).toBe(404);
    await json(path, { from: '+971500000002', text: 'Invoice INV-9 attached' });
    expect((await listInbox(other.admin, other.org.id)).messages).toHaveLength(0);
    const id = (await listInbox(o.admin, o.org.id)).messages[0].id;
    expect(await code(dismissSms(other.admin, other.org.id, id, { reason: 'not ours' }))).toBe('NOT_FOUND');
    expect(await code(createCaseFromSms(other.preparer, other.org.id, id, { supplierId: other.supplier.id, requestType: 'INVOICE_PAYMENT' }))).toBe('NOT_FOUND');
  });

  it('checks Twilio signatures when TWILIO_AUTH_TOKEN is set, and never replies to the sender', async () => {
    const o = await mkOrg();
    const { path } = await createSmsAddress(o.admin, o.org.id);
    process.env.TWILIO_AUTH_TOKEN = 'twilio-test-token';
    const params = { MessageSid: 'SM0001', From: '+971501112222', To: '+97145550000', Body: 'Please pay invoice INV-77' };
    const form = new URLSearchParams(params).toString();
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };
    expect((await call(path, { headers, body: form })).status).toBe(403);
    expect((await call(path, { headers: { ...headers, 'x-twilio-signature': 'bad' }, body: form })).status).toBe(403);
    const sig = twilioSignature('twilio-test-token', `http://localhost:3000${path}`, params);
    const ok = await call(path, { headers: { ...headers, 'x-twilio-signature': sig }, body: form });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toContain('text/xml');
    expect(await ok.text()).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    const m = await prisma.inboundMessage.findFirstOrThrow({ where: { orgId: o.org.id } });
    expect(m).toMatchObject({ provider: 'TWILIO', providerMessageId: 'SM0001', fromNumber: '+971501112222', toNumber: '+97145550000' });
  });

  it('a preparer turns the SMS into a case whose first source is the message, then the normal workflow runs', async () => {
    const o = await mkOrg();
    await createSmsAddress(o.admin, o.org.id);
    expect(await code(sendTestSms(o.preparer, o.org.id, { from: '+971 4 555 0202', body: FRAUD }))).toBe('FORBIDDEN');
    const sent = await sendTestSms(o.admin, o.org.id, { from: '+971 4 555 0202', body: FRAUD });
    expect(await code(createCaseFromSms(o.admin, o.org.id, sent.id, { supplierId: o.supplier.id, requestType: 'BANK_ACCOUNT_CHANGE' }))).toBe('FORBIDDEN');

    const c = await createCaseFromSms(o.preparer, o.org.id, sent.id, { supplierId: o.supplier.id, requestType: 'BANK_ACCOUNT_CHANGE' });
    const doc = await prisma.sourceDocument.findFirstOrThrow({ where: { caseId: c.id } });
    expect(doc.kind).toBe('SMS');
    expect(doc.label).toBe('SMS from +97145550202');
    expect(doc.rawText).toMatch(/^SMS received by Bayyinah\nFrom: \+97145550202\n/);
    expect(doc.rawText!.endsWith(FRAUD)).toBe(true);
    const msgRow = await prisma.inboundMessage.findUniqueOrThrow({ where: { id: sent.id } });
    expect(msgRow).toMatchObject({ status: 'CASE_CREATED', caseId: c.id, handledBy: o.preparer.id });

    // A message becomes at most one case.
    expect(await code(createCaseFromSms(o.preparer, o.org.id, sent.id, { supplierId: o.supplier.id, requestType: 'BANK_ACCOUNT_CHANGE' }))).toBe('CONFLICT');
    expect(await code(dismissSms(o.preparer, o.org.id, sent.id, { reason: 'duplicate' }))).toBe('CONFLICT');

    await runAnalysis(o.preparer, o.org.id, c.id);
    const analysis = await prisma.analysis.findFirstOrThrow({ where: { caseId: c.id }, include: { findings: true } });
    expect(analysis.status).toBe('COMPLETED');
    expect(analysis.findings.map((f) => f.category)).toEqual(expect.arrayContaining(['urgency', 'bypass_procedure']));
    await runAgent(o.preparer, o.org.id, c.id);
    expect((await prisma.case.findUniqueOrThrow({ where: { id: c.id } })).status).toBe('INDEPENDENT_CHECK_REQUIRED');
    expect(await prisma.auditEvent.count({ where: { orgId: o.org.id, action: 'sms.case_created' } })).toBe(1);
  });

  it('frees the message again if the case cannot be created', async () => {
    const o = await mkOrg();
    await createSmsAddress(o.admin, o.org.id);
    const sent = await sendTestSms(o.admin, o.org.id, { from: '+971500000003', body: 'Invoice INV-5 for AED 100.00' });
    expect(await code(createCaseFromSms(o.preparer, o.org.id, sent.id, { supplierId: 'missing', requestType: 'INVOICE_PAYMENT' }))).toBe('NOT_FOUND');
    expect((await prisma.inboundMessage.findUniqueOrThrow({ where: { id: sent.id } })).status).toBe('NEW');
  });

  it('dismissing needs a reason; retention removes the text of handled messages only', async () => {
    const o = await mkOrg();
    await createSmsAddress(o.admin, o.org.id);
    const a = await sendTestSms(o.admin, o.org.id, { from: '+971500000004', body: 'Happy Eid from the team' });
    const b = await sendTestSms(o.admin, o.org.id, { from: '+971500000005', body: 'Still waiting' });
    expect(await code(dismissSms(o.preparer, o.org.id, a.id, { reason: '' }))).toBe('THROWN:ZodError');
    await dismissSms(o.preparer, o.org.id, a.id, { reason: 'Personal greeting' });
    expect((await listInbox(o.preparer, o.org.id, 'handled')).messages.map((m) => m.dismissedReason)).toEqual(['Personal greeting']);

    const old = new Date(Date.now() - 400 * 86400_000);
    await prisma.inboundMessage.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { receivedAt: old } });
    const r = await purgeExpiredEvidence();
    expect(r.smsPurged).toBeGreaterThanOrEqual(1);
    expect((await prisma.inboundMessage.findUniqueOrThrow({ where: { id: a.id } })).body).toBeNull();
    expect((await prisma.inboundMessage.findUniqueOrThrow({ where: { id: b.id } })).body).toBe('Still waiting');
    expect(await code(createCaseFromSms(o.preparer, o.org.id, a.id, { supplierId: o.supplier.id, requestType: 'INVOICE_PAYMENT' }))).toBe('BLOCKED');
  });
});

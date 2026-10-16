// Public webhook: a Twilio number or an SMS-forwarding phone posts each incoming text here.
// The secret token in the path identifies the organization; only its hash is stored.
import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { errorResponse } from '@/lib/api';
import { env } from '@/lib/env';
import { parseInboundSms, verifyTwilioSignature } from '@/lib/sms';
import { orgForSmsToken, receiveSms } from '@/lib/services/sms';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 16 * 1024;
const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/** The addresses Twilio may have signed: the configured public URL and the address this request arrived on. */
function candidateUrls(req: Request): string[] {
  const u = new URL(req.url);
  const path = u.pathname + u.search;
  const host = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || req.headers.get('host') || u.host;
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || u.protocol.replace(':', '');
  return [...new Set([`${env.appUrl()}${path}`, `${proto}://${host}${path}`])];
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  let twilio = false;
  try {
    const { token } = await ctx.params;
    const org = await orgForSmsToken(token);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > MAX_BYTES) throw new AppError('VALIDATION', 'The message is too large.');
    const contentType = req.headers.get('content-type') ?? '';
    const sms = parseInboundSms(contentType, raw);
    twilio = sms.provider === 'TWILIO';
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (twilio && authToken) {
      const params = Object.fromEntries(new URLSearchParams(raw));
      const sig = req.headers.get('x-twilio-signature');
      if (!candidateUrls(req).some((url) => verifyTwilioSignature(authToken, url, params, sig))) throw new AppError('FORBIDDEN', 'The Twilio signature is missing or invalid.');
    }
    const r = await receiveSms(org.id, sms);
    // Bayyinah never replies to the sender: an auto-reply would confirm the number to a fraudster.
    if (twilio) return new Response(TWIML_EMPTY, { status: 200, headers: { 'content-type': 'text/xml; charset=utf-8' } });
    return NextResponse.json({ ok: true, id: r.id, duplicate: r.duplicate });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Lets a forwarding app check that the address works, without storing anything. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    await orgForSmsToken((await ctx.params).token);
    return NextResponse.json({ ok: true, service: 'bayyinah-sms-intake', method: 'POST' });
  } catch (e) {
    return errorResponse(e);
  }
}

import { describe, expect, it } from 'vitest';
import { allowSms, cleanBody, normalizePhone, parseInboundSms, phonesMatch, smsEvidenceText, twilioSignature, verifyTwilioSignature, SMS_MAX_CHARS } from '@/lib/sms';
import { AppError } from '@/lib/errors';
import { smsIndicators } from '@/lib/services/sms';
import { translateText } from '@/lib/i18n/core';

const FORM = 'application/x-www-form-urlencoded';

describe('SMS parsing', () => {
  it('reads a Twilio webhook', () => {
    const raw = new URLSearchParams({ MessageSid: 'SM123abc', From: '+971501234567', To: '+97145550000', Body: 'Please pay INV-1 today', NumMedia: '0' }).toString();
    const m = parseInboundSms(FORM, raw);
    expect(m).toMatchObject({ provider: 'TWILIO', from: '+971501234567', to: '+97145550000', body: 'Please pay INV-1 today', providerMessageId: 'SM123abc', truncated: false });
  });

  it('reads a JSON forwarder with its usual field names and a millisecond timestamp', () => {
    const m = parseInboundSms('application/json; charset=utf-8', JSON.stringify({ from: '00971 50 123 4567', text: 'حساب بنكي جديد', sentStamp: 1760000000000, id: 42 }));
    expect(m.provider).toBe('FORWARDER');
    expect(m.from).toBe('+971501234567');
    expect(m.body).toBe('حساب بنكي جديد');
    expect(m.providerMessageId).toBe('42');
    expect(m.sentAt?.toISOString()).toBe(new Date(1760000000000).toISOString());
  });

  it('keeps alphanumeric sender IDs and accepts body / message aliases', () => {
    expect(parseInboundSms('application/json', JSON.stringify({ sender: 'ADCB', message: 'OTP 1234' })).from).toBe('ADCB');
    expect(parseInboundSms('application/json', JSON.stringify({ phone: '+1 (415) 555-0100', body: 'hi' })).from).toBe('+14155550100');
  });

  it('rejects messages without a sender or text, and bodies that are not JSON', () => {
    const code = (f: () => unknown) => {
      try {
        f();
        return 'OK';
      } catch (e) {
        return e instanceof AppError ? e.code : 'THROWN';
      }
    };
    expect(code(() => parseInboundSms('application/json', JSON.stringify({ text: 'no sender' })))).toBe('VALIDATION');
    expect(code(() => parseInboundSms('application/json', JSON.stringify({ from: '+971500000000', text: '   ' })))).toBe('VALIDATION');
    expect(code(() => parseInboundSms('application/json', 'not json'))).toBe('VALIDATION');
    expect(code(() => parseInboundSms('application/json', '[1,2]'))).toBe('VALIDATION');
  });

  it('strips control and direction-override characters and caps the length', () => {
    expect(cleanBody('a‮b\u0007c\r\nd').body).toBe('abc\nd');
    const long = cleanBody('x'.repeat(SMS_MAX_CHARS + 50));
    expect(long.body).toHaveLength(SMS_MAX_CHARS);
    expect(long.truncated).toBe(true);
  });
});

describe('Phone numbers', () => {
  it('normalizes international prefixes', () => {
    expect(normalizePhone('+971 4 555-0202')).toBe('+97145550202');
    expect(normalizePhone('00971 4 555 0202')).toBe('+97145550202');
    expect(normalizePhone('')).toBe('');
  });

  it('matches national and international forms of the same number, and nothing looser', () => {
    expect(phonesMatch('+971 4 555 0202', '04 555 0202')).toBe(true);
    expect(phonesMatch('+971 4 555 0202', '+97145550202')).toBe(true);
    expect(phonesMatch('+971 4 555 0202', '+971 4 555 0203')).toBe(false);
    expect(phonesMatch('+971 4 555 0202', '0202')).toBe(false);
    expect(phonesMatch(null, '+97145550202')).toBe(false);
    expect(phonesMatch('ADCB', 'ADCB')).toBe(false);
  });
});

describe('Twilio signatures', () => {
  // Example from Twilio's documentation on validating requests.
  const url = 'https://mycompany.com/myapp.php?foo=1&bar=2';
  const params = { CallSid: 'CA1234567890ABCDE', Caller: '+12349013030', Digits: '1234', From: '+12349013030', To: '+18005551212' };
  const token = '12345';

  it('computes the documented signature', () => {
    expect(twilioSignature(token, url, params)).toBe('0/KCTR6DLpKmkAf8muzZqo1nDgQ=');
  });

  it('accepts only the exact signature for the exact URL and params', () => {
    const sig = twilioSignature(token, url, params);
    expect(verifyTwilioSignature(token, url, params, sig)).toBe(true);
    expect(verifyTwilioSignature(token, url, { ...params, Digits: '9999' }, sig)).toBe(false);
    expect(verifyTwilioSignature(token, url + 'x', params, sig)).toBe(false);
    expect(verifyTwilioSignature('other', url, params, sig)).toBe(false);
    expect(verifyTwilioSignature(token, url, params, null)).toBe(false);
  });
});

describe('Inbox helpers', () => {
  it('records the sender and time above the message, which stays verbatim', () => {
    const text = smsEvidenceText({ fromNumber: '+971501234567', toNumber: null, receivedAt: new Date('2026-10-16T08:00:00Z'), provider: 'TWILIO', body: 'Line 1\nLine 2' });
    expect(text).toBe('SMS received by Bayyinah\nFrom: +971501234567\nReceived: 2026-10-16T08:00:00.000Z\nVia: TWILIO\n\nLine 1\nLine 2');
  });

  it('flags language indicators in English and Arabic texts', () => {
    const en = smsIndicators('URGENT: our bank details have changed. Do not call, pay today.').map((i) => i.category);
    expect(en).toEqual(expect.arrayContaining(['urgency', 'bypass_procedure']));
    expect(smsIndicators('عاجل: تم تغيير الحساب، لا داعي للاتصال').map((i) => i.category)).toEqual(expect.arrayContaining(['urgency', 'bypass_procedure']));
    expect(smsIndicators('Thanks, see you at the meeting.')).toEqual([]);
  });

  it('rate-limits each organization separately', () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(allowSms('org-a', 3, now)).toBe(true);
    expect(allowSms('org-a', 3, now)).toBe(false);
    expect(allowSms('org-b', 3, now)).toBe(true);
    expect(allowSms('org-a', 3, now + 61_000)).toBe(true);
  });

  it('translates the SMS source label', () => {
    expect(translateText('ar', 'SMS from +971501234567')).toBe('رسالة نصية من ‎+971501234567‎');
  });
});

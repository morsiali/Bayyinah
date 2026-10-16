'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy, MessageSquarePlus, Power, RefreshCw, Send, ShieldCheck, Smartphone } from 'lucide-react';
import { Button, Field, Notice, cx } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { useI18n } from '@/components/i18n';
import { msg } from '@/lib/i18n/core';

const FORWARDER_TEMPLATE = '{"from": "%from%", "text": "%text%", "sentStamp": "%sentStamp%"}';

export function SmsSettings({ orgId, enabled, received, waiting, twilioSignatureChecked }: { orgId: string; enabled: boolean; received: number; waiting: number; twilioSignatureChecked: boolean }) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const [address, setAddress] = useState<string | null>(null);
  const [from, setFrom] = useState('+971 4 555 0202');
  const [body, setBody] = useState('Dear customer, our bank account has changed. Please pay invoice INV-2026-0412 of AED 18,750.00 to IBAN AE07 0331 2345 6789 0123 456 today. Do not call, we are in a meeting.');

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('Copied'));
    } catch {
      toast.message(text, { duration: 20000 });
    }
  }

  async function create() {
    const r = await run<{ path: string }>('create', `/api/orgs/${orgId}/sms`, { success: enabled ? msg('New SMS address created. The old one no longer works.') : msg('SMS address created') });
    if (r) setAddress(`${window.location.origin}${r.path}`);
  }

  const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-navy font-mono text-[12px] font-semibold text-white">{n}</span>
      <span className="min-w-0 text-[14.5px] leading-6">{children}</span>
    </li>
  );

  return (
    <div className="space-y-8">
      <section className="card p-6 md:p-8" aria-labelledby="sms-status-h">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="sms-status-h" className="t-sub text-[20px]">{t('SMS intake')}</h2>
            <p className="mt-1 max-w-2xl text-[15px] text-ink-muted">{t('Give your organization an SMS address. Every text sent to it lands in the Bayyinah inbox first, before anyone acts on it.')}</p>
          </div>
          <span className={cx('inline-flex items-center gap-2 border px-2.5 py-1 text-[13px] font-semibold', enabled ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-line-strong bg-mist text-ink-muted')} data-testid="sms-status">
            <span className={cx('h-2 w-2 rounded-full', enabled ? 'bg-signal-green' : 'bg-ink-faint')} aria-hidden />
            {enabled ? t('On') : t('Off')}
          </span>
        </div>
        <dl className="mt-5 grid max-w-md grid-cols-2 gap-4">
          <div><dt className="t-caption text-ink-muted">{t('Messages received')}</dt><dd className="font-mono text-[22px] font-semibold">{received}</dd></div>
          <div><dt className="t-caption text-ink-muted">{t('Waiting in the inbox')}</dt><dd className="font-mono text-[22px] font-semibold">{waiting}</dd></div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={create} loading={pending === 'create'} data-testid="sms-create-address">
            {enabled ? <RefreshCw className="h-4 w-4" aria-hidden /> : <MessageSquarePlus className="h-4 w-4" aria-hidden />}
            {enabled ? t('Replace the SMS address') : t('Create SMS address')}
          </Button>
          {enabled && (
            <Button variant="danger" loading={pending === 'off'} onClick={() => run('off', `/api/orgs/${orgId}/sms`, { method: 'DELETE', success: msg('SMS intake turned off') }).then(() => setAddress(null))}>
              <Power className="h-4 w-4" aria-hidden /> {t('Turn off SMS intake')}
            </Button>
          )}
          <Link href={`/app/${orgId}/inbox`} className="btn inline-flex h-10 items-center px-5 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-soft hover:bg-mist hover:text-ink">{t('Open the inbox')}</Link>
        </div>
        {enabled && !address && <p className="mt-3 text-[13px] text-ink-muted">{t('The address is shown only when it is created. Lost it? Replace it — the old address stops working at once.')}</p>}
        {address && (
          <Notice tone="info" className="mt-5" title={t('Your SMS address')}>
            <code className="block break-all font-mono text-[12.5px]" dir="ltr" data-testid="sms-address">{address}</code>
            <button className="link mt-1 inline-flex items-center gap-1 text-[13px]" onClick={() => copy(address)}><Copy className="h-3.5 w-3.5" aria-hidden /> {t('Copy address')}</button>
            <span className="mt-1 block text-[12.5px]">{t('Copy it now: it is shown only once. Anyone with this address can post messages into your inbox, so keep it private.')}</span>
          </Notice>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card min-w-0 p-6" aria-labelledby="sms-twilio-h">
          <h3 id="sms-twilio-h" className="t-sub flex items-center gap-2 text-[18px]"><ShieldCheck className="h-5 w-5 text-brand-600" aria-hidden /> {t('Option A — a Twilio number')}</h3>
          <p className="mt-1 text-[14px] text-ink-muted">{t('Best for a business number that suppliers text. Works with any phone.')}</p>
          <ol className="mt-4 space-y-3">
            <Step n={1}>{t('In Twilio, buy or choose a number with SMS.')}</Step>
            <Step n={2}>{t('In the number’s Messaging configuration, set the incoming-message webhook to your SMS address with HTTP POST:')}<code className="mt-1 block font-mono text-[12.5px] text-ink-soft" dir="ltr">A message comes in → Webhook → HTTP POST</code></Step>
            <Step n={3}>{t('Set TWILIO_AUTH_TOKEN on the Bayyinah server so every request’s signature is checked.')}</Step>
          </ol>
          <p className={cx('mt-4 flex items-center gap-2 text-[13px] font-semibold', twilioSignatureChecked ? 'text-emerald-800' : 'text-amber-800')} data-testid="sms-signature">
            <span className={cx('h-2 w-2 rounded-full', twilioSignatureChecked ? 'bg-signal-green' : 'bg-signal-amber')} aria-hidden />
            {twilioSignatureChecked ? t('Twilio signatures are checked on this server.') : t('Twilio signatures are not checked yet: TWILIO_AUTH_TOKEN is not set.')}
          </p>
        </section>

        <section className="card min-w-0 p-6" aria-labelledby="sms-android-h">
          <h3 id="sms-android-h" className="t-sub flex items-center gap-2 text-[18px]"><Smartphone className="h-5 w-5 text-brand-600" aria-hidden /> {t('Option B — forward from an Android phone')}</h3>
          <p className="mt-1 text-[14px] text-ink-muted">{t('Keeps your existing business SIM. iPhones cannot forward texts automatically.')}</p>
          <ol className="mt-4 space-y-3">
            <Step n={1}>{t('Put the business SIM in an Android phone that stays on and connected.')}</Step>
            <Step n={2}>{t('Install an SMS-forwarding app that can post to a webhook.')}</Step>
            <Step n={3}>{t('Set the method to POST, the content type to JSON, the URL to your SMS address, and a body like this (use your app’s placeholders):')}</Step>
          </ol>
          <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-all border border-line bg-mist p-3 font-mono text-[12px]" dir="ltr">{FORWARDER_TEMPLATE}</pre>
          <p className="mt-2 text-[13px] text-ink-muted">{t('Accepted fields: from, text (or body / message), optional to, id and sentStamp. Repeated ids are stored once.')}</p>
        </section>
      </div>

      <section className="card p-6 md:p-8" aria-labelledby="sms-test-h">
        <h3 id="sms-test-h" className="t-sub flex items-center gap-2 text-[18px]"><Send className="h-5 w-5 text-brand-600" aria-hidden /> {t('Send a test SMS')}</h3>
        <p className="mt-1 text-[14px] text-ink-muted">{t('Puts a message in the inbox exactly as a real text would arrive, marked as a test.')}</p>
        {!enabled ? (
          <Notice tone="review" className="mt-4">{t('Create the SMS intake address first.')}</Notice>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await run('test', `/api/orgs/${orgId}/sms/test`, { body: { from, body }, success: msg('Test SMS delivered to the inbox') });
            }}
          >
            <Field label={t('Sender number')} htmlFor="sms-test-from">
              <input id="sms-test-from" value={from} onChange={(e) => setFrom(e.target.value)} className="field-input max-w-xs" dir="ltr" />
            </Field>
            <Field label={t('Message text')} htmlFor="sms-test-body">
              <textarea id="sms-test-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="field-input" dir="auto" maxLength={2000} />
            </Field>
            <Button type="submit" loading={pending === 'test'} data-testid="sms-send-test">
              <Send className={cx('h-4 w-4', 'rtl:-scale-x-100')} aria-hidden /> {t('Send test SMS')}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

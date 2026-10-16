import type { Metadata } from 'next';
import Link from 'next/link';
import { Inbox, Settings2, ShieldAlert } from 'lucide-react';
import { getT } from '@/lib/i18n/server';
import { guardPage } from '@/lib/page-guard';
import { prisma } from '@/lib/db';
import { listInbox } from '@/lib/services/sms';
import { Forbidden } from '@/components/app/forbidden';
import { SmsInbox, type InboxRow } from '@/components/app/sms-inbox';
import { Empty, LinkButton, Notice, cx } from '@/components/ui';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('SMS inbox') };
}
export const dynamic = 'force-dynamic';

export default async function InboxPage({ params, searchParams }: { params: Promise<{ orgId: string }>; searchParams: Promise<{ view?: string }> }) {
  const { orgId } = await params;
  const view = (await searchParams).view === 'handled' ? 'handled' : 'new';
  const { user, ctx, allowed } = await guardPage(orgId, `/app/${orgId}/inbox`, ['PREPARER', 'ORG_ADMIN']);
  if (!allowed) return <Forbidden need="Preparer" orgId={orgId} />;
  const { t } = await getT();
  const [data, org] = await Promise.all([listInbox(user, orgId, view), prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { smsEnabled: true, smsTokenHash: true } })]);
  const enabled = org.smsEnabled && !!org.smsTokenHash;
  const isAdmin = ctx.roles.includes('ORG_ADMIN');
  const rows: InboxRow[] = data.messages.map((m) => ({
    id: m.id, provider: m.provider, fromNumber: m.fromNumber, toNumber: m.toNumber, body: m.body, receivedAt: m.receivedAt.toISOString(), status: m.status, caseId: m.caseId, caseNumber: m.caseNumber,
    dismissedReason: m.dismissedReason, handlerName: m.handlerName, handledAt: m.handledAt?.toISOString() ?? null, detectedType: m.detectedType, suggestedSupplierId: m.suggestedSupplierId, indicators: m.indicators,
  }));
  const tab = (v: 'new' | 'handled', label: string, n: number) => (
    <Link href={`/app/${orgId}/inbox${v === 'handled' ? '?view=handled' : ''}`} aria-current={view === v ? 'page' : undefined} className={cx('flex items-center gap-2 border-b-2 px-3 py-1.5 text-[14px] font-semibold', view === v ? 'border-brand-600 text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
      {label}
      <span className={cx('min-w-6 rounded-sm px-1.5 text-center font-mono text-[12px]', view === v ? 'bg-navy text-white' : 'bg-mist text-ink-muted')}>{n}</span>
    </Link>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow">/ <bdi>{ctx.orgName}</bdi></p>
          <h1 className="t-headline mt-2">{t('SMS inbox')}</h1>
          <p className="t-lead mt-2 max-w-2xl">{t('Texts sent to your Bayyinah SMS number arrive here first. Turn a message into a case, or dismiss it with a reason. Nothing in a message is acted on automatically.')}</p>
        </div>
        {isAdmin && (
          <LinkButton href={`/app/${orgId}/admin/sms`} variant="secondary" size="sm">
            <Settings2 className="h-4 w-4" aria-hidden /> {t('SMS settings')}
          </LinkButton>
        )}
      </div>

      <Notice tone="review" title={t('Treat every text as unverified.')}>
        {t('A sender name or number can be faked. Do not reply, call back or open links from a message. Verify through the supplier reference you already hold.')}
      </Notice>

      <nav aria-label={t('Messages')} className="flex gap-1 border-b border-line">
        {tab('new', t('New'), data.counts.new)}
        {tab('handled', t('Handled'), data.counts.handled)}
      </nav>

      {rows.length === 0 ? (
        !enabled && view === 'new' ? (
          <Empty icon={<ShieldAlert className="h-8 w-8" />} title={t('SMS intake is not set up yet')} action={isAdmin ? <LinkButton href={`/app/${orgId}/admin/sms`} arrow>{t('Set up SMS intake')}</LinkButton> : undefined}>
            {isAdmin ? t('Create your organization’s SMS address and connect a Twilio number or a forwarding phone.') : t('Ask an organization admin to set up SMS intake.')}
          </Empty>
        ) : (
          <Empty icon={<Inbox className="h-8 w-8" />} title={view === 'new' ? t('No new messages') : t('No handled messages yet')}>
            {view === 'new' ? t('New texts appear here as soon as they arrive.') : t('Messages turned into cases or dismissed are listed here.')}
          </Empty>
        )
      ) : (
        <SmsInbox orgId={orgId} rows={rows} suppliers={data.suppliers} canPrepare={ctx.roles.includes('PREPARER')} />
      )}
    </div>
  );
}

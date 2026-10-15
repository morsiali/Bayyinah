import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/shell';
import { AcceptInvite } from '@/components/auth/accept-invite';
import { LinkButton, Notice, Ltr } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { lookupInvitation } from '@/lib/services/orgs';
import { ROLE_LABELS } from '@/lib/constants';
import { LogoutButton } from '@/components/app/logout-button';
import { msg } from '@/lib/i18n/core';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Invitation') };
}

const MESSAGES = {
  invalid: msg('This invitation link is not valid. Check that you copied the whole link.'),
  revoked: msg('This invitation was withdrawn by an administrator.'),
  used: msg('This invitation has already been used. If it was you, simply sign in.'),
  expired: msg('This invitation has expired. Ask your administrator for a new link.'),
} as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await lookupInvitation(token);
  const user = await getCurrentUser();
  const here = `/invite/${token}`;
  const { t } = await getT();

  if (inv.state !== 'valid') {
    return (
      <AuthShell title={t('Invitation unavailable.')}>
        <div className="space-y-4">
          <Notice tone="danger">{t(MESSAGES[inv.state])}</Notice>
          <Link href={user ? '/app' : '/login'} className="link text-[14px]">{user ? t('Go to your workspace') : t('Sign in')}</Link>
        </div>
      </AuthShell>
    );
  }

  const mismatch = user && user.email.toLowerCase() !== inv.email.toLowerCase();
  return (
    <AuthShell title={t('Join {org}.', { org: inv.orgName })} subtitle={<>{t('You have been invited as')} <strong className="font-semibold">{inv.roles.map((r) => t(ROLE_LABELS[r])).join(t(', '))}</strong>.</>}>
      <div className="space-y-5">
        <div className="rounded-md border border-line bg-mist p-4 text-[14px]">
          <p className="text-ink-muted">{t('Invitation for')}</p>
          <p className="font-semibold"><Ltr>{inv.email}</Ltr></p>
        </div>
        {!user && (
          <div className="grid gap-2">
            <LinkButton href={`/signup?next=${encodeURIComponent(here)}&email=${encodeURIComponent(inv.email)}`} size="lg" arrow>
              {t('Create an account to accept')}
            </LinkButton>
            <LinkButton href={`/login?next=${encodeURIComponent(here)}`} size="lg" variant="secondary">
              {t('I already have an account')}
            </LinkButton>
          </div>
        )}
        {user && mismatch && (
          <div className="space-y-3">
            <Notice tone="review" title={t('Signed in with a different email')}>
              {t('You are signed in as')} <Ltr>{user.email}</Ltr>. {t('This invitation can only be accepted by')} <Ltr>{inv.email}</Ltr>.
            </Notice>
            <LogoutButton redirectTo={`/login?next=${encodeURIComponent(here)}`} label={t('Sign out and switch account')} />
          </div>
        )}
        {user && !mismatch && <AcceptInvite token={token} />}
      </div>
    </AuthShell>
  );
}

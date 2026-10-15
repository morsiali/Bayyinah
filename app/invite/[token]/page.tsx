import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/shell';
import { AcceptInvite } from '@/components/auth/accept-invite';
import { LinkButton, Notice, Ltr } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { lookupInvitation } from '@/lib/services/orgs';
import { ROLE_LABELS } from '@/lib/constants';
import { LogoutButton } from '@/components/app/logout-button';

export const metadata: Metadata = { title: 'Invitation' };

const MESSAGES = {
  invalid: 'This invitation link is not valid. Check that you copied the whole link.',
  revoked: 'This invitation was withdrawn by an administrator.',
  used: 'This invitation has already been used. If it was you, simply sign in.',
  expired: 'This invitation has expired. Ask your administrator for a new link.',
} as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await lookupInvitation(token);
  const user = await getCurrentUser();
  const here = `/invite/${token}`;

  if (inv.state !== 'valid') {
    return (
      <AuthShell title="Invitation unavailable.">
        <div className="space-y-4">
          <Notice tone="danger">{MESSAGES[inv.state]}</Notice>
          <Link href={user ? '/app' : '/login'} className="link text-[14px]">{user ? 'Go to your workspace' : 'Sign in'}</Link>
        </div>
      </AuthShell>
    );
  }

  const mismatch = user && user.email.toLowerCase() !== inv.email.toLowerCase();
  return (
    <AuthShell title={`Join ${inv.orgName}.`} subtitle={<>You have been invited as <strong className="text-ink">{inv.roles.map((r) => ROLE_LABELS[r]).join(', ')}</strong>.</>}>
      <div className="space-y-5">
        <div className="rounded-xl border border-line bg-zinc-50 p-4 text-[14px]">
          <p className="text-ink-muted">Invitation for</p>
          <p className="font-semibold"><Ltr>{inv.email}</Ltr></p>
        </div>
        {!user && (
          <div className="grid gap-2">
            <LinkButton href={`/signup?next=${encodeURIComponent(here)}&email=${encodeURIComponent(inv.email)}`} size="lg" arrow>
              Create an account to accept
            </LinkButton>
            <LinkButton href={`/login?next=${encodeURIComponent(here)}`} size="lg" variant="secondary">
              I already have an account
            </LinkButton>
          </div>
        )}
        {user && mismatch && (
          <div className="space-y-3">
            <Notice tone="review" title="Signed in with a different email">
              You are signed in as <Ltr>{user.email}</Ltr>. This invitation can only be accepted by <Ltr>{inv.email}</Ltr>.
            </Notice>
            <LogoutButton redirectTo={`/login?next=${encodeURIComponent(here)}`} label="Sign out and switch account" />
          </div>
        )}
        {user && !mismatch && <AcceptInvite token={token} />}
      </div>
    </AuthShell>
  );
}

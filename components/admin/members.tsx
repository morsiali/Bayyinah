'use client';
import { useState } from 'react';
import { KeyRound, Link2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Field, Notice, Ltr, cx } from '@/components/ui';
import { useAction } from '@/components/app/use-action';
import { ROLES, ROLE_LABELS, type Role } from '@/lib/constants';
import { useI18n } from '@/components/i18n';
import { msg, type T } from '@/lib/i18n/core';

type Member = { id: string; name: string; email: string; roles: Role[]; isMe: boolean; since: string };
type Invite = { id: string; email: string; roles: Role[]; expiresAt: string };

async function copy(text: string, what: string, t: T) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t('{what} copied', { what: t(what) }));
  } catch {
    toast.message(t(what), { description: text, duration: 20000 });
  }
}

function RolePicker({ value, onChange, idp }: { value: Role[]; onChange: (r: Role[]) => void; idp: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('Roles')}>
      {ROLES.map((r) => {
        const on = value.includes(r);
        return (
          <label key={r} htmlFor={`${idp}-${r}`} className={cx('flex cursor-pointer items-center gap-2 border px-3 py-1.5 text-[13px] font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2', on ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink-soft')}>
            <input id={`${idp}-${r}`} type="checkbox" className="sr-only" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== r) : [...value, r])} />
            {t(ROLE_LABELS[r])}
          </label>
        );
      })}
    </div>
  );
}

export function MembersAdmin({ orgId, members, invites }: { orgId: string; members: Member[]; invites: Invite[] }) {
  const { run, pending } = useAction();
  const { t, date } = useI18n();
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<Role[]>(['PREPARER']);
  const [lastLink, setLastLink] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="card p-6">
        <h2 className="t-sub text-[19px]">{t('Members')}</h2>
        <p className="mt-1 text-[13px] text-ink-muted">{t('A person can hold several roles. Creators can never review their own cases. The last organization admin can’t be removed or demoted.')}</p>
        <ul className="mt-5 divide-y divide-line">
          {members.map((m) => (
            <MemberRow key={m.id} m={m} orgId={orgId} />
          ))}
        </ul>
      </section>
      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">{t('Invite a member')}</h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await run<{ link: string; path: string }>('inv', `/api/orgs/${orgId}/invitations`, { body: { email, roles }, success: msg('Invitation link created') });
              if (r) {
                const link = `${window.location.origin}${r.path}`;
                setLastLink(link);
                setEmail('');
                copy(link, msg('Invitation link'), t);
              }
            }}
          >
            <Field label={t('Email address')} htmlFor="inv-email" hint={t('Only this person can accept, after signing in with this email.')}>
              <input id="inv-email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
            </Field>
            <div>
              <p className="mb-2 text-[14px] font-semibold">{t('Roles')}</p>
              <RolePicker value={roles} onChange={setRoles} idp="inv" />
            </div>
            <Button type="submit" loading={pending === 'inv'} disabled={!roles.length}>
              <UserPlus className="h-4 w-4" aria-hidden /> {t('Create invitation link')}
            </Button>
          </form>
          {lastLink && (
            <Notice tone="info" className="mt-4" title={t('Share this single-use link')}>
              <span className="block break-all font-mono text-[12px]" dir="ltr">{lastLink}</span>
              <button className="link mt-1 text-[13px]" onClick={() => copy(lastLink, msg('Invitation link'), t)}>{t('Copy again')}</button>
              <span className="mt-1 block text-[12.5px]">{t('It is shown only now. Send it through your usual channel; Bayyinah does not send emails.')}</span>
            </Notice>
          )}
        </section>
        <section className="card p-6">
          <h2 className="t-sub text-[19px]">{t('Pending invitations')}</h2>
          {invites.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-muted">{t('None.')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                  <span className="min-w-0">
                    <Ltr className="block truncate font-semibold">{i.email}</Ltr>
                    <span className="block text-[12.5px] text-ink-muted">{i.roles.map((r) => t(ROLE_LABELS[r])).join(t(', '))} · {t('expires {date}', { date: date(i.expiresAt, { dateStyle: 'medium' }) })}</span>
                  </span>
                  <Button size="sm" variant="ghost" loading={pending === `rv-${i.id}`} onClick={() => run(`rv-${i.id}`, `/api/orgs/${orgId}/invitations/${i.id}`, { method: 'DELETE', success: msg('Invitation revoked') })}>{t('Revoke')}</Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12.5px] text-ink-muted">{t('Lost a link? Create a new invitation for the same email — the old one is revoked automatically.')}</p>
        </section>
      </div>
    </div>
  );
}

function MemberRow({ m, orgId }: { m: Member; orgId: string }) {
  const { run, pending } = useAction();
  const { t, date } = useI18n();
  const [roles, setRoles] = useState<Role[]>(m.roles);
  const [confirm, setConfirm] = useState(false);
  const dirty = roles.slice().sort().join() !== m.roles.slice().sort().join();
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">{m.name}{m.isMe && <span className="ms-2 rounded-sm bg-mist px-1.5 text-[11px] font-bold text-ink-muted">{t('You')}</span>}</p>
          <p className="text-[13px] text-ink-muted"><Ltr>{m.email}</Ltr> · {t('member since {date}', { date: date(m.since, { dateStyle: 'medium' }) })}</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" loading={pending === 'pw'} onClick={async () => { const r = await run<{ path: string }>('pw', `/api/orgs/${orgId}/members/${m.id}/reset-link`, { refresh: false }); if (r) copy(`${window.location.origin}${r.path}`, msg('Password reset link (valid 60 minutes)'), t); }} aria-label={t('Create password reset link for {name}', { name: m.name })}>
            <KeyRound className="h-4 w-4" aria-hidden /> {t('Reset link')}
          </Button>
          {!confirm ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirm(true)} aria-label={t('Remove {name}', { name: m.name })}><Trash2 className="h-4 w-4" aria-hidden /></Button>
          ) : (
            <span className="flex items-center gap-1 border border-red-200 bg-red-50 px-2 py-0.5 text-[12.5px]">
              {t('Remove?')}
              <Button size="sm" variant="danger" loading={pending === 'rm'} onClick={() => run('rm', `/api/orgs/${orgId}/members/${m.id}`, { method: 'DELETE', success: msg('Member removed') }).then(() => setConfirm(false))}>{t('Yes')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>{t('No')}</Button>
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <RolePicker value={roles} onChange={setRoles} idp={`m-${m.id}`} />
        {dirty && (
          <Button size="sm" loading={pending === 'roles'} disabled={!roles.length} onClick={async () => { const r = await run('roles', `/api/orgs/${orgId}/members/${m.id}`, { method: 'PATCH', body: { roles }, success: msg('Roles updated') }); if (!r) setRoles(m.roles); }}>
            <Link2 className="h-3.5 w-3.5" aria-hidden /> {t('Save roles')}
          </Button>
        )}
      </div>
    </li>
  );
}



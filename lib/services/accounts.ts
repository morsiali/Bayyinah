import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { hashPassword, passwordProblems, verifyPassword } from '@/lib/auth/password';
import { hashToken, newToken } from '@/lib/tokens';
import { requireRole, type Actor } from './access';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().max(200),
});

/** Public registration creates a plain user. It can never grant platform administration. */
export async function registerUser(input: z.input<typeof registerSchema>) {
  const d = registerSchema.parse(input);
  const problem = passwordProblems(d.password);
  if (problem) throw new AppError('VALIDATION', problem);
  if (await prisma.user.findUnique({ where: { email: d.email } })) throw new AppError('CONFLICT', 'An account with this email already exists. Sign in instead.');
  return prisma.user.create({ data: { name: d.name, email: d.email, passwordHash: await hashPassword(d.password) }, select: { id: true, email: true, name: true, sessionVersion: true } });
}

// Simple in-memory throttle (per process). Good enough for a single-instance pilot; see docs for multi-instance.
const attempts = new Map<string, { n: number; until: number }>();
export function checkLoginThrottle(key: string) {
  const a = attempts.get(key);
  if (a && a.n >= 8 && a.until > Date.now()) throw new AppError('RATE_LIMITED', 'Too many sign-in attempts. Wait 15 minutes and try again.');
}
function noteFailure(key: string) {
  const a = attempts.get(key);
  const now = Date.now();
  if (!a || a.until < now) attempts.set(key, { n: 1, until: now + 15 * 60_000 });
  else a.n++;
}

let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword('timing-equalizer-not-a-password-1'));

export async function authenticate(emailRaw: string, password: string) {
  const email = (emailRaw || '').trim().toLowerCase();
  checkLoginThrottle(email);
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await verifyPassword(password || '', user.passwordHash) : (await verifyPassword(password || '', await dummyHash()), false); // equalize timing
  if (!user || !ok) {
    noteFailure(email);
    throw new AppError('UNAUTHENTICATED', 'Email or password is incorrect.');
  }
  attempts.delete(email);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return user;
}

const RESET_TTL_MS = 60 * 60_000;

/**
 * Self-service request. There is no email integration in this version: the link is written to the
 * server log for the operator, and organization admins can issue links from the Members page.
 * The response never reveals whether the email exists.
 */
export async function requestPasswordReset(emailRaw: string) {
  const email = (emailRaw || '').trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  const { token, hash } = newToken();
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
  console.info(`[password-reset] Link for ${email.replace(/(.).+(@.+)/, '$1***$2')}: ${env.appUrl()}/reset-password/${token} (valid 60 minutes)`);
}

export async function adminIssueReset(actor: Actor, orgId: string, membershipId: string) {
  await requireRole(actor, orgId, 'ORG_ADMIN');
  const m = await prisma.membership.findFirst({ where: { id: membershipId, orgId, isActive: true }, include: { user: true } });
  if (!m) throw notFound('Member');
  const { token, hash } = newToken();
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.create({ data: { userId: m.userId, tokenHash: hash, issuedBy: actor.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
    await audit({ orgId, actor, action: 'member.password_reset_issued', entityType: 'membership', entityId: m.id }, tx);
  });
  return { link: `${env.appUrl()}/reset-password/${token}`, path: `/reset-password/${token}` };
}

export async function resetTokenState(token: string) {
  const t = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!t || t.usedAt || t.expiresAt < new Date()) return 'invalid' as const;
  return 'valid' as const;
}

/** Sets a new password, consumes the token and revokes every existing session. */
export async function resetPassword(token: string, password: string) {
  const problem = passwordProblems(password || '');
  if (problem) throw new AppError('VALIDATION', problem);
  const t = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!t || t.usedAt || t.expiresAt < new Date()) throw new AppError('BLOCKED', 'This reset link is invalid or has expired. Request a new one.');
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({ where: { id: t.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw new AppError('BLOCKED', 'This reset link has already been used.');
    await tx.passwordResetToken.updateMany({ where: { userId: t.userId, usedAt: null }, data: { usedAt: new Date() } });
    return tx.user.update({ where: { id: t.userId }, data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } }, select: { id: true, sessionVersion: true, email: true } });
  });
}

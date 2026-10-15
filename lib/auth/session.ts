import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from './jwt';

export type CurrentUser = { id: string; name: string; email: string; isPlatformAdmin: boolean };

export async function startSession(user: { id: string; sessionVersion: number }) {
  const token = await signSession({ sub: user.id, sv: user.sessionVersion });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.secureCookies(),
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Resolves the signed-in user, re-checking the database so revoked sessions stop working. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, name: true, email: true, sessionVersion: true, platformAdmin: { select: { isActive: true } } },
  });
  if (!user || user.sessionVersion !== claims.sv) return null;
  return { id: user.id, name: user.name, email: user.email, isPlatformAdmin: !!user.platformAdmin?.isActive };
}

/** For API routes: throws a 401 AppError. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new AppError('UNAUTHENTICATED', 'Please sign in to continue.');
  return u;
}

/** For pages: redirects to sign-in, preserving the return path. */
export async function requirePageUser(nextPath: string): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return u;
}

// Edge-safe session token helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'bayyinah_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type SessionClaims = { sub: string; sv: number };

function key() {
  const s = process.env.AUTH_SECRET;
  const secret = s && s.length >= 32 ? s : 'insecure-development-secret-change-me-please';
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ sv: claims.sv })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string') return null;
    return { sub: payload.sub, sv: Number(payload.sv ?? 0) };
  } catch {
    return null;
  }
}

import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'clubdee_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface SessionClaims {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

let warned = false;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is not set');
  if (!warned) {
    warned = true;
    console.warn('[auth] AUTH_SECRET is not set; using an insecure development secret.');
  }
  return 'clubdee-development-secret';
}

const b64 = (input: Buffer | string) => Buffer.from(input).toString('base64url');

function signature(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

/** Compact HS256 JWT. */
export function signSession(userId: string, email: string): { token: string; claims: SessionClaims } {
  const iat = Math.floor(Date.now() / 1000);
  const claims: SessionClaims = { sub: userId, email, iat, exp: iat + SESSION_TTL_SECONDS };
  const data = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(JSON.stringify(claims))}`;
  return { token: `${data}.${signature(data)}`, claims };
}

export function verifySession(token: string | undefined | null): SessionClaims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = Buffer.from(signature(`${parts[0]}.${parts[1]}`));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as SessionClaims;
    if (!claims.sub || claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

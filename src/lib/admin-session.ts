import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminDatabaseClient } from '@/lib/supabase/admin';
import { rateLimitKey, signAdminSessionId, verifyAdminSessionToken } from '@/lib/admin-crypto';

export const ADMIN_COOKIE = 'brass_admin_session';
const SESSION_SECONDS = 60 * 60 * 8;

function sessionSecret(): string {
  const secret = process.env.BRASS_ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32 || secret.startsWith('replace-')) {
    throw new Error('BRASS_ADMIN_SESSION_SECRET must contain at least 32 random bytes.');
  }
  return secret;
}

export function adminCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/admin', maxAge: SESSION_SECONDS };
}

export async function consumeRateLimit(scope: string, value: string, maximum: number, windowSeconds: number): Promise<boolean> {
  const key = rateLimitKey(scope, value, sessionSecret());
  const { data, error } = await adminDatabaseClient().rpc('consume_auth_rate_limit', {
    p_rate_key: key, p_max_attempts: maximum, p_window_seconds: windowSeconds,
  });
  if (error) throw new Error('Rate limiter unavailable.');
  return data === true;
}

export async function requestIpKey(): Promise<string> {
  const requestHeaders = await headers();
  const value = requestHeaders.get('x-real-ip') ?? requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  return value?.slice(0, 128) || 'unknown';
}

export async function createAdminSessionCookie(): Promise<string> {
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  const { data, error } = await adminDatabaseClient().rpc('create_admin_session', { p_expires_at: expires });
  if (error || !data) throw new Error('Could not create administrator session.');
  return signAdminSessionId(data, sessionSecret());
}

export async function revokeAdminSessionToken(token: string | undefined): Promise<void> {
  const id = verifyAdminSessionToken(token, sessionSecret());
  if (!id) return;
  const { error } = await adminDatabaseClient().rpc('revoke_admin_session', { p_session_id: id });
  if (error) throw new Error('Administrator session revocation failed.');
}

export async function adminSessionIsValid(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const id = verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE)?.value, sessionSecret());
    if (!id) return false;
    const { data, error } = await adminDatabaseClient().rpc('validate_admin_session', { p_session_id: id });
    return !error && data === true && Boolean(process.env.BRASS_ADMIN_EMAIL?.trim());
  } catch { return false; }
}

export async function requireAdmin(): Promise<{ email: string }> {
  const email = process.env.BRASS_ADMIN_EMAIL?.trim().toLowerCase();
  let id: string | null = null;
  try {
    const cookieStore = await cookies();
    id = verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE)?.value, sessionSecret());
    if (id) {
      const { data, error } = await adminDatabaseClient().rpc('validate_admin_session', { p_session_id: id });
      if (error || data !== true) id = null;
    }
  } catch { id = null; }
  if (!email || !id) redirect('/admin/login');
  return { email };
}

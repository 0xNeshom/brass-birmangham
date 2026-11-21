'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminDatabaseClient } from '@/lib/supabase/admin';
import { ADMIN_COOKIE, adminCookieOptions, consumeRateLimit, createAdminSessionCookie, requestIpKey, requireAdmin, revokeAdminSessionToken } from '@/lib/admin-session';
import { verifyAdminPassword } from '@/lib/admin-crypto';
import { normalizeEmail } from '@/features/auth/registration';

export type AdminLoginState = { message: string };

export async function loginAdmin(_previous: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  if (email.length > 254 || password.length > 1024) return { message: 'Unable to sign in.' };
  try {
    const expectedEmail = process.env.BRASS_ADMIN_EMAIL;
    const hash = process.env.BRASS_ADMIN_PASSWORD_HASH;
    const ip = await requestIpKey();
    const [ipAllowed, emailAllowed] = await Promise.all([
      consumeRateLimit('admin-login-ip', ip, 10, 900),
      consumeRateLimit('admin-login-email', email || 'missing', 8, 900),
    ]);
    if (!ipAllowed || !emailAllowed) return { message: 'Unable to sign in.' };
    const passwordMatches = hash ? await verifyAdminPassword(password, hash) : false;
    if (!expectedEmail || !hash || email !== normalizeEmail(expectedEmail) || !passwordMatches) {
      return { message: 'Unable to sign in.' };
    }
    const token = await createAdminSessionCookie();
    const jar = await cookies();
    jar.set(ADMIN_COOKIE, token, adminCookieOptions());
    redirect('/admin/members');
  } catch (error) {
    unstable_rethrow(error);
    return { message: 'Administrator sign-in is temporarily unavailable.' };
  }
}

export async function logoutAdmin() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  await revokeAdminSessionToken(token);
  jar.set(ADMIN_COOKIE, '', { ...adminCookieOptions(), maxAge: 0 });
  redirect('/admin/login');
}

export async function approveEmail(formData: FormData) {
  const { email: actor } = await requireAdmin();
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) redirect('/admin/members?error=invalid');
  const { error } = await adminDatabaseClient().rpc('admin_approve_email', { p_email: email, p_actor: actor });
  if (error) redirect('/admin/members?error=unavailable');
  revalidatePath('/admin/members');
  redirect('/admin/members?updated=1');
}

export async function revokeEmail(formData: FormData) {
  const { email: actor } = await requireAdmin();
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) redirect('/admin/members?error=invalid');
  const { error } = await adminDatabaseClient().rpc('admin_revoke_email', { p_email: email, p_actor: actor });
  if (error) redirect('/admin/members?error=unavailable');
  revalidatePath('/admin/members');
  redirect('/admin/members?updated=1');
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminDatabaseClient } from '@/lib/supabase/admin';
import { ADMIN_COOKIE, adminCookieOptions, consumeRateLimit, createAdminSessionCookie, requestIpKey, requireAdmin, revokeAdminSessionToken } from '@/lib/admin-session';
import { verifyAdminPassword } from '@/lib/admin-crypto';
import { normalizeEmail } from '@/features/auth/registration';
import { generateLeagueCode, hashLeagueCode } from '@/lib/league-invite';

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

export type LeagueCodeState = { code?: string; error?: string };
export type AdminTournamentState = { id?: string; code?: string; error?: string };

export async function createAdminTournamentInvite(_previous: AdminTournamentState, formData: FormData): Promise<AdminTournamentState> {
  const { email: actor } = await requireAdmin();
  const title = String(formData.get('title') ?? '').trim();
  if (!title || Array.from(title).length > 80) return { error: 'Tournament title must contain 1–80 characters.' };
  const code = generateLeagueCode();
  const { data: id, error } = await adminDatabaseClient().rpc('admin_create_league_tournament', {
    p_title: title, p_code_hash: hashLeagueCode(code), p_actor: actor,
  });
  if (error || !id) return { error: 'Could not create this tournament.' };
  revalidatePath('/admin/members');
  return { id, code };
}

export async function rotateTournamentInvite(tournamentId: string, _previous: LeagueCodeState): Promise<LeagueCodeState> {
  const { email: actor } = await requireAdmin();
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(tournamentId)) return { error: 'Invalid tournament.' };
  const code = generateLeagueCode();
  const { error } = await adminDatabaseClient().rpc('rotate_tournament_invite', {
    p_tournament_id: tournamentId, p_code_hash: hashLeagueCode(code), p_actor: actor,
  });
  if (error) return { error: 'Could not generate a tournament code.' };
  revalidatePath('/admin/members');
  return { code };
}

export async function revokeLeagueMember(formData: FormData) {
  const { email: actor } = await requireAdmin();
  const userId = String(formData.get('userId') ?? '');
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(userId)) redirect('/admin/members?error=invalid');
  const { error } = await adminDatabaseClient().rpc('admin_revoke_league_member', { p_user_id: userId, p_actor: actor });
  if (error) redirect('/admin/members?error=unavailable');
  revalidatePath('/admin/members');
  redirect('/admin/members?updated=1');
}

'use server';

import { redirect } from 'next/navigation';
import { validateRegistration } from './registration';
import { hashLeagueCode } from '@/lib/league-invite';
import { adminDatabaseClient } from '@/lib/supabase/admin';
import { serverClient } from '@/lib/supabase/server';
import { consumeRateLimit, requestIpKey } from '@/lib/admin-session';

export type RegistrationState = { message: string; created?: boolean };

export async function registerPlayer(_previous: RegistrationState, formData: FormData): Promise<RegistrationState> {
  let input;
  let tournamentId: string | null = null;
  try {
    input = validateRegistration({
      email: String(formData.get('email') ?? ''),
      displayName: String(formData.get('displayName') ?? ''),
      password: String(formData.get('password') ?? ''),
      passwordConfirmation: String(formData.get('passwordConfirmation') ?? ''),
      leagueCode: String(formData.get('leagueCode') ?? ''),
    });
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'Check the registration details.' };
  }

  try {
    const ip = await requestIpKey();
    const [ipAllowed, emailAllowed] = await Promise.all([
      consumeRateLimit('register-ip', ip, 10, 900),
      consumeRateLimit('register-email', input.emailNormalized, 4, 3600),
    ]);
    if (!ipAllowed || !emailAllowed) return { message: 'Registration is temporarily unavailable. Try again later.' };

    const admin = adminDatabaseClient();
    const { data: invites, error: lookupError } = await admin.rpc('lookup_tournament_invite', {
      p_code_hash: hashLeagueCode(input.leagueCode),
    });
    if (lookupError) throw lookupError;
    const rejected = { message: 'Could not register. Check the tournament code and account details, or sign in if you already have an account.' };
    const invite = invites?.[0];
    if (!invite) return rejected;
    tournamentId = invite.tournament_id;

    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: { brass_tournament_invite_id: invite.invite_id },
      user_metadata: { display_name: input.displayName },
    });
    if (error || !data.user) return rejected;
  } catch {
    return { message: 'Registration is temporarily unavailable. Try again later.' };
  }

  const signInManually = { message: 'Your account is ready. Sign in with the email and password you just chose.', created: true };
  try {
    const client = await serverClient();
    const { error } = await client.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) return signInManually;
  } catch {
    return signInManually;
  }
  if (!tournamentId) return signInManually;
  redirect(`/tournaments/${tournamentId}`);
}

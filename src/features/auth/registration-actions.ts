'use server';

import { validateRegistration } from './registration';
import { adminDatabaseClient } from '@/lib/supabase/admin';
import { serverClient } from '@/lib/supabase/server';
import { consumeRateLimit, requestIpKey } from '@/lib/admin-session';

export type RegistrationState = { message: string; sent?: boolean };

export async function registerPlayer(_previous: RegistrationState, formData: FormData): Promise<RegistrationState> {
  let input;
  try {
    input = validateRegistration({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      passwordConfirmation: String(formData.get('passwordConfirmation') ?? ''),
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
    const { data: approval, error: approvalError } = await admin
      .from('allowed_emails')
      .select('status')
      .eq('email_normalized', input.emailNormalized)
      .maybeSingle();
    if (approvalError) throw approvalError;
    const response = { message: 'If this address is approved, a verification email will be sent shortly.', sent: true };
    if (!approval || !['approved', 'pending_verification'].includes(approval.status)) return response;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
    if (!siteUrl) throw new Error('Registration redirects are not configured.');
    const client = await serverClient();
    const { error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard` },
    });
    // Keep existing-account and provider errors indistinguishable from success.
    void error;
    return response;
  } catch {
    return { message: 'Registration is temporarily unavailable. Try again later.' };
  }
}

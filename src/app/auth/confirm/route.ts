import { NextResponse } from 'next/server';
import { authDestination, confirmationType } from '@/features/auth/redirects';
import { isConfigured } from '@/lib/supabase/config';
import { serverClient } from '@/lib/supabase/server';
import { siteOrigin } from '@/lib/site-url';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const type = confirmationType(url.searchParams.get('type'));
  let destination: string = '/login?error=link';
  if (isConfigured() && token_hash && type) {
    try {
      const client = await serverClient();
      const { error } = await client.auth.verifyOtp({ token_hash, type });
      if (!error) destination = type === 'invite' || type === 'recovery' ? '/auth/password' : authDestination(url.searchParams.get('next'));
    } catch { /* Never expose token or provider errors. */ }
  }
  const response = NextResponse.redirect(new URL(destination, siteOrigin(request.url)));
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

import { NextResponse } from 'next/server';
import { authDestination } from '@/features/auth/redirects';
import { isConfigured } from '@/lib/supabase/config';
import { serverClient } from '@/lib/supabase/server';
import { siteOrigin } from '@/lib/site-url';

export async function GET(request: Request) {
  const url = new URL(request.url);
  let destination: string = '/login?error=link';
  const code = url.searchParams.get('code');
  if (isConfigured() && code) {
    try {
      const client = await serverClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) destination = authDestination(url.searchParams.get('next'));
    } catch { /* Invalid or unavailable auth links always return to sign in. */ }
  }
  const response = NextResponse.redirect(new URL(destination, siteOrigin(request.url)));
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

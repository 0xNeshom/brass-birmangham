import { NextResponse } from 'next/server';
import { isConfigured } from '@/lib/supabase/config';
import { serverClient } from '@/lib/supabase/server';
import { siteOrigin } from '@/lib/site-url';

export async function POST(request: Request) {
  const origin = siteOrigin(request.url);
  if (request.headers.get('origin') !== origin) return new Response('Request origin could not be verified.', { status: 403 });
  if (isConfigured()) {
    try {
      const { error } = await (await serverClient()).auth.signOut();
      if (error) return new Response('Unable to sign out. Please try again.', { status: 503 });
    } catch { return new Response('Unable to sign out. Please try again.', { status: 503 }); }
  }
  return NextResponse.redirect(new URL('/login', origin), 303);
}

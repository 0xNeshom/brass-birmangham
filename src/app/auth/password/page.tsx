import { redirect } from 'next/navigation';
import { ConfigurationRequired } from '@/components/configuration-required';
import { AuthFrame } from '@/features/auth/auth-frame';
import { PasswordForm } from '@/features/auth/password-form';
import { isConfigured } from '@/lib/supabase/config';
import { serverClient } from '@/lib/supabase/server';

export default async function PasswordPage() {
  if (!isConfigured()) return <ConfigurationRequired />;
  const client = await serverClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect('/login?error=link');
  return <AuthFrame><PasswordForm /></AuthFrame>;
}

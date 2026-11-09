import { ConfigurationRequired } from '@/components/configuration-required';
import { AuthFrame } from '@/features/auth/auth-frame';
import { LoginForm } from '@/features/auth/login-form';
import { isConfigured } from '@/lib/supabase/config';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!isConfigured()) return <ConfigurationRequired />;
  const { error } = await searchParams;
  return <AuthFrame><LoginForm linkError={error === 'link'} /></AuthFrame>;
}

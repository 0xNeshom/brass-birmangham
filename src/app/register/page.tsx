import Link from 'next/link';
import { ConfigurationRequired } from '@/components/configuration-required';
import { AuthFrame } from '@/features/auth/auth-frame';
import { RegistrationForm } from '@/features/auth/registration-form';
import { isConfigured } from '@/lib/supabase/config';

export default async function RegisterPage() {
  if (!isConfigured()) return <ConfigurationRequired />;
  return <AuthFrame><RegistrationForm /><Link href="/login">Return to sign in</Link></AuthFrame>;
}

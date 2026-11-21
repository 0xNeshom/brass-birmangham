import { redirect } from 'next/navigation';
import { AuthFrame } from '@/features/auth/auth-frame';
import { AdminLoginForm } from '@/features/admin/login-form';
import { adminSessionIsValid } from '@/lib/admin-session';
import { isConfigured } from '@/lib/supabase/config';
import { ConfigurationRequired } from '@/components/configuration-required';

export default async function AdminLoginPage() {
  if (!isConfigured()) return <ConfigurationRequired />;
  if (await adminSessionIsValid()) redirect('/admin/members');
  return <AuthFrame><AdminLoginForm /></AuthFrame>;
}

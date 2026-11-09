import { ConfigurationRequired } from '@/components/configuration-required';
import { AuthFrame } from '@/features/auth/auth-frame';
import { LoginForm } from '@/features/auth/login-form';
import { isConfigured } from '@/lib/supabase/config';

export default function RecoveryPage() {
  if (!isConfigured()) return <ConfigurationRequired />;
  return <AuthFrame><LoginForm recovery /></AuthFrame>;
}

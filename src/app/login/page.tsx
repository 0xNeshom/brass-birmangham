import { Suspense } from 'react';
import { ConfigurationRequired } from '@/components/configuration-required';
import { AuthFrame } from '@/features/auth/auth-frame';
import { LoginForm } from '@/features/auth/login-form';
import { isConfigured } from '@/lib/supabase/config';

type LoginSearchParams = Promise<{ error?: string }>;

async function LoginLinkError({ searchParams }: { searchParams: LoginSearchParams }) {
  const { error } = await searchParams;
  return error === 'link' ? (
    <p className="error-message" role="alert">
      This access link has expired or could not be verified. Request a new recovery link or contact your league administrator.
    </p>
  ) : null;
}

export default function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  if (!isConfigured()) return <ConfigurationRequired />;
  return (
    <AuthFrame variant="sign-in">
      <LoginForm notice={<Suspense fallback={null}><LoginLinkError searchParams={searchParams} /></Suspense>} />
    </AuthFrame>
  );
}

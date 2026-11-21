/** Only application-owned destinations may follow an authentication link. */
export function authDestination(next: string | null): '/' | '/dashboard' | '/auth/password' {
  if (next === '/auth/password') return '/auth/password';
  return next === '/dashboard' ? '/dashboard' : '/';
}

export function confirmationType(value: string | null): 'signup' | 'invite' | 'recovery' | 'email' | null {
  return value === 'signup' || value === 'invite' || value === 'recovery' || value === 'email' ? value : null;
}

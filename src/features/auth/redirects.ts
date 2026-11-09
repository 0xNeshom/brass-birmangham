/** Only application-owned destinations may follow an authentication link. */
export function authDestination(next: string | null): '/' | '/auth/password' {
  return next === '/auth/password' ? '/auth/password' : '/';
}

export function confirmationType(value: string | null): 'invite' | 'recovery' | 'email' | null {
  return value === 'invite' || value === 'recovery' || value === 'email' ? value : null;
}

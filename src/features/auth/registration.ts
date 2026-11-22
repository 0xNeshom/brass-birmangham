import { nameKey } from '@/domain/name-key';

export interface RegistrationInput { email: string; displayName: string; password: string; passwordConfirmation: string; leagueCode: string }
export interface ValidRegistration { email: string; emailNormalized: string; displayName: string; password: string; leagueCode: string }

export function normalizeEmail(email: string): string {
  return nameKey(email.trim());
}

export function validateRegistration(input: RegistrationInput): ValidRegistration {
  if (typeof input.email !== 'string' || input.email.length > 254) throw new Error('Enter a valid email address.');
  const email = input.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (typeof input.displayName !== 'string') throw new Error('Enter a display name.');
  const displayName = input.displayName.trim();
  if (!displayName || Array.from(displayName).length > 40) throw new Error('Display name must contain between 1 and 40 characters.');
  if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 1024) {
    throw new Error('Choose a password with at least 12 characters.');
  }
  if (input.password !== input.passwordConfirmation) throw new Error('The passwords do not match.');
  const leagueCode = input.leagueCode.trim();
  if (!/^[A-Za-z0-9_-]{32}$/.test(leagueCode)) throw new Error('Enter a valid tournament code.');
  return { email, emailNormalized: normalizeEmail(email), displayName, password: input.password, leagueCode };
}

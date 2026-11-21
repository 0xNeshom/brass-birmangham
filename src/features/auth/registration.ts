import { nameKey } from '@/domain/name-key';

export interface RegistrationInput { email: string; password: string; passwordConfirmation: string }
export interface ValidRegistration { email: string; emailNormalized: string; password: string }

export function normalizeEmail(email: string): string {
  return nameKey(email.trim());
}

export function validateRegistration(input: RegistrationInput): ValidRegistration {
  if (typeof input.email !== 'string' || input.email.length > 254) throw new Error('Enter a valid email address.');
  const email = input.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 1024) {
    throw new Error('Choose a password with at least 12 characters.');
  }
  if (input.password !== input.passwordConfirmation) throw new Error('The passwords do not match.');
  return { email, emailNormalized: normalizeEmail(email), password: input.password };
}

import { describe, expect, it } from 'vitest';
import { normalizeEmail, validateRegistration } from './registration';

describe('approved player registration validation', () => {
  it('normalizes email consistently and preserves the chosen password', () => {
    expect(normalizeEmail('  Player@Example.com ')).toBe('player@example.com');
    expect(validateRegistration({ email: ' Player@Example.com ', password: 'correct-horse-battery', passwordConfirmation: 'correct-horse-battery' })).toEqual({
      email: 'Player@Example.com', emailNormalized: 'player@example.com', password: 'correct-horse-battery',
    });
  });
  it.each([
    { email: 'not-email', password: 'correct-horse-battery', passwordConfirmation: 'correct-horse-battery' },
    { email: 'player@example.com', password: 'short', passwordConfirmation: 'short' },
    { email: 'player@example.com', password: 'correct-horse-battery', passwordConfirmation: 'different-password' },
  ])('rejects malformed registration fields', (input) => expect(() => validateRegistration(input)).toThrow());
});

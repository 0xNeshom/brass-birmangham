import { describe, expect, it } from 'vitest';
import { normalizeEmail, validateRegistration } from './registration';

const code = 'A'.repeat(32);

describe('tournament code registration validation', () => {
  it('normalizes email consistently and preserves the chosen password', () => {
    expect(normalizeEmail('  Player@Example.com ')).toBe('player@example.com');
    expect(validateRegistration({ email: ' Player@Example.com ', displayName: ' Player One ', password: 'correct-horse-battery', passwordConfirmation: 'correct-horse-battery', leagueCode: code })).toEqual({
      email: 'Player@Example.com', emailNormalized: 'player@example.com', displayName: 'Player One', password: 'correct-horse-battery', leagueCode: code,
    });
  });
  it.each([
    { email: 'not-email', displayName: 'Player', password: 'correct-horse-battery', passwordConfirmation: 'correct-horse-battery', leagueCode: code },
    { email: 'player@example.com', displayName: 'Player', password: 'short', passwordConfirmation: 'short', leagueCode: code },
    { email: 'player@example.com', displayName: 'Player', password: 'correct-horse-battery', passwordConfirmation: 'different-password', leagueCode: code },
    { email: 'player@example.com', displayName: 'Player', password: 'correct-horse-battery', passwordConfirmation: 'correct-horse-battery', leagueCode: 'too-short' },
  ])('rejects malformed registration fields', (input) => expect(() => validateRegistration(input)).toThrow());
});

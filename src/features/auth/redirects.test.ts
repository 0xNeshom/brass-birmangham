import { describe, expect, it } from 'vitest';
import { authDestination, confirmationType } from './redirects';

describe('authentication link boundaries', () => {
  it('accepts only the password destination or the ledger', () => {
    expect(authDestination('/auth/password')).toBe('/auth/password');
    for (const next of [null, '/', '//evil.test', 'https://evil.test', '/\\evil.test', '/auth/password?next=https://evil.test', '/auth/password/../admin', '%2f%2fevil.test']) {
      expect(authDestination(next)).toBe('/');
    }
  });
  it('limits verification to supported email flows', () => {
    for (const type of ['invite', 'recovery', 'email']) expect(confirmationType(type)).toBe(type);
    for (const type of [null, 'signup', 'magiclink', 'email_change', 'INVITE']) expect(confirmationType(type)).toBeNull();
  });
});

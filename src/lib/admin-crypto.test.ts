import { describe, expect, it } from 'vitest';
import { makeAdminPasswordHash, rateLimitKey, signAdminSessionId, verifyAdminPassword, verifyAdminSessionToken } from './admin-crypto';

describe('administrator credential primitives', () => {
  it('stores and verifies a salted scrypt password hash', async () => {
    const hash = await makeAdminPasswordHash('a-strong-admin-password');
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(hash).not.toContain('a-strong-admin-password');
    expect(await verifyAdminPassword('a-strong-admin-password', hash)).toBe(true);
    expect(await verifyAdminPassword('wrong-password', hash)).toBe(false);
    expect(await verifyAdminPassword('anything', 'plaintext-password')).toBe(false);
  });
  it('signs a server-side session ID and rejects tampering', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const token = signAdminSessionId(id, 'a sufficiently long server-only session secret');
    expect(verifyAdminSessionToken(token, 'a sufficiently long server-only session secret')).toBe(id);
    expect(verifyAdminSessionToken(`${token}x`, 'a sufficiently long server-only session secret')).toBeNull();
    expect(verifyAdminSessionToken(token, 'a different server-only session secret')).toBeNull();
  });
  it('derives opaque, scoped rate-limit keys', () => {
    expect(rateLimitKey('admin', '127.0.0.1', 'server secret')).toMatch(/^[0-9a-f]{64}$/);
    expect(rateLimitKey('admin', '127.0.0.1', 'server secret')).toBe(rateLimitKey('admin', '127.0.0.1', 'server secret'));
    expect(rateLimitKey('register', '127.0.0.1', 'server secret')).not.toBe(rateLimitKey('admin', '127.0.0.1', 'server secret'));
  });
});

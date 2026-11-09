import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('@/lib/supabase/config', () => ({ isConfigured: () => true }));
vi.mock('@/lib/supabase/server', () => ({ serverClient: async () => ({ auth }) }));
import { GET as callback } from '@/app/auth/callback/route';
import { GET as confirm } from '@/app/auth/confirm/route';
import { POST as signout } from '@/app/auth/signout/route';
import { siteOrigin } from '@/lib/site-url';

beforeEach(() => {
  vi.resetAllMocks();
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

describe('authentication callbacks', () => {
  it('exchanges a code and ignores an external next URL', async () => {
    const response = await callback(new Request('https://league.test/auth/callback?code=private-code&next=https://evil.test'));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('private-code');
    expect(response.headers.get('location')).toBe('https://league.test/');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });
  it('preserves the password destination for PKCE recovery', async () => {
    const response = await callback(new Request('https://league.test/auth/callback?code=private-code&next=/auth/password'));
    expect(response.headers.get('location')).toBe('https://league.test/auth/password');
  });
  it('handles expired codes and provider failures without leaking details', async () => {
    auth.exchangeCodeForSession.mockRejectedValue(new Error('private-provider-message'));
    const response = await callback(new Request('https://league.test/auth/callback?code=private-code'));
    expect(response.headers.get('location')).toBe('https://league.test/login?error=link');
    expect(await response.text()).not.toContain('private');
  });
  it.each(['invite', 'recovery'])('ends %s verification at password setup', async (type) => {
    const response = await confirm(new Request(`https://league.test/auth/confirm?token_hash=private-hash&type=${type}&next=https://evil.test`));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'private-hash', type });
    expect(response.headers.get('location')).toBe('https://league.test/auth/password');
  });
  it('does not verify unsupported flows or missing codes', async () => {
    expect((await confirm(new Request('https://league.test/auth/confirm?token_hash=private&type=signup'))).headers.get('location')).toBe('https://league.test/login?error=link');
    await callback(new Request('https://league.test/auth/callback?next=/auth/password'));
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});

describe('sign out', () => {
  it.each([null, 'https://evil.test'])('rejects an unverified origin %s without clearing the session', async (origin) => {
    const response = await signout(new Request('https://league.test/auth/signout', { method: 'POST', headers: origin ? { origin } : {} }));
    expect(response.status).toBe(403);
    expect(auth.signOut).not.toHaveBeenCalled();
  });
  it('signs out same-origin requests and redirects with POST-safe 303', async () => {
    const response = await signout(new Request('https://league.test/auth/signout', { method: 'POST', headers: { origin: 'https://league.test' } }));
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://league.test/login');
  });
  it('reports sign-out failure instead of implying that the session was cleared', async () => {
    auth.signOut.mockResolvedValue({ error: new Error('private-provider-message') });
    const response = await signout(new Request('https://league.test/auth/signout', { method: 'POST', headers: { origin: 'https://league.test' } }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private');
  });
  it('accepts the browser origin when Next is bound to the wildcard local address', async () => {
    const response = await signout(new Request('http://0.0.0.0:3000/auth/signout', { method: 'POST', headers: { origin: 'http://localhost:3000' } }));
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
  });
});

describe('canonical site origin', () => {
  it('uses the configured public URL rather than the server bind address', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://league.example/path');
    expect(siteOrigin('http://0.0.0.0:3000/auth/callback')).toBe('https://league.example');
    vi.unstubAllEnvs();
  });
});

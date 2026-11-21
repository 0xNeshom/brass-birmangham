import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

function scrypt(password: string, salt: string, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password, salt, keyLength, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key as Buffer)));
}

export function signAdminSessionId(id: string, secret: string): string {
  return `${id}.${createHmac('sha256', secret).update(`brass-admin:v1:${id}`).digest('base64url')}`;
}

export function verifyAdminSessionToken(token: string | undefined, secret: string): string | null {
  if (!token) return null;
  const [id, supplied, extra] = token.split('.');
  if (extra !== undefined || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id ?? '') || !supplied) return null;
  const expected = createHmac('sha256', secret).update(`brass-admin:v1:${id}`).digest();
  let actual: Buffer;
  try { actual = Buffer.from(supplied, 'base64url'); } catch { return null; }
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? id : null;
}

export function rateLimitKey(scope: string, value: string, secret: string): string {
  return createHmac('sha256', secret).update(`brass-rate:v1:${scope}:${value}`).digest('hex');
}

export async function makeAdminPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt$16384$8$1$${salt}$${hash.toString('hex')}`;
}

export async function verifyAdminPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, n, r, p, salt, digest, extra] = encoded.split('$');
  if (scheme !== 'scrypt' || n !== '16384' || r !== '8' || p !== '1' || !/^[0-9a-f]{32}$/.test(salt ?? '') || !/^[0-9a-f]{128}$/.test(digest ?? '') || extra !== undefined) return false;
  const expected = Buffer.from(digest, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

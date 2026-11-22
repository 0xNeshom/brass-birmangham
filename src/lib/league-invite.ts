import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

export function generateLeagueCode(): string {
  return randomBytes(24).toString('base64url');
}

export function hashLeagueCode(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

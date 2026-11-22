import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/database.types';

export const LOCAL_PROJECT_ID = 'brass-invite-it';
export const LOCAL_API_URL = 'http://127.0.0.1:54351';
export const E2E_RUN_ID = (process.env.BRASS_E2E_RUN_ID ?? randomUUID()).replaceAll('-', '').slice(0, 12);
export const ADMIN_EMAIL = process.env.BRASS_ADMIN_EMAIL ?? '';
export const ADMIN_PASSWORD = process.env.BRASS_E2E_ADMIN_PASSWORD ?? '';
export const APP_ORIGIN = `http://localhost:${process.env.BRASS_E2E_PORT ?? '3000'}`;
export const e2eEnabled = process.env.BRASS_EXPECTED_LOCAL_PROJECT_ID === LOCAL_PROJECT_ID
  && process.env.TEST_SUPABASE_URL === LOCAL_API_URL
  && process.env.NEXT_PUBLIC_SUPABASE_URL === LOCAL_API_URL
  && Boolean(process.env.TEST_SUPABASE_SECRET_KEY && process.env.TEST_SUPABASE_PUBLISHABLE_KEY
    && process.env.BRASS_ALLOW_LOCAL_SERVICE_ROLE_TESTS === '1'
    && ADMIN_EMAIL && ADMIN_PASSWORD && process.env.BRASS_ADMIN_PASSWORD_HASH
    && process.env.BRASS_ADMIN_SESSION_SECRET);

function inspectLocalBinding(container: string, targetPort: string, hostPort: string): void {
  const project = execFileSync('docker', [
    'inspect', '--format', '{{index .Config.Labels "com.supabase.cli.project"}}', container,
  ], { encoding: 'utf8' }).trim();
  assert.equal(project, LOCAL_PROJECT_ID, 'Container must belong to the expected disposable Supabase project.');
  const rawPorts = execFileSync('docker', [
    'inspect', '--format', `{{json (index .NetworkSettings.Ports "${targetPort}")}}`, container,
  ], { encoding: 'utf8' }).trim();
  const bindings = JSON.parse(rawPorts) as { HostIp?: string; HostPort?: string }[] | null;
  assert.equal(bindings?.length, 1, 'Expected exactly one published local service port.');
  assert.equal(bindings?.[0]?.HostIp, '127.0.0.1', 'Local test services must be loopback-only.');
  assert.equal(bindings?.[0]?.HostPort, hostPort, 'Published port must match the expected disposable target.');
}

/** The only factory for a privileged test client. Every creation rechecks target identity and bindings. */
export function localAdminClient(): SupabaseClient<Database> {
  assert.equal(process.env.BRASS_EXPECTED_LOCAL_PROJECT_ID, LOCAL_PROJECT_ID);
  assert.equal(process.env.TEST_SUPABASE_URL, LOCAL_API_URL);
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, LOCAL_API_URL);
  assert.equal(new URL(process.env.TEST_SUPABASE_URL ?? '').port, '54351');
  inspectLocalBinding(`supabase_kong_${LOCAL_PROJECT_ID}`, '8000/tcp', '54351');
  const secretKey = process.env.TEST_SUPABASE_SECRET_KEY;
  assert(secretKey, 'Missing disposable local service credential.');
  return createClient<Database>(LOCAL_API_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function runEmail(label: string): string {
  return `e2e-${label}-${E2E_RUN_ID}@example.test`;
}

export async function createAdminTournament(page: import('@playwright/test').Page, title: string): Promise<string> {
  await page.goto('/admin/members');
  await page.getByLabel('Tournament title').fill(title);
  await page.getByRole('button', { name: 'Create tournament and code' }).click();
  const code = page.getByLabel('Tournament invite code');
  await code.waitFor();
  return code.inputValue();
}

export async function issueTournamentCode(page: import('@playwright/test').Page, title: string): Promise<string> {
  await page.goto('/admin/members');
  const row = page.getByRole('row').filter({ hasText: title });
  await row.getByRole('button', { name: /^(Generate|Replace) tournament code$/ }).click();
  const code = row.getByLabel('Tournament code');
  await code.waitFor();
  return code.inputValue();
}

function assertNoServiceCredential(body: string, surface: string): void {
  const secretKey = process.env.TEST_SUPABASE_SECRET_KEY;
  assert(secretKey, 'Missing disposable local service credential.');
  // The SDK itself contains the bare prefix when choosing an authorization header.
  assert(!body.includes(secretKey) && !/sb_secret_[A-Za-z0-9_-]{20,}/.test(body),
    `A service credential appeared in ${surface}.`);
}

export async function assertNoServiceCredentialInBrowser(page: import('@playwright/test').Page): Promise<void> {
  const html = await page.content();
  assertNoServiceCredential(html, 'rendered HTML');
  const scripts = await page.locator('script[src]').evaluateAll((elements) =>
    elements.map((element) => (element as HTMLScriptElement).src).filter((src) => src.includes('/_next/static/')),
  );
  for (const script of new Set(scripts)) {
    const response = await page.request.get(script);
    assert(response.ok(), 'A browser JavaScript asset failed to load.');
    assertNoServiceCredential(await response.text(), 'a browser JavaScript asset');
  }
  const staticRoot = join(process.cwd(), '.next', 'static');
  const pending = [staticRoot];
  while (pending.length) {
    const current = pending.pop()!;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else assertNoServiceCredential(readFileSync(path, 'utf8'), 'a production browser bundle');
    }
  }
}

export function watchBrowserResponses(page: import('@playwright/test').Page): () => Promise<void> {
  const bodies: Promise<string>[] = [];
  page.on('response', (response) => {
    bodies.push(response.text().catch(() => ''));
  });
  return async () => {
    for (const body of await Promise.all(bodies)) {
      assertNoServiceCredential(body, 'an HTTP response');
    }
  };
}

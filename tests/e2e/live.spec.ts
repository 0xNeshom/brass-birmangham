import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const url = process.env.TEST_SUPABASE_URL;
const publicKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const enabled = !!(url && publicKey && serviceKey && process.env.NEXT_PUBLIC_SUPABASE_URL);
const reason = 'Live journey requires a disposable local Supabase with TEST_SUPABASE_URL, TEST_SUPABASE_PUBLISHABLE_KEY, TEST_SUPABASE_SERVICE_ROLE_KEY and matching NEXT_PUBLIC_SUPABASE_URL; no live auth or database checks run without these.';
const group = '00000000-0000-4000-8000-000000000001';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Enter the league' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
async function createTournament(page: Page, title: string) {
  await page.getByLabel('Tournament title').fill(title);
  for (let slot = 1; slot <= 3; slot++) await page.getByLabel(`Player ${slot}`, { exact: true }).fill(['Ada', 'Bob', 'Cy'][slot - 1]);
  await page.getByRole('button', { name: 'Begin the tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
}
async function savePodium(page: Page, placements: string[]) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Clear prefilled values first, since occupied positions disable duplicate options.
  const fields = dialog.getByRole('combobox');
  for (let i = 0; i < 3; i++) await fields.nth(i).selectOption('');
  for (let i = 0; i < 3; i++) await fields.nth(i).selectOption(placements[i]);
  await dialog.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
test.describe('live three-member league', () => {
  test.skip(!enabled, reason);
  test('invited account confirms, sets a password, signs out, and signs in again', async ({ browser }) => {
    const admin = createClient(url!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const email = `confirmation-${randomUUID()}@example.test`;
    const password = `${randomUUID()}Aa1!`;
    const invite = await admin.auth.admin.generateLink({ type: 'invite', email });
    expect(invite.error, 'Unable to generate a disposable invitation token').toBeNull();
    const user = invite.data?.user;
    const token = invite.data?.properties?.hashed_token;
    if (!user || !token) throw new Error('Supabase did not return the disposable invitation user and token.');
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(`/auth/confirm?token_hash=${encodeURIComponent(token)}&type=invite`);
      await expect(page).toHaveURL(/\/auth\/password$/);
      await page.getByLabel('New password').fill(password);
      await page.getByLabel('Confirm password').fill(password);
      await page.getByRole('button', { name: 'Save password & enter' }).click();
      await expect(page).toHaveURL(/\/access-required$/);
      await page.getByRole('button', { name: 'Sign out' }).click();
      await expect(page).toHaveURL(/\/login$/);
      await login(page, email, password);
      await expect(page).toHaveURL(/\/access-required$/);
      expect(errors, 'No runtime, hydration, or console errors in auth flow').toEqual([]);
    } finally {
      await context.close();
      const deleted = await admin.auth.admin.deleteUser(user.id);
      if (deleted.error) throw new Error('Could not clean disposable confirmation account.');
    }
  });
  test('records ten matches, synchronizes three sessions, corrects history and starts a successor', async ({ browser }) => {
    test.setTimeout(240_000);
    const target = new URL(url!);
    expect(['localhost', '127.0.0.1', '[::1]']).toContain(target.hostname);
    expect(['http:', 'https:']).toContain(target.protocol);
    expect(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin).toBe(target.origin);
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const admin = createClient(url!, serviceKey!, options);
    const users: { id: string; email: string; password: string }[] = [];
    const contexts: BrowserContext[] = [];
    const run = randomUUID();
    const titles = [`Browser league ${run}`, `Successor ${run}`];
    const errors: string[] = [];
    // Refuse to mutate pre-existing records or the user's invited accounts.
    const tournaments = await admin.from('tournaments').select('id');
    const memberships = await admin.from('group_members').select('user_id');
    expect(tournaments.error).toBeNull(); expect(memberships.error).toBeNull();
    expect(tournaments.data, 'Live browser tests require zero pre-existing tournaments').toEqual([]);
    expect(memberships.data, 'Live browser tests require zero pre-existing memberships').toEqual([]);
    try {
      for (let slot = 1; slot <= 4; slot++) {
        const email = `browser-${randomUUID()}@example.test`;
        const password = `${randomUUID()}Aa1!`;
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        expect(created.error, 'Unable to create disposable test account').toBeNull();
        users.push({ id: created.data.user!.id, email, password });
        if (slot <= 3) {
          const membership = await admin.from('group_members').insert({ group_id: group, user_id: users[slot - 1].id, member_slot: slot });
          expect(membership.error).toBeNull();
        }
      }
      const outsider = createClient(url!, publicKey!, options);
      const outsiderLogin = await outsider.auth.signInWithPassword(users[3]);
      expect(outsiderLogin.error).toBeNull();
      const denied = await outsider.rpc('list_tournaments', {});
      expect(denied.error?.message).toContain('FORBIDDEN');
      for (const user of users.slice(0, 3)) {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        contexts.push(context);
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        await login(page, user.email, user.password);
      }
      const [a, b, c] = contexts.map(context => context.pages()[0]);
      await createTournament(a, titles[0]);
      const ledgerURL = a.url();
      await Promise.all([b.goto(ledgerURL), c.goto(ledgerURL)]);
      // Navigation does not imply that each browser has completed its async
      // Realtime channel join. Wait for readiness so no session misses the first event.
      for (const page of [a, b, c]) {
        await expect(page.locator('.tournament-connection')).toContainText('Live · shared with your league', { timeout: 40_000 });
      }
      for (let match = 1; match <= 10; match++) {
        await a.getByRole('button', { name: new RegExp(`^Record match ${match}\\b`) }).click();
        await savePodium(a, ['1', '2', '3']);
        for (const page of [a, b, c]) await expect(page.locator('.tournament-status')).toContainText(`${match} of 10 matches recorded`, { timeout: 40_000 });
      }
      await expect(a.getByRole('heading', { name: 'Ada', exact: true }).last()).toBeVisible();
      await expect(a.locator('.tournament-completion')).toContainText('Takes the honours.');
      await expect(a.getByRole('progressbar', { name: 'Ada: 100 of 100 possible points', exact: true })).toBeVisible();
      await a.getByRole('button', { name: 'Edit match 1', exact: true }).click();
      await savePodium(a, ['2', '3', '1']);
      for (const page of [a, b, c]) {
        await page.bringToFront();
        await expect(page.getByRole('progressbar', { name: 'Ada: 90 of 100 possible points', exact: true })).toBeVisible({ timeout: 40_000 });
      }
      await a.getByRole('link', { name: /Begin the next tournament/ }).click();
      await createTournament(a, titles[1]);
      await a.getByRole('link', { name: 'The archives' }).click();
      await expect(a.getByRole('heading', { name: titles[0], exact: true })).toBeVisible();
      await expect(a.getByRole('heading', { name: titles[1], exact: true })).toBeVisible();
      await a.getByRole('link', { name: new RegExp(titles[0]) }).click();
      await a.getByRole('button', { name: 'Edit match 2', exact: true }).click();
      await savePodium(a, ['3', '2', '1']);
      await expect(a.getByRole('progressbar', { name: 'Ada: 80 of 100 possible points', exact: true })).toBeVisible();

      // Exercise a real Supabase invite token through the app confirmation route,
      // password setup, sign-out endpoint, and a subsequent password sign-in.
      const invitedEmail = `invited-${randomUUID()}@example.test`;
      const invitedPassword = `${randomUUID()}Aa1!`;
      const invite = await admin.auth.admin.generateLink({ type: 'invite', email: invitedEmail });
      expect(invite.error, 'Unable to generate a disposable invitation token').toBeNull();
      const invitedUser = invite.data?.user;
      const inviteToken = invite.data?.properties?.hashed_token;
      if (!invitedUser || !inviteToken) throw new Error('Supabase did not return the disposable invitation user and token.');
      users.push({ id: invitedUser.id, email: invitedEmail, password: invitedPassword });
      const inviteContext = await browser.newContext({ reducedMotion: 'reduce' });
      contexts.push(inviteContext);
      const invitePage = await inviteContext.newPage();
      invitePage.on('pageerror', error => errors.push(error.message));
      invitePage.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await invitePage.goto(`/auth/confirm?token_hash=${encodeURIComponent(inviteToken)}&type=invite`);
      await expect(invitePage).toHaveURL(/\/auth\/password$/);
      await invitePage.getByLabel('New password').fill(invitedPassword);
      await invitePage.getByLabel('Confirm password').fill(invitedPassword);
      await invitePage.getByRole('button', { name: 'Save password & enter' }).click();
      await expect(invitePage).toHaveURL(/\/access-required$/);
      await invitePage.getByRole('button', { name: 'Sign out' }).click();
      await expect(invitePage).toHaveURL(/\/login$/);
      await login(invitePage, invitedEmail, invitedPassword);
      await expect(invitePage).toHaveURL(/\/access-required$/);
      expect(errors, 'No runtime, hydration, or console errors in live sessions').toEqual([]);
    } finally {
      await Promise.all(contexts.map(context => context.close()));
      // Only delete exact per-run title matches; never clear the entire shared tables.
      const owned = await admin.from('tournaments').select('id').in('title', titles);
      if (owned.error) throw new Error('Could not locate browser-owned records for cleanup.');
      for (const tournament of owned.data ?? []) {
        for (const table of ['match_results', 'matches', 'players']) {
          const deleted = await admin.from(table).delete().eq('tournament_id', tournament.id);
          if (deleted.error) throw new Error('Could not clean browser-owned tournament records.');
        }
        const deleted = await admin.from('tournaments').delete().eq('id', tournament.id);
        if (deleted.error) throw new Error('Could not clean browser-owned tournament.');
      }
      for (const user of users) {
        const deleted = await admin.auth.admin.deleteUser(user.id);
        if (deleted.error) throw new Error('Could not clean disposable browser account.');
      }
    }
  });
});

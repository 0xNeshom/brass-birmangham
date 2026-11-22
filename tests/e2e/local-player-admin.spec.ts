import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  ADMIN_EMAIL, ADMIN_PASSWORD, APP_ORIGIN, assertNoServiceCredentialInBrowser,
  createAdminTournament, e2eEnabled, issueTournamentCode, localAdminClient, runEmail, watchBrowserResponses,
} from './local-support';

const genericRegistrationMessage = 'Could not register. Check the tournament code and account details, or sign in if you already have an account.';

async function loginAdmin(page: Page, password = ADMIN_PASSWORD) {
  await page.goto('/admin/login');
  const disable3d = page.getByRole('button', { name: 'Disable 3D' });
  if (await disable3d.isVisible()) await disable3d.click();
  await page.getByLabel('Administrator email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

async function submitRegistration(page: Page, email: string, password: string, code: string, displayName: string) {
  await page.goto('/register');
  const disable3d = page.getByRole('button', { name: 'Disable 3D' });
  if (await disable3d.isVisible()) await disable3d.click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Display name', { exact: true }).fill(displayName);
  await page.getByLabel('Tournament code', { exact: true }).fill(code);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account and join tournament' }).click();
}

async function assertCredentialAbsent(page: Page, context: BrowserContext) {
  const cookie = (await context.cookies(`${APP_ORIGIN}/admin/members`)).find((item) => item.name === 'brass_admin_session');
  expect(cookie).toBeTruthy();
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Strict');
  expect(cookie?.secure).toBe(process.env.BRASS_E2E_PRODUCTION === '1');
  await assertNoServiceCredentialInBrowser(page);
}

test.describe('local v2 player registration and admin access', () => {
  test.skip(!e2eEnabled, 'Requires the explicitly guarded brass-invite-it disposable local Supabase project.');

  test('code rotation, immediate signup, admin session, and revocation', async ({ browser }) => {
    test.setTimeout(180_000);
    const admin = localAdminClient();
    const approvedEmail = runEmail('code-member');
    const rejectedEmail = runEmail('rotated-code-reject');
    const displayName = `Invite ${randomUUID().slice(0, 8)}`;
    const tournamentTitle = `Invite E2E ${randomUUID().slice(0, 8)}`;
    const password = `Player-${randomUUID()}-Aa1!`;
    const adminContext = await browser.newContext({ reducedMotion: 'reduce' });
    const adminPage = await adminContext.newPage();
    const verifyAdminResponses = watchBrowserResponses(adminPage);
    let playerContext: BrowserContext | undefined;
    let verifyPlayerResponses: (() => Promise<void>) | undefined;
    try {
      await adminPage.goto('/admin/members');
      await expect(adminPage).toHaveURL(/\/admin\/login$/);
      const disable3d = adminPage.getByRole('button', { name: 'Disable 3D' });
      if (await disable3d.isVisible()) await disable3d.click();
      await adminPage.getByLabel('Administrator email').fill(ADMIN_EMAIL);
      await adminPage.getByLabel('Password', { exact: true }).fill('definitely-not-the-admin-password');
      await adminPage.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(adminPage.getByText('Unable to sign in.', { exact: true })).toBeVisible();

      await loginAdmin(adminPage);
      await expect(adminPage).toHaveURL(/\/admin\/members$/);
      await expect(adminPage.getByRole('heading', { name: 'Member access' })).toBeVisible();
      await adminPage.goto('/admin');
      await expect(adminPage).toHaveURL(/\/admin\/members$/);
      await assertCredentialAbsent(adminPage, adminContext);

      // Load a real privileged action while authorized, then remove its cookie
      // before invoking it. The action must independently reject the request.
      await adminPage.goto('/admin/members');
      const originalCode = await createAdminTournament(adminPage, tournamentTitle);
      await adminContext.clearCookies();
      const tournamentRow = adminPage.getByRole('row').filter({ hasText: tournamentTitle });
      await tournamentRow.getByRole('button', { name: /^(Generate|Replace) tournament code$/ }).click();
      await expect(adminPage).toHaveURL(/\/admin\/login$/);

      await loginAdmin(adminPage);
      await expect(adminPage).toHaveURL(/\/admin\/members$/);
      const oldCode = originalCode;
      const newCode = await issueTournamentCode(adminPage, tournamentTitle);

      const guestContext = await browser.newContext({ reducedMotion: 'reduce' });
      const guest = await guestContext.newPage();
      await guest.goto('/admin/members');
      await expect(guest).toHaveURL(/\/admin\/login$/);
      await guestContext.close();

      playerContext = await browser.newContext({ reducedMotion: 'reduce' });
      const player = await playerContext.newPage();
      verifyPlayerResponses = watchBrowserResponses(player);
      await submitRegistration(player, rejectedEmail, password, oldCode, 'Rejected User');
      await expect(player.getByRole('alert').filter({ hasText: genericRegistrationMessage })).toBeVisible();
      const rejectedUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      expect(rejectedUsers.error).toBeNull();
      expect(rejectedUsers.data.users.some((user) => user.email === rejectedEmail)).toBe(false);

      await submitRegistration(player, approvedEmail, password, newCode, displayName);
      await expect(player).toHaveURL(/\/tournaments\/[0-9a-f-]{36}$/);
      await player.reload();
      await expect(player.getByRole('heading', { name: tournamentTitle, exact: true })).toBeVisible();
      const verifiedUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      expect(verifiedUsers.error).toBeNull();
      const user = verifiedUsers.data.users.find((candidate) => candidate.email === approvedEmail);
      expect(user?.email_confirmed_at).toBeTruthy();
      expect(user?.id).toBeTruthy();
      const membership = await admin.from('group_members').select('status').eq('user_id', user!.id).single();
      expect(membership).toMatchObject({ data: { status: 'active' }, error: null });
      expect(await admin.from('players').select('member_user_id,name').eq('member_user_id', user!.id).single()).toMatchObject({
        data: { member_user_id: user!.id, name: displayName }, error: null,
      });
      await adminPage.goto('/admin/members');
      const memberRow = adminPage.getByRole('row').filter({ hasText: approvedEmail });
      await expect(memberRow).toContainText('active');
      await memberRow.getByRole('button', { name: 'Revoke', exact: true }).click();
      await expect(adminPage.getByRole('status')).toHaveText('Member access revoked.');
      await player.reload();
      await expect(player).toHaveURL(/\/access-required$/);
      await expect(player.getByRole('heading', { name: /isn’t active yet/i })).toBeVisible();
      expect(await admin.from('group_members').select('status').eq('user_id', user!.id).single()).toMatchObject({ data: { status: 'revoked' }, error: null });

      await assertCredentialAbsent(adminPage, adminContext);
      await verifyAdminResponses();
      await verifyPlayerResponses();
    } finally {
      await Promise.all([adminContext.close(), playerContext?.close()].filter(Boolean));
    }
  });
});

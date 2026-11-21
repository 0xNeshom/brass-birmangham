import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  ADMIN_EMAIL, ADMIN_PASSWORD, APP_ORIGIN, assertNoServiceCredentialInBrowser,
  confirmationToken, e2eEnabled, localAdminClient, runEmail, watchBrowserResponses,
} from './local-support';

const genericRegistrationMessage = 'If this address is approved, a verification email will be sent shortly.';

async function loginAdmin(page: Page, password = ADMIN_PASSWORD) {
  await page.goto('/admin/login');
  const disable3d = page.getByRole('button', { name: 'Disable 3D' });
  if (await disable3d.isVisible()) await disable3d.click();
  await page.getByLabel('Administrator email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

async function approveEmail(page: Page, email: string) {
  await page.goto('/admin/members');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Access list updated.');
  await expect(page.getByRole('row').filter({ hasText: email })).toContainText('approved');
}

async function registerAndConfirm(page: Page, email: string, password: string) {
  await page.goto('/register');
  const disable3d = page.getByRole('button', { name: 'Disable 3D' });
  if (await disable3d.isVisible()) await disable3d.click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Request verification' }).click();
  await expect(page.getByRole('status')).toHaveText(genericRegistrationMessage);
  const token = await confirmationToken(email);
  await page.goto(`/auth/confirm?token_hash=${encodeURIComponent(token)}&type=signup&next=/dashboard`);
  await expect(page).toHaveURL(`${APP_ORIGIN}/`);
  await expect(page.getByRole('heading', { name: 'Every tournament, one ledger.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Every tournament, one ledger.' })).toBeVisible();
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
  test.skip(!e2eEnabled, 'Requires the explicitly guarded brass-auth-it-4dpoxpp2 disposable local Supabase project.');

  test('generic signup response, verified activation, admin session, allowlist, and revocation', async ({ browser }) => {
    test.setTimeout(180_000);
    const admin = localAdminClient();
    const approvedEmail = runEmail('approved');
    const rejectedEmail = runEmail('not-approved');
    const blockedActionEmail = runEmail('blocked-action');
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
      await adminContext.clearCookies();
      await adminPage.getByLabel('Email address', { exact: true }).fill(blockedActionEmail);
      await adminPage.getByRole('button', { name: 'Approve', exact: true }).click();
      await expect(adminPage).toHaveURL(/\/admin\/login$/);
      expect(await admin.from('allowed_emails').select('email_normalized').eq('email_normalized', blockedActionEmail).maybeSingle()).toMatchObject({ data: null, error: null });

      await loginAdmin(adminPage);
      await expect(adminPage).toHaveURL(/\/admin\/members$/);
      await approveEmail(adminPage, approvedEmail);

      const guestContext = await browser.newContext({ reducedMotion: 'reduce' });
      const guest = await guestContext.newPage();
      await guest.goto('/admin/members');
      await expect(guest).toHaveURL(/\/admin\/login$/);
      await guestContext.close();

      // Unapproved and approved addresses receive the same public response.
      playerContext = await browser.newContext({ reducedMotion: 'reduce' });
      const player = await playerContext.newPage();
      verifyPlayerResponses = watchBrowserResponses(player);
      await player.goto('/register');
      await player.getByLabel('Email address').fill(rejectedEmail);
      await player.getByLabel('Password', { exact: true }).fill(password);
      await player.getByLabel('Confirm password').fill(password);
      await player.getByRole('button', { name: 'Request verification' }).click();
      await expect(player.getByRole('status')).toHaveText(genericRegistrationMessage);
      expect(await admin.from('allowed_emails').select('email_normalized').eq('email_normalized', rejectedEmail).maybeSingle()).toMatchObject({ data: null, error: null });
      const rejectedUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      expect(rejectedUsers.error).toBeNull();
      expect(rejectedUsers.data.users.some((user) => user.email === rejectedEmail)).toBe(false);

      await registerAndConfirm(player, approvedEmail, password);
      const verifiedUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      expect(verifiedUsers.error).toBeNull();
      const user = verifiedUsers.data.users.find((candidate) => candidate.email === approvedEmail);
      expect(user?.email_confirmed_at).toBeTruthy();
      expect(user?.id).toBeTruthy();
      const membership = await admin.from('group_members').select('status').eq('user_id', user!.id).single();
      expect(membership).toMatchObject({ data: { status: 'active' }, error: null });
      const allowlist = await admin.from('allowed_emails').select('status').eq('email_normalized', approvedEmail).single();
      expect(allowlist).toMatchObject({ data: { status: 'active' }, error: null });

      await adminPage.goto('/admin/members');
      const memberRow = adminPage.getByRole('row').filter({ hasText: approvedEmail });
      await expect(memberRow).toContainText('active');
      await memberRow.getByRole('button', { name: 'Revoke', exact: true }).click();
      await expect(adminPage.getByRole('status')).toHaveText('Access list updated.');
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

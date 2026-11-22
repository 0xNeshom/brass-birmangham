import { randomUUID } from 'node:crypto';
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL, ADMIN_PASSWORD, assertNoServiceCredentialInBrowser,
  createAdminTournament, e2eEnabled, localAdminClient, runEmail, watchBrowserResponses,
} from './local-support';

async function adminLogin(page: Page) {
  await page.goto('/admin/login');
  const disable3d = page.getByRole('button', { name: 'Disable 3D' });
  if (await disable3d.isVisible()) await disable3d.click();
  await page.getByLabel('Administrator email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/members$/);
}

async function registerMember(page: Page, email: string, password: string, code: string, displayName: string, tournamentTitle: string) {
  await page.goto('/register');
  const disable3d = page.getByRole('button', { name: 'Disable 3D' });
  if (await disable3d.isVisible()) await disable3d.click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Display name', { exact: true }).fill(displayName);
  await page.getByLabel('Tournament code', { exact: true }).fill(code);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account and join tournament' }).click();
  await expect(page).toHaveURL(/\/tournaments\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: tournamentTitle, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: tournamentTitle, exact: true })).toBeVisible();
}

async function createTournament(page: Page, title: string) {
  await page.goto('/tournaments/new');
  await page.getByLabel('Tournament title').fill(title);
  await page.getByRole('button', { name: 'Create tournament and invite code' }).click();
  const inviteCode = await page.getByLabel('Tournament invite code').inputValue();
  await page.getByRole('link', { name: 'Open tournament' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const match = page.url().match(/\/tournaments\/([0-9a-f-]{36})/i);
  expect(match?.[1]).toBeTruthy();
  return { id: match![1], url: page.url(), inviteCode };
}

async function setProfileAndJoin(page: Page, tournamentUrl: string, name: string) {
  await page.goto(tournamentUrl);
  await page.getByLabel('Display name').fill(name);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('The ledger has been updated.');
  await page.getByRole('button', { name: 'Join tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Leave tournament', exact: true })).toBeVisible();
  await expect(page.locator('.league-roster-list')).toContainText(name);
}

async function chooseParticipants(article: ReturnType<Page['locator']>, names: string[]) {
  for (const name of names) await article.getByLabel(name, { exact: true }).check();
  await article.getByRole('button', { name: 'Save participants', exact: true }).click();
  await expect(article.locator('.league-result-entry')).toBeVisible();
}

async function chooseRanking(article: ReturnType<Page['locator']>, slots: number[], correction = false) {
  const selects = article.locator(correction ? '.league-correction select' : '.league-result-entry select');
  if (correction) {
    for (let index = 0; index < slots.length; index++) await selects.nth(index).selectOption('');
  }
  for (let index = 0; index < slots.length; index++) await selects.nth(index).selectOption(String(slots[index]));
}

async function registerRoster(
  browser: Browser,
  code: string,
  runLabel: string,
  responseChecks: (() => Promise<void>)[],
  tournamentTitle: string,
): Promise<{ contexts: BrowserContext[]; pages: Page[]; emails: string[]; names: string[] }> {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  const emails: string[] = [];
  const names: string[] = [];
  for (let index = 1; index < 4; index++) {
    const email = runEmail(`${runLabel}-member-${index + 1}`);
    const displayName = `E2E ${runLabel} ${index + 1}`;
    const password = `Roster-${randomUUID()}-Aa1!`;
    emails.push(email);
    names.push(displayName);
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    contexts.push(context);
    const page = await context.newPage();
    responseChecks.push(watchBrowserResponses(page));
    pages.push(page);
    await registerMember(page, email, password, code, displayName, tournamentTitle);
  }
  return { contexts, pages, emails, names };
}

test.describe('local v2 member application journey', () => {
  test.skip(!e2eEnabled, 'Requires the explicitly guarded brass-invite-it disposable local Supabase project.');

  test('concurrent tournaments, global profiles, four-player sequential results, history, statistics, and revocation', async ({ browser }) => {
    test.setTimeout(300_000);
    const admin = localAdminClient();
    const run = `journey-${randomUUID().replaceAll('-', '').slice(0, 8)}`;
    const adminContext = await browser.newContext({ reducedMotion: 'reduce' });
    const adminPage = await adminContext.newPage();
    const responseChecks = [watchBrowserResponses(adminPage)];
    const memberContexts: BrowserContext[] = [];
    let primaryPage: Page | undefined;
    try {
      await adminLogin(adminPage);
      const primaryEmail = runEmail(`${run}-member-1`);
      const primaryName = `E2E ${run} 1`;
      const primaryPassword = `Roster-${randomUUID()}-Aa1!`;
      const firstTitle = `Browser ${run} · Ten matches`;
      const code = await createAdminTournament(adminPage, firstTitle);
      const primaryContext = await browser.newContext({ reducedMotion: 'reduce' });
      memberContexts.push(primaryContext);
      primaryPage = await primaryContext.newPage();
      responseChecks.push(watchBrowserResponses(primaryPage));
      await registerMember(primaryPage, primaryEmail, primaryPassword, code, primaryName, firstTitle);
      const firstMatch = primaryPage.url().match(/\/tournaments\/([0-9a-f-]{36})/i);
      expect(firstMatch?.[1]).toBeTruthy();
      const first = { id: firstMatch![1], url: primaryPage.url() };
      await primaryPage.goto('/');
      const second = await createTournament(primaryPage, `Browser ${run} · Parallel ledger`);
      await primaryPage.goto('/');
      await expect(primaryPage.getByText(`Browser ${run} · Ten matches`, { exact: true })).toBeVisible();
      await expect(primaryPage.getByText(`Browser ${run} · Parallel ledger`, { exact: true })).toBeVisible();
      await setProfileAndJoin(primaryPage, second.url, primaryName);

      const roster = await registerRoster(browser, code, run, responseChecks, firstTitle);
      memberContexts.push(...roster.contexts);
      roster.contexts.unshift(primaryContext);
      roster.pages.unshift(primaryPage);
      roster.emails.unshift(primaryEmail);
      roster.names.unshift(primaryName);
      await primaryPage.goto(first.url);
      await expect(primaryPage.locator('.league-roster')).toContainText('4 members joined');

      const matchOne = primaryPage.locator('.league-match').nth(0);
      const matchTwo = primaryPage.locator('.league-match').nth(1);
      const matchThree = primaryPage.locator('.league-match').nth(2);
      const slots = [1, 2, 3, 4];
      await chooseParticipants(matchOne, roster.names);
      await chooseParticipants(matchTwo, roster.names);
      await chooseParticipants(matchThree, roster.names);
      await expect(matchTwo.getByRole('button', { name: 'Record result', exact: true })).toBeDisabled();
      await expect(matchThree.getByRole('button', { name: 'Record result', exact: true })).toBeDisabled();

      const firstSelects = matchOne.locator('.league-result-entry select');
      await firstSelects.nth(0).selectOption('1');
      await expect(firstSelects.nth(1).locator('option[value="1"]')).toBeDisabled();
      for (let index = 1; index < slots.length; index++) await firstSelects.nth(index).selectOption(String(slots[index]));
      await matchOne.getByRole('button', { name: 'Record result', exact: true }).click();
      await expect(matchOne.locator('h3')).toHaveText('Result recorded');

      const participantRowsBefore = await admin.from('match_participants')
        .select('player_slot').eq('tournament_id', first.id).eq('match_number', 1);
      expect(participantRowsBefore.error).toBeNull();
      const participantsBefore = participantRowsBefore.data?.map((row) => row.player_slot).sort();
      await chooseRanking(matchOne, [2, 1, 3, 4], true);
      await matchOne.getByRole('button', { name: 'Save correction', exact: true }).click();
      await expect(matchOne.locator('.league-podium > span').first()).toContainText(roster.names[1]);
      const participantRowsAfter = await admin.from('match_participants')
        .select('player_slot').eq('tournament_id', first.id).eq('match_number', 1);
      expect(participantRowsAfter.error).toBeNull();
      expect(participantRowsAfter.data?.map((row) => row.player_slot).sort()).toEqual(participantsBefore);

      for (let number = 2; number <= 10; number++) {
        const article = primaryPage.locator('.league-match').nth(number - 1);
        if (number > 3) await chooseParticipants(article, roster.names);
        await chooseRanking(article, slots);
        await article.getByRole('button', { name: 'Record result', exact: true }).click();
        await expect(article.locator('h3')).toHaveText('Result recorded');
        await expect(primaryPage.locator('.league-heading')).toContainText(`${number} of 10 matches recorded`);
      }

      await expect(primaryPage.locator('.league-winner')).toContainText(roster.names[0]);
      await expect(primaryPage.getByRole('region', { name: 'Tournament statistics' })).toBeVisible();
      await primaryPage.goto(`/tournaments/${first.id}/statistics`);
      await expect(primaryPage.getByRole('heading', { name: 'The campaign, in numbers.' })).toBeVisible();
      await expect(primaryPage.getByRole('table', { name: /Player statistics comparison/ })).toBeVisible();
      await primaryPage.goto('/history');
      await expect(primaryPage.getByRole('heading', { name: `Browser ${run} · Ten matches` })).toBeVisible();
      await expect(primaryPage.getByRole('heading', { name: `Browser ${run} · Parallel ledger` })).toBeVisible();

      const beforeRevocation = await admin.from('match_participants').select('player_slot', { count: 'exact', head: true }).eq('tournament_id', first.id);
      expect(beforeRevocation).toMatchObject({ count: 40, error: null });
      await adminPage.goto('/admin/members');
      const memberRow = adminPage.getByRole('row').filter({ hasText: roster.emails[0] });
      await expect(memberRow).toContainText('active');
      await memberRow.getByRole('button', { name: 'Revoke', exact: true }).click();
      await expect(adminPage.getByRole('status')).toHaveText('Member access revoked.');

      await primaryPage.goto('/');
      await expect(primaryPage).toHaveURL(/\/access-required$/);
      await expect(primaryPage.getByRole('heading', { name: /isn’t active yet/i })).toBeVisible();
      const afterRevocation = await admin.from('match_participants').select('player_slot', { count: 'exact', head: true }).eq('tournament_id', first.id);
      expect(afterRevocation).toMatchObject({ count: 40, error: null });
      const historicalPlayers = await admin.from('players').select('name').eq('tournament_id', first.id).order('slot');
      expect(historicalPlayers.data?.map((player) => player.name)).toEqual(roster.names);
      const tournamentCounts = await admin.from('matches').select('number,played_at').eq('tournament_id', first.id);
      expect(tournamentCounts.data?.filter((match) => match.played_at)).toHaveLength(10);
      await assertNoServiceCredentialInBrowser(primaryPage);
      await assertNoServiceCredentialInBrowser(adminPage);
      await Promise.all(responseChecks.map((verify) => verify()));

      // Revoke the remaining run-owned accounts too; retain their Auth identities,
      // profiles, tournament roster, and all played results as synthetic history.
      for (const email of roster.emails.slice(1)) {
        const row = adminPage.getByRole('row').filter({ hasText: email });
        if (await row.getByRole('button', { name: 'Revoke', exact: true }).count()) {
          await row.getByRole('button', { name: 'Revoke', exact: true }).click();
          await expect(adminPage.getByRole('status')).toHaveText('Member access revoked.');
        }
      }
      expect(second.id).not.toBe(first.id);
    } finally {
      await Promise.all([adminContext.close(), ...memberContexts.map((context) => context.close())]);
    }
  });
});

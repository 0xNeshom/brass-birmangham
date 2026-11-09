import { test, expect } from '@playwright/test';

test.describe('unconfigured private league', () => {
  test.skip(!!process.env.NEXT_PUBLIC_SUPABASE_URL, 'Requires the app to run without Supabase configuration.');

  for (const width of [360, 390, 768, 1440]) {
    test(`setup is explicit and fits a ${width}px viewport`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Connect your private league.' })).toBeVisible();
      await expect(page.getByText('Setup required', { exact: false })).toBeVisible();
      await expect(page.getByText('No tournament records are shown', { exact: false })).toBeVisible();
      await expect(page.getByRole('button', { name: /record match/i })).toHaveCount(0);
      await expect(page.getByRole('region', { name: 'Player scores' })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  test('protected routes require sign-in', async ({ page }) => {
    for (const route of ['/history', '/tournaments/new', '/tournaments/00000000-0000-4000-8000-000000000099']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: 'Connect your private league.' })).toBeVisible();
    }
  });

  test('invalid access links return to a safe local login', async ({ page }) => {
    for (const route of ['/auth/callback?next=https://example.com', '/auth/confirm?type=invite&next=//example.com']) {
      await page.goto(route);
      await expect(page).toHaveURL('http://localhost:3000/login?error=link');
    }
  });

  test('same-origin sign-out redirects cleanly to the login page', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const response = await fetch('/auth/signout', { method: 'POST' });
      return { status: response.status, url: response.url };
    });
    expect(result.status).toBe(200);
    expect(result.url).toBe('http://localhost:3000/login');
  });

  test('reduced motion and the static industrial fallback retain the page', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const scene = page.getByRole('region', { name: 'Birmingham industrial landscape' });
    await expect(scene).toBeVisible();
    await expect(scene.getByRole('button', { name: /pause motion|resume motion/i })).toHaveCount(0);
    const disable = scene.getByRole('button', { name: 'Disable 3D' });
    if (await disable.isVisible()) await disable.click();
    const fallback = scene.locator('[class*="fallback"]');
    await expect(fallback).toHaveCSS('opacity', '1');
    await expect(fallback).toHaveCSS('background-image', /industrial-fallback\.svg/);
    await expect(page.getByRole('heading', { name: 'Connect your private league.' })).toBeVisible();
  });
});

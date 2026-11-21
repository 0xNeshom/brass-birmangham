import { defineConfig, devices } from '@playwright/test';

const productionE2E = process.env.BRASS_E2E_PRODUCTION === '1';
const port = process.env.BRASS_E2E_PORT ?? '3000';
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('BRASS_E2E_PORT must be a valid port number.');
}
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    ...(process.env.PLAYWRIGHT_ALL_BROWSERS === '1' ? [
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ] : []),
  ],
  webServer: {
    command: productionE2E
      ? `npx next start --hostname 127.0.0.1 --port ${port}`
      : `npx next dev --webpack --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 240000,
  expect: { timeout: 20000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-live-report' }]],
  use: {
    baseURL: 'https://pasteskillsetuv1.vercel.app',
    actionTimeout: 20000,
    navigationTimeout: 45000,
    browserName: 'chromium',
    launchOptions: { args: ['--no-sandbox'] },
    trace: 'on',
    screenshot: 'on',
  },
});

import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  timeout: 90_000,
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3001', trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium' }, grep: /@mobile/ },
  ],
});

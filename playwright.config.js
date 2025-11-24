const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI ? [['html', { outputFolder: 'playwright-report' }], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:19006',
    trace: 'retain-on-failure',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'CI=1 BROWSER=none npx expo start --web --port 19006',
    url: 'http://localhost:19006',
    timeout: 120_000,
    reuseExistingServer: true,
  },
});


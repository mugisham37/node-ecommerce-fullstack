import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for staging environment
 */
export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 3, // More retries for staging environment
  workers: 2, // Limited workers for staging
  reporter: [
    ['html', { outputFolder: 'staging-test-results' }],
    ['json', { outputFile: 'staging-test-results/results.json' }],
    ['junit', { outputFile: 'staging-test-results/results.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://staging.inventory-app.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Longer timeouts for staging environment
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  projects: [
    {
      name: 'staging-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'staging-mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  timeout: 60000, // 60 seconds per test
});
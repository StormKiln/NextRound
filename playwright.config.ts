import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  workers: process.env.CI ? 2 : undefined,
  use: { baseURL: 'http://127.0.0.1:1420', viewport: { width: 1280, height: 900 } },
  webServer: {
    command: 'make dev-web',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});

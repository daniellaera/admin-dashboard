import { defineConfig, devices } from '@playwright/test';
import {
  API_ENV,
  API_URL,
  BASE_URL,
  IS_EXTERNAL_STACK,
  processEnvWith,
} from './e2e/support/env.ts';

/**
 * End-to-end suite against the real stack.
 *
 * Default (local): Playwright starts the API (`tsx`) on :3000 and the Vite dev server on :5173,
 * both pointed at the compose services (`docker compose up -d db mailpit`). The database is
 * reset and re-seeded once in `global-setup.ts`.
 *
 * CI image mode: set `E2E_BASE_URL` to an already running stack (the production image behind
 * compose); no servers are started, the suite only needs reachability of Mailpit's API.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  // One worker: the specs share a seeded database and change global settings on purpose.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/support/global-setup.ts',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(IS_EXTERNAL_STACK
    ? {}
    : {
        webServer: [
          {
            command: 'pnpm --filter @devconnector/api exec tsx src/server.ts',
            url: `${API_URL}/api/v1/health`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            env: processEnvWith(API_ENV),
            stdout: 'ignore',
            stderr: 'pipe',
          },
          {
            command: 'pnpm --filter @devconnector/web exec vite',
            url: BASE_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            env: processEnvWith({ VITE_API_PROXY_TARGET: API_URL }),
            stdout: 'ignore',
            stderr: 'pipe',
          },
        ],
      }),
});

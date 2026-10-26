import { defineConfig } from 'vitest/config';

// Integration tests run against a real PostgreSQL: a Testcontainers instance started once in
// test/global-setup.ts, or the database named by TEST_DATABASE_URL (CI service container).
export default defineConfig({
  test: {
    name: 'api-integration',
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    passWithNoTests: true,
  },
});

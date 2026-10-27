import { defineConfig } from 'vitest/config';

// Root runner: `pnpm test` executes every project; `--project <name>` selects one.
export default defineConfig({
  test: {
    projects: [
      'packages/shared/vitest.config.ts',
      'apps/api/vitest.unit.config.ts',
      'apps/api/vitest.integration.config.ts',
      'apps/web/vitest.config.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['apps/*/src/**', 'packages/*/src/**'],
      exclude: ['**/*.test.*', '**/routeTree.gen.ts', '**/*.d.ts'],
    },
  },
});

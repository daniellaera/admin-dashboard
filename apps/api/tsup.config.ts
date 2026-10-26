import { defineConfig } from 'tsup';

// Production bundle: one ESM file per entry, workspace packages inlined,
// third-party and native dependencies left external (installed in the image).
export default defineConfig({
  entry: {
    server: 'src/server.ts',
    'scripts/migrate': 'src/scripts/migrate.ts',
    'scripts/seed': 'src/scripts/seed.ts',
    'scripts/promote-admin': 'src/scripts/promote-admin.ts',
    'scripts/import-supabase': 'src/scripts/import-supabase.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: ['@devconnector/shared'],
});

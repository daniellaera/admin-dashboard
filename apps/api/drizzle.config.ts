import { defineConfig } from 'drizzle-kit';

// `pnpm db:generate` diffs src/db/schema.ts against drizzle/meta and writes a versioned SQL
// migration into drizzle/. Migrations are applied by the app (src/db/migrate.ts), never by
// `drizzle-kit push`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://devconnector:devconnector@localhost:5432/devconnector',
  },
  strict: true,
  verbose: true,
});

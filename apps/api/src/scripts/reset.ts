import { sql } from 'drizzle-orm';
import { createDatabase } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';
import { seed } from '../db/seed.ts';
import { loadEnv } from '../env.ts';
import { createLogger } from '../lib/logger.ts';

// Development only: drop everything, re-apply migrations, seed.
const env = loadEnv();
if (env.NODE_ENV === 'production') {
  console.error('db:reset is disabled in production.');
  process.exit(1);
}
const logger = createLogger(env);
const database = createDatabase(env.DATABASE_URL, logger);
try {
  await database.db.execute(sql`drop schema if exists public cascade`);
  await database.db.execute(sql`drop schema if exists drizzle cascade`);
  await database.db.execute(sql`create schema public`);
  await runMigrations(database.db);
  await seed(database.db, { logger });
  logger.info('database reset and seeded');
} finally {
  await database.close();
}

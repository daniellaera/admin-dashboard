import { createDatabase } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';
import { SEED_ADMIN, SEED_PASSWORD, seed } from '../db/seed.ts';
import { loadEnv } from '../env.ts';
import { createLogger } from '../lib/logger.ts';

const env = loadEnv();
if (env.NODE_ENV === 'production' && process.env.SEED_FORCE !== '1') {
  console.error('Refusing to seed a production database (set SEED_FORCE=1 to override).');
  process.exit(1);
}
const logger = createLogger(env);
const database = createDatabase(env.DATABASE_URL, logger);
try {
  await runMigrations(database.db);
  const result = await seed(database.db, { logger });
  logger.info(
    { ...result, personaPassword: SEED_PASSWORD, admin: SEED_ADMIN.email },
    'seeded — every persona signs in with the persona password; the admin with Admin1234!',
  );
} finally {
  await database.close();
}

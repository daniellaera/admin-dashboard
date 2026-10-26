import { createDatabase } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';
import { loadEnv } from '../env.ts';
import { createLogger } from '../lib/logger.ts';

const env = loadEnv();
const logger = createLogger(env);
const database = createDatabase(env.DATABASE_URL, logger);
try {
  await runMigrations(database.db);
  logger.info('migrations applied');
} finally {
  await database.close();
}

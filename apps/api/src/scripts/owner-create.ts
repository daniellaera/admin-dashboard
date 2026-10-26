import { createDatabase } from '../db/client.ts';
import { loadEnv } from '../env.ts';
import { createLogger } from '../lib/logger.ts';
import { createOwner, OwnerExistsError } from '../modules/auth/bootstrap.ts';

// Usage: pnpm owner:create <email> <password>
// Creates the single OWNER account (ADR-013). Refuses if an owner already exists.
const [, , email, password] = process.argv;
if (!email || !password) {
  console.error('usage: pnpm owner:create <email> <password>');
  process.exit(2);
}
if (password.length < 8) {
  console.error('the password must have at least 8 characters');
  process.exit(2);
}

const env = loadEnv();
const logger = createLogger(env);
const database = createDatabase(env.DATABASE_URL, logger);
try {
  const id = await createOwner(database.db, { email, password }, logger);
  console.error(`owner account ready (user id ${id})`);
} catch (err) {
  if (err instanceof OwnerExistsError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
} finally {
  await database.close();
}

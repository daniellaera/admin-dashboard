import { sql } from 'drizzle-orm';
import { inject } from 'vitest';
import { createDatabase, type Database } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { ALL_TABLES } from '../src/db/schema.ts';

let database: Database | undefined;
let migrated = false;

/** Shared connection to the test database (one per worker; files run sequentially). */
export async function testDatabase(): Promise<Database> {
  database ??= createDatabase(inject('databaseUrl'));
  if (!migrated) {
    await runMigrations(database.db);
    migrated = true;
  }
  return database;
}

/** Empties every application table and resets sequences. */
export async function truncateAll(): Promise<void> {
  const { db } = await testDatabase();
  await db.execute(sql.raw(`TRUNCATE TABLE ${ALL_TABLES.join(', ')} RESTART IDENTITY CASCADE`));
}

export async function closeTestDatabase(): Promise<void> {
  await database?.close();
  database = undefined;
  migrated = false;
}

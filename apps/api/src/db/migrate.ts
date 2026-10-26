import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Db } from './client.ts';

/**
 * Locates the `drizzle/` folder (SQL migrations + journal) whether the code runs from
 * `src/` (tsx), from the `dist/` bundle, or from the Docker image (MIGRATIONS_DIR).
 */
function resolveMigrationsDir(): string {
  const fromEnv = process.env.MIGRATIONS_DIR;
  if (fromEnv) return fromEnv;
  const candidates = [
    path.resolve(import.meta.dirname, '../../drizzle'), // src/db → apps/api/drizzle
    path.resolve(import.meta.dirname, '../drizzle'), // dist → apps/api/drizzle
    path.resolve(process.cwd(), 'drizzle'),
  ];
  const found = candidates.find((dir) => existsSync(path.join(dir, 'meta', '_journal.json')));
  if (!found) {
    throw new Error(
      `Could not find the drizzle migrations folder (tried ${candidates.join(', ')})`,
    );
  }
  return found;
}

/** Applies pending SQL migrations. Safe to run concurrently (Drizzle takes an advisory lock). */
export async function runMigrations(
  db: Db,
  migrationsFolder = resolveMigrationsDir(),
): Promise<void> {
  await migrate(db, { migrationsFolder });
}

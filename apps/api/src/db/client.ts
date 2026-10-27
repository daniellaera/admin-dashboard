import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { Logger } from 'pino';
import * as schema from './schema.ts';

// `pg` is CommonJS; named imports are not reliably detected under native ESM.
const { Pool } = pg;

export type Db = NodePgDatabase<typeof schema>;

export interface Database {
  db: Db;
  pool: pg.Pool;
  /** Readiness probe: a round-trip to the server. */
  ping: () => Promise<boolean>;
  close: () => Promise<void>;
}

export function createDatabase(connectionString: string, logger?: Logger): Database {
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => {
    logger?.error({ err }, 'postgres pool error');
  });
  const db = drizzle({ client: pool, schema });
  return {
    db,
    pool,
    ping: async () => {
      const res = await pool.query('select 1 as ok');
      return res.rowCount === 1;
    },
    close: () => pool.end(),
  };
}

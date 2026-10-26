import { serve } from '@hono/node-server';
import { readFileSync } from 'node:fs';
import { createApp } from './app.ts';
import { createDatabase } from './db/client.ts';
import { runMigrations } from './db/migrate.ts';
import { loadEnv } from './env.ts';
import { createLogger } from './lib/logger.ts';
import { bootstrapOwner } from './modules/auth/bootstrap.ts';
import { createCatalogService } from './modules/catalog/service.ts';

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return process.env.APP_VERSION ?? '0.0.0';
  }
}

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);
  const database = createDatabase(env.DATABASE_URL, logger);

  if (env.MIGRATE_ON_START) {
    await runMigrations(database.db);
    logger.info('database migrations up to date');
  }
  await createCatalogService(database.db).ensureDefaults();
  await bootstrapOwner(database.db, env, logger);

  const app = createApp({
    env,
    logger,
    db: database.db,
    version: readVersion(),
    readiness: { database: database.ping },
  });

  const server = serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
    logger.info({ port: info.port, env: env.NODE_ENV }, 'API listening');
  });

  let closing = false;
  const shutdown = (signal: string): void => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, 'shutting down');
    server.close((err) => {
      if (err) logger.error({ err }, 'error while closing the server');
      database
        .close()
        .catch((closeErr: unknown) => {
          logger.error({ err: closeErr }, 'error while closing the database pool');
        })
        .finally(() => {
          process.exit(err ? 1 : 0);
        });
    });
    // Force exit if connections linger (e.g. open SSE streams).
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

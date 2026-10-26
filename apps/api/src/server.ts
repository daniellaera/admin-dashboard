import { serve } from '@hono/node-server';
import { readFileSync } from 'node:fs';
import { createApp } from './app.ts';
import { loadEnv } from './env.ts';
import { createLogger } from './lib/logger.ts';

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

function main(): void {
  const env = loadEnv();
  const logger = createLogger(env);

  const app = createApp({
    env,
    logger,
    version: readVersion(),
    readiness: {},
  });

  const server = serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
    logger.info({ port: info.port, env: env.NODE_ENV }, 'API listening');
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'shutting down');
    server.close((err) => {
      if (err) {
        logger.error({ err }, 'error while closing the server');
        process.exit(1);
      }
      process.exit(0);
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

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

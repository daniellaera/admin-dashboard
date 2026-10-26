/** Shared knobs of the end-to-end suite; every value has a local-compose default. */

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
/** True when the stack is already running (CI image mode): nothing is started locally. */
export const IS_EXTERNAL_STACK = Boolean(process.env.E2E_BASE_URL);

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
export const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
export const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgres://devconnector:devconnector@localhost:5432/devconnector';

/**
 * Environment of the locally started API. Deliberately not read from `.env`: the suite must be
 * reproducible on any machine with the compose services up. Rate limits are lifted because
 * the suite logs in dozens of times per minute from one IP.
 */
export const API_ENV: Record<string, string> = {
  NODE_ENV: 'development',
  LOG_LEVEL: 'warn',
  PORT: '3000',
  APP_URL: BASE_URL,
  DATABASE_URL,
  MIGRATE_ON_START: 'true',
  AUTH_SECRET: 'e2e-only-secret-never-used-in-production-0123456789',
  AUTH_REQUIRE_EMAIL_VERIFICATION: 'true',
  SMTP_HOST: process.env.E2E_SMTP_HOST ?? 'localhost',
  SMTP_PORT: process.env.E2E_SMTP_PORT ?? '1025',
  MAIL_FROM: 'DevConnector E2E <no-reply@localhost>',
  UPLOADS_DIR: './data/e2e-uploads',
  RATE_LIMIT_LOGIN_PER_MINUTE: '1000',
  RATE_LIMIT_API_PER_MINUTE: '100000',
};

/** `process.env` plus overrides, without the `undefined` entries Playwright's `env` type rejects. */
export function processEnvWith(overrides: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) out[key] = value;
  return { ...out, ...overrides };
}

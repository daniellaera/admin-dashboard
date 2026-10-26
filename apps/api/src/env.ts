import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.url().default('http://localhost:5173'),
  TRUST_PROXY: bool.default(false),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL is required' }),
  MIGRATE_ON_START: bool.default(true),

  AUTH_SECRET: z.string().min(32, { error: 'AUTH_SECRET must be at least 32 characters' }),
  AUTH_REQUIRE_EMAIL_VERIFICATION: bool.default(true),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  COOKIE_SECURE: z.enum(['auto', 'true', 'false']).default('auto'),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  SEED_ADMIN_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: bool.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('DevConnector <no-reply@localhost>'),

  UPLOADS_DIR: z.string().default('./data/uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(50).default(2),

  RATE_LIMIT_LOGIN_PER_MINUTE: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_API_PER_MINUTE: z.coerce.number().int().positive().default(300),

  /** Directory of the built web app to serve as a SPA (production image). Unset = API only. */
  WEB_DIST: z.string().optional(),
  APP_NAME: z.string().default('DevConnector'),
});

export type Env = z.infer<typeof envSchema> & {
  /** Origin derived from APP_URL, e.g. `https://dev.example.com`. */
  appOrigin: string;
  /** Whether session cookies carry the `Secure` flag. */
  cookieSecure: boolean;
  githubEnabled: boolean;
};

export class EnvError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment:\n  - ${issues.join('\n  - ')}`);
    this.name = 'EnvError';
    this.issues = issues;
  }
}

/**
 * Parse and validate configuration. Empty strings count as unset (so `.env` files with
 * `KEY=` placeholders work). Fails fast with every problem listed.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, v]) => v !== undefined && v !== ''),
  );
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    throw new EnvError(
      result.error.issues.map((i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`),
    );
  }
  const env = result.data;
  const url = new URL(env.APP_URL);
  const githubEnabled = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  const cookieSecure =
    env.COOKIE_SECURE === 'auto' ? url.protocol === 'https:' : env.COOKIE_SECURE === 'true';
  return { ...env, appOrigin: url.origin, cookieSecure, githubEnabled };
}

/** Minimal valid environment for unit tests; override what a test cares about. */
export function testEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): Env {
  return loadEnv({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    AUTH_SECRET: 'test-secret-test-secret-test-secret-test-secret',
    APP_URL: 'http://localhost:5173',
    MIGRATE_ON_START: 'false',
    ...overrides,
  });
}

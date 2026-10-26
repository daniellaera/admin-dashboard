import type { Logger } from 'pino';
import type { Env } from './env.ts';

/** Request-scoped variables available on every Hono context. */
export interface AppVariables {
  requestId: string;
  log: Logger;
}

export interface AppEnv {
  Variables: AppVariables;
}

/** Dependencies injected into the app factory (real in server.ts, fakes in tests). */
export interface AppDeps {
  env: Env;
  logger: Logger;
  /** Readiness probes run by GET /ready; each resolves to true when healthy. */
  readiness: Record<string, () => Promise<boolean>>;
  /** Package version reported by GET /health. */
  version: string;
}

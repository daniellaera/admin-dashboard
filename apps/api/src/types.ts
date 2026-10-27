import type { Logger } from 'pino';
import type { Db } from './db/client.ts';
import type { Env } from './env.ts';
import type { EventBus } from './lib/events.ts';
import type { Storage } from './lib/storage.ts';
import type { CurrentUser } from './modules/auth/session.ts';

/** Request-scoped variables available on every Hono context. */
interface AppVariables {
  requestId: string;
  log: Logger;
  /** Whether X-Forwarded-* headers are trusted (TRUST_PROXY). */
  trustProxy: boolean;
  /** Set by the session middleware when a valid session cookie is present. */
  user?: CurrentUser;
  sessionId?: string;
}

export interface AppEnv {
  Variables: AppVariables;
}

/** Dependencies injected into the app factory (real in server.ts, fakes in tests). */
export interface AppDeps {
  env: Env;
  logger: Logger;
  db: Db;
  /** Readiness probes run by GET /ready; each resolves to true when healthy. */
  readiness: Record<string, () => Promise<boolean>>;
  /** Package version reported by GET /health. */
  version: string;
  /** Replaces the real GitHub client in tests. */
  fetchImpl?: typeof fetch;
  /** Event bus (Postgres-backed in production, in-memory by default). */
  events?: EventBus;
  /** File storage (local volume at UPLOADS_DIR by default). */
  storage?: Storage;
  /** SSE heartbeat interval override (tests use a short one). */
  sseHeartbeatMs?: number;
}

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { csrfProtection } from './lib/csrf.ts';
import { errorHandler, notFoundHandler, PayloadTooLargeError } from './lib/errors.ts';
import { createRateLimiter, rateLimit } from './lib/rate-limit.ts';
import { requestContext } from './lib/request-context.ts';
import { createGitHubClient } from './modules/auth/github.ts';
import { sessionMiddleware } from './modules/auth/middleware.ts';
import { authRoutes } from './modules/auth/routes.ts';
import { createAuthService } from './modules/auth/service.ts';
import { createSessionService } from './modules/auth/session.ts';
import { configRoutes } from './modules/config/routes.ts';
import { healthRoutes } from './modules/health/routes.ts';
import type { AppDeps, AppEnv } from './types.ts';

export const API_PREFIX = '/api/v1';
const JSON_BODY_LIMIT = 256 * 1024;

/**
 * Builds the HTTP application. Pure function of its dependencies so tests can construct it
 * with an in-memory logger and a test database; `server.ts` wires the real ones.
 */
export function createApp(deps: AppDeps) {
  const { env, logger, db } = deps;

  const sessions = createSessionService(db, env);
  const auth = createAuthService({ db, env, sessions, log: logger });
  const github = createGitHubClient(env, deps.fetchImpl);
  const apiLimiter = createRateLimiter({ windowMs: 60_000, max: env.RATE_LIMIT_API_PER_MINUTE });

  const api = new Hono<AppEnv>()
    .use(rateLimit(apiLimiter))
    .use(
      bodyLimit({
        maxSize: JSON_BODY_LIMIT,
        onError: () => {
          throw new PayloadTooLargeError('Request body too large');
        },
      }),
    )
    .use(sessionMiddleware(sessions))
    .route('/', healthRoutes(deps))
    .route('/', configRoutes(env))
    .route('/auth', authRoutes({ env, auth, github }));

  const app = new Hono<AppEnv>()
    .use(async (c, next) => {
      c.set('trustProxy', env.TRUST_PROXY);
      await next();
    })
    .use(requestContext(logger))
    .use(
      secureHeaders({
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          objectSrc: ["'none'"],
        },
        referrerPolicy: 'strict-origin-when-cross-origin',
        crossOriginEmbedderPolicy: false,
        strictTransportSecurity: env.cookieSecure ? 'max-age=31536000; includeSubDomains' : false,
        permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
      }),
    )
    // Rejects state-changing requests that a browser sent from another site (lib/csrf.ts).
    .use(`${API_PREFIX}/*`, csrfProtection(env.appOrigin))
    .route(API_PREFIX, api)
    .notFound(notFoundHandler)
    .onError(errorHandler);

  return app;
}

export type App = ReturnType<typeof createApp>;
/** Route typing for `hono/client` consumers. */
export type AppType = App;

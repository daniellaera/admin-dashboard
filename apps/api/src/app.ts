import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { csrfProtection } from './lib/csrf.ts';
import { errorHandler, notFoundHandler, PayloadTooLargeError } from './lib/errors.ts';
import { createMemoryEventBus } from './lib/events.ts';
import { createRateLimiter, rateLimit } from './lib/rate-limit.ts';
import { requestContext } from './lib/request-context.ts';
import { adminRoutes } from './modules/admin/routes.ts';
import { createAdminService } from './modules/admin/service.ts';
import { createAuditService } from './modules/audit/service.ts';
import { createGitHubClient } from './modules/auth/github.ts';
import { sessionMiddleware } from './modules/auth/middleware.ts';
import { authRoutes } from './modules/auth/routes.ts';
import { createAuthService } from './modules/auth/service.ts';
import { createSessionService } from './modules/auth/session.ts';
import { catalogRoutes } from './modules/catalog/routes.ts';
import { createCatalogService } from './modules/catalog/service.ts';
import { configRoutes } from './modules/config/routes.ts';
import { createCvService } from './modules/cv/service.ts';
import { healthRoutes } from './modules/health/routes.ts';
import { createInvitationsService } from './modules/invitations/service.ts';
import { meRoutes } from './modules/me/routes.ts';
import { commentsRoutes, postsRoutes } from './modules/posts/routes.ts';
import { createPostsService } from './modules/posts/service.ts';
import { profilesRoutes } from './modules/profiles/routes.ts';
import { createProfilesService } from './modules/profiles/service.ts';
import { createSettingsService } from './modules/settings/service.ts';
import type { AppDeps, AppEnv } from './types.ts';

export const API_PREFIX = '/api/v1';
const JSON_BODY_LIMIT = 256 * 1024;

/**
 * Builds the HTTP application. Pure function of its dependencies so tests can construct it
 * with an in-memory logger and a test database; `server.ts` wires the real ones.
 */
export function createApp(deps: AppDeps) {
  const { env, logger, db } = deps;
  const events = deps.events ?? createMemoryEventBus();

  const audit = createAuditService(db);
  const settings = createSettingsService(db, audit);
  const catalog = createCatalogService(db);
  const sessions = createSessionService(db, env);
  const invitations = createInvitationsService({ db, env, audit });
  const auth = createAuthService({ db, env, sessions, settings, invitations, audit, log: logger });
  const github = createGitHubClient(env, deps.fetchImpl);
  const profiles = createProfilesService(db, catalog);
  const cv = createCvService(db);
  const posts = createPostsService({ db, events, catalog, log: logger });
  const admin = createAdminService({
    db,
    log: logger,
    audit,
    invitations,
    applyRole: auth.applyRole,
  });
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
    .route('/', configRoutes(env, settings))
    .route('/catalog', catalogRoutes(catalog))
    .route('/auth', authRoutes({ env, auth, invitations, github }))
    .route('/me', meRoutes({ profiles, cv, posts }))
    .route('/profiles', profilesRoutes(profiles))
    .route('/posts', postsRoutes(posts))
    .route('/comments', commentsRoutes(posts))
    .route('/admin', adminRoutes({ admin, invitations, settings, audit, catalog }));

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

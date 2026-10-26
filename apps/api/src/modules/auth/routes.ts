import {
  type AuthResult,
  changePasswordSchema,
  deleteAccountSchema,
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenOnlySchema,
} from '@devconnector/shared';
import { Hono } from 'hono';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import { z } from 'zod';
import type { Env } from '../../env.ts';
import { AppError, UnauthorizedError, ValidationError } from '../../lib/errors.ts';
import { createRateLimiter, rateLimit } from '../../lib/rate-limit.ts';
import { clientIp, userAgent } from '../../lib/request-meta.ts';
import { validate } from '../../lib/validate.ts';
import type { AppEnv } from '../../types.ts';
import { generateState, type GitHubClient } from './github.ts';
import { currentUser, requireAuth } from './middleware.ts';
import type { AuthService } from './service.ts';
import { clearSessionCookie, type SessionMeta, setSessionCookie } from './session.ts';

const OAUTH_STATE_COOKIE = 'dc_oauth_state';

export interface AuthRouteDeps {
  env: Env;
  auth: AuthService;
  github: GitHubClient | null;
}

export function authRoutes({ env, auth, github }: AuthRouteDeps) {
  const perMinute = (max: number) => createRateLimiter({ windowMs: 60_000, max });
  const loginByIp = perMinute(env.RATE_LIMIT_LOGIN_PER_MINUTE);
  const loginFailuresByAccount = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });
  const registerByIp = createRateLimiter({ windowMs: 60 * 60_000, max: 5 });
  const mailByIp = createRateLimiter({ windowMs: 60 * 60_000, max: 10 });
  const mailByEmail = createRateLimiter({ windowMs: 15 * 60_000, max: 3 });

  const meta = (c: Parameters<typeof clientIp>[0]): SessionMeta => ({
    ip: clientIp(c),
    userAgent: userAgent(c),
  });

  /** Shared guard for the three "send me a link" endpoints: by IP and by e-mail address. */
  const mailRequestGuard = rateLimit(mailByIp);
  const emailKeyGuard = async (c: Parameters<typeof clientIp>[0], email: string) => {
    const { allowed, retryAfterSeconds } = mailByEmail.hit(`email:${email}`);
    if (!allowed)
      throw new AppError(429, 'Too many requests', {
        detail: `Try again in ${retryAfterSeconds} seconds`,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      });
    await Promise.resolve(c);
  };

  return (
    new Hono<AppEnv>()
      .post('/register', rateLimit(registerByIp), validate('json', registerSchema), async (c) => {
        const result = await auth.register(c.req.valid('json'), meta(c));
        if (result.token) setSessionCookie(c, result.token, env);
        const body: AuthResult = { me: result.me, needsVerification: result.needsVerification };
        return c.json(body, 201);
      })

      .post('/login', rateLimit(loginByIp), validate('json', loginSchema), async (c) => {
        const input = c.req.valid('json');
        const accountKey = `account:${input.email}`;
        // Account lockout: after 5 failures in 15 minutes every attempt is refused, even a
        // correct one, until the window passes (counter cleared by a later success).
        const lock = loginFailuresByAccount.isLimited(accountKey);
        if (lock.limited) {
          throw new AppError(429, 'Too many requests', {
            detail: `Too many failed attempts. Try again in ${lock.retryAfterSeconds} seconds`,
            headers: { 'Retry-After': String(lock.retryAfterSeconds) },
          });
        }
        try {
          const { me, token } = await auth.login(input, meta(c));
          loginFailuresByAccount.reset(accountKey);
          setSessionCookie(c, token, env);
          const body: AuthResult = { me, needsVerification: false };
          return c.json(body);
        } catch (err) {
          if (err instanceof UnauthorizedError) loginFailuresByAccount.hit(accountKey);
          throw err;
        }
      })

      .post('/logout', async (c) => {
        const sessionId = c.get('sessionId');
        if (sessionId) await auth.logout(sessionId);
        clearSessionCookie(c, env);
        return c.body(null, 204);
      })

      .post('/logout-all', requireAuth, async (c) => {
        await auth.logoutAll(currentUser(c).id);
        clearSessionCookie(c, env);
        return c.body(null, 204);
      })

      .get('/me', async (c) => {
        const user = c.get('user');
        if (!user) throw new UnauthorizedError();
        return c.json(await auth.me(user.id));
      })

      .get('/providers', (c) => c.json({ github: github !== null }))

      .post(
        '/resend-verification',
        mailRequestGuard,
        validate('json', emailOnlySchema),
        async (c) => {
          const { email } = c.req.valid('json');
          await emailKeyGuard(c, email);
          await auth.requestVerification(email);
          return c.body(null, 202);
        },
      )

      .post('/verify-email', validate('json', tokenOnlySchema), async (c) => {
        const { me, token } = await auth.verifyEmail(c.req.valid('json').token, meta(c));
        setSessionCookie(c, token, env);
        const body: AuthResult = { me, needsVerification: false };
        return c.json(body);
      })

      .post('/forgot-password', mailRequestGuard, validate('json', emailOnlySchema), async (c) => {
        const { email } = c.req.valid('json');
        await emailKeyGuard(c, email);
        await auth.forgotPassword(email);
        return c.body(null, 202);
      })

      .post('/reset-password', validate('json', resetPasswordSchema), async (c) => {
        const { token, password } = c.req.valid('json');
        await auth.resetPassword(token, password);
        clearSessionCookie(c, env);
        return c.body(null, 204);
      })

      .post('/magic-link', mailRequestGuard, validate('json', emailOnlySchema), async (c) => {
        const { email } = c.req.valid('json');
        await emailKeyGuard(c, email);
        await auth.requestMagicLink(email);
        return c.body(null, 202);
      })

      .post('/magic-link/consume', validate('json', tokenOnlySchema), async (c) => {
        const { me, token } = await auth.consumeMagicLink(c.req.valid('json').token, meta(c));
        setSessionCookie(c, token, env);
        const body: AuthResult = { me, needsVerification: false };
        return c.json(body);
      })

      .put('/password', requireAuth, validate('json', changePasswordSchema), async (c) => {
        const sessionId = c.get('sessionId');
        if (!sessionId) throw new UnauthorizedError();
        await auth.changePassword(currentUser(c).id, sessionId, c.req.valid('json'));
        return c.body(null, 204);
      })

      .delete('/account', requireAuth, validate('json', deleteAccountSchema), async (c) => {
        await auth.deleteAccount(currentUser(c).id, c.req.valid('json'));
        clearSessionCookie(c, env);
        return c.body(null, 204);
      })

      // ── GitHub OAuth ────────────────────────────────────────────────────────────
      .get('/github', async (c) => {
        if (!github)
          throw new AppError(404, 'Not found', { detail: 'GitHub sign-in is not configured' });
        const state = generateState();
        await setSignedCookie(c, OAUTH_STATE_COOKIE, state, env.AUTH_SECRET, {
          httpOnly: true,
          secure: env.cookieSecure,
          sameSite: 'Lax',
          path: '/api/v1/auth/github',
          maxAge: 600,
        });
        return c.redirect(github.authorizationUrl(state).toString(), 302);
      })

      .get(
        '/github/callback',
        validate(
          'query',
          z.object({
            code: z.string().min(1).optional(),
            state: z.string().min(1).optional(),
            error: z.string().optional(),
          }),
        ),
        async (c) => {
          const failure = (reason: string) =>
            c.redirect(`${env.APP_URL}/signin?error=${encodeURIComponent(reason)}`, 302);
          if (!github) return failure('github-disabled');
          const { code, state, error } = c.req.valid('query');
          const expected = await getSignedCookie(c, env.AUTH_SECRET, OAUTH_STATE_COOKIE);
          deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/api/v1/auth/github' });
          if (error || !code || !state || !expected || expected !== state)
            return failure('github-denied');
          try {
            const identity = await github.identityFromCode(code);
            const { token } = await auth.signInWithOAuth(
              { provider: 'github', ...identity },
              meta(c),
            );
            setSessionCookie(c, token, env);
            return c.redirect(`${env.APP_URL}/`, 302);
          } catch (err) {
            if (err instanceof AppError || err instanceof ValidationError) {
              c.get('log').warn({ err }, 'github sign-in failed');
              return failure(err.status === 403 ? 'github-forbidden' : 'github-failed');
            }
            throw err;
          }
        },
      )
  );
}

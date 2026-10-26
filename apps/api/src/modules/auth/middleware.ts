import type { Role } from '@devconnector/shared';
import type { Context, MiddlewareHandler } from 'hono';
import { ForbiddenError, UnauthorizedError } from '../../lib/errors.ts';
import type { AppEnv } from '../../types.ts';
import { type CurrentUser, readSessionCookie, type SessionService } from './session.ts';

/** Resolves the session cookie (if any) into `c.var.user`; never fails the request itself. */
export function sessionMiddleware(sessions: SessionService): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = readSessionCookie(c);
    if (token) {
      const resolved = await sessions.resolve(token);
      if (resolved) {
        c.set('user', resolved.user);
        c.set('sessionId', resolved.sessionId);
      }
    }
    await next();
  };
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('user')) throw new UnauthorizedError();
  await next();
};

export function requireRole(role: Role): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) throw new UnauthorizedError();
    if (user.role !== role) throw new ForbiddenError('This action requires the admin role');
    await next();
  };
}

/** The authenticated user, for handlers mounted behind `requireAuth`. */
export function currentUser(c: Context<AppEnv>): CurrentUser {
  const user = c.get('user');
  if (!user) throw new UnauthorizedError();
  return user;
}

export function isAdmin(user: CurrentUser | undefined): boolean {
  return user?.role === 'admin';
}

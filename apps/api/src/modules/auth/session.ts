import { LIMITS, type Role } from '@devconnector/shared';
import { and, eq, gt, lt, ne, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Db } from '../../db/client.ts';
import { sessions, users } from '../../db/schema.ts';
import type { Env } from '../../env.ts';
import { generateToken, hashToken } from '../../lib/tokens.ts';
import type { AppEnv } from '../../types.ts';

const SESSION_COOKIE = 'dc_session';
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

/** The authenticated principal attached to a request. */
export interface CurrentUser {
  id: number;
  email: string;
  role: Role;
  emailVerified: boolean;
  /** Sudo window of the current session (ADR-013), null when not active. */
  sudoUntil: Date | null;
}

export interface SessionMeta {
  ip: string | null;
  userAgent: string | null;
}

export interface SessionService {
  create(userId: number, meta: SessionMeta): Promise<string>;
  resolve(token: string): Promise<{ user: CurrentUser; sessionId: string } | null>;
  delete(sessionId: string): Promise<void>;
  deleteAllForUser(userId: number, exceptSessionId?: string): Promise<void>;
  /** Opens the sudo window on one session; returns its end. */
  grantSudo(sessionId: string): Promise<Date>;
  purgeExpired(): Promise<number>;
}

export function createSessionService(db: Db, env: Pick<Env, 'SESSION_TTL_DAYS'>): SessionService {
  const ttlMs = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  return {
    async create(userId, meta) {
      const token = generateToken();
      await db.insert(sessions).values({
        id: hashToken(token),
        userId,
        expiresAt: new Date(Date.now() + ttlMs),
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return token;
    },

    async resolve(token) {
      const id = hashToken(token);
      const now = new Date();
      const [row] = await db
        .select({
          sessionId: sessions.id,
          lastSeenAt: sessions.lastSeenAt,
          sudoUntil: sessions.sudoUntil,
          userId: users.id,
          email: users.email,
          role: users.role,
          emailVerifiedAt: users.emailVerifiedAt,
          disabledAt: users.disabledAt,
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)))
        .limit(1);
      if (!row) return null;
      if (row.disabledAt) {
        // A disabled account loses every session at once.
        await db.delete(sessions).where(eq(sessions.userId, row.userId));
        return null;
      }
      if (now.getTime() - row.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
        await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id));
      }
      return {
        sessionId: id,
        user: {
          id: row.userId,
          email: row.email,
          role: row.role,
          emailVerified: row.emailVerifiedAt !== null,
          sudoUntil:
            row.sudoUntil && row.sudoUntil.getTime() > now.getTime() ? row.sudoUntil : null,
        },
      };
    },

    async delete(sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    },

    async deleteAllForUser(userId, exceptSessionId) {
      await db
        .delete(sessions)
        .where(
          exceptSessionId
            ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
            : eq(sessions.userId, userId),
        );
    },

    async grantSudo(sessionId) {
      const until = new Date(Date.now() + LIMITS.sudoMinutes * 60 * 1000);
      await db.update(sessions).set({ sudoUntil: until }).where(eq(sessions.id, sessionId));
      return until;
    },

    async purgeExpired() {
      const deleted = await db
        .delete(sessions)
        .where(lt(sessions.expiresAt, sql`now()`))
        .returning({ id: sessions.id });
      return deleted.length;
    },
  };
}

export function readSessionCookie(c: Context<AppEnv>): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export function setSessionCookie(
  c: Context<AppEnv>,
  token: string,
  env: Pick<Env, 'cookieSecure' | 'SESSION_TTL_DAYS'>,
): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(c: Context<AppEnv>, env: Pick<Env, 'cookieSecure'>): void {
  deleteCookie(c, SESSION_COOKIE, {
    path: '/',
    secure: env.cookieSecure,
    httpOnly: true,
    sameSite: 'Lax',
  });
}

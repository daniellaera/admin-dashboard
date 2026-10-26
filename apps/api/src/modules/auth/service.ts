import type { AuthProvider, Me } from '@devconnector/shared';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { Db } from '../../db/client.ts';
import { authTokens, oauthAccounts, profiles, users } from '../../db/schema.ts';
import type { Env } from '../../env.ts';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../lib/errors.ts';
import { hashPassword, verifyPassword, wasteTimeLikeAVerification } from '../../lib/password.ts';
import { generateToken, hashToken } from '../../lib/tokens.ts';
import { enqueueMail } from '../../mail/outbox.ts';
import {
  accountExistsMail,
  magicLinkMail,
  passwordChangedMail,
  resetPasswordMail,
  verifyEmailMail,
} from '../../mail/templates.ts';
import { toMe } from '../users/mappers.ts';
import type { SessionMeta, SessionService } from './session.ts';

type TokenKind = (typeof authTokens.$inferSelect)['kind'];

const TOKEN_TTL_MS: Record<TokenKind, number> = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
  magic_link: 15 * 60 * 1000,
};

export const INVALID_CREDENTIALS = 'Invalid e-mail or password';

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super(403, 'E-mail not verified', {
      detail: 'Confirm your e-mail address first. We can send the confirmation link again.',
      type: 'email-not-verified',
    });
  }
}

export interface AuthDeps {
  db: Db;
  env: Env;
  sessions: SessionService;
  log: Logger;
  /** Hook run inside account deletion (e.g. remove avatar files). */
  onAccountDeleted?: (userId: number, avatarPath: string | null) => Promise<void>;
}

export interface AuthService {
  register(
    input: { email: string; password: string },
    meta: SessionMeta,
  ): Promise<{ me: Me | null; token: string | null; needsVerification: boolean }>;
  login(
    input: { email: string; password: string },
    meta: SessionMeta,
  ): Promise<{ me: Me; token: string }>;
  logout(sessionId: string): Promise<void>;
  logoutAll(userId: number): Promise<void>;
  me(userId: number): Promise<Me>;
  requestVerification(email: string): Promise<void>;
  verifyEmail(token: string, meta: SessionMeta): Promise<{ me: Me; token: string }>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  requestMagicLink(email: string): Promise<void>;
  consumeMagicLink(token: string, meta: SessionMeta): Promise<{ me: Me; token: string }>;
  changePassword(
    userId: number,
    currentSessionId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void>;
  deleteAccount(
    userId: number,
    confirmation: { password?: string | undefined; email?: string | undefined },
  ): Promise<void>;
  /** Creates (or links) the account for an OAuth identity and opens a session. */
  signInWithOAuth(
    identity: {
      provider: AuthProvider;
      providerUserId: string;
      email: string;
      emailVerified: boolean;
      username: string | null;
      website: string | null;
    },
    meta: SessionMeta,
  ): Promise<{ me: Me; token: string }>;
}

export function createAuthService(deps: AuthDeps): AuthService {
  const { db, env, sessions, log } = deps;
  const brand = { appName: env.APP_NAME, appUrl: env.APP_URL };
  const links = {
    signin: `${env.APP_URL}/signin`,
    forgot: `${env.APP_URL}/auth/forgot`,
    verify: (t: string) => `${env.APP_URL}/auth/verify?token=${t}`,
    reset: (t: string) => `${env.APP_URL}/auth/reset?token=${t}`,
    magic: (t: string) => `${env.APP_URL}/auth/magic?token=${t}`,
  };

  async function findUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  async function loadMe(userId: number): Promise<Me> {
    const [row] = await db
      .select({ user: users, profile: profiles })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new NotFoundError('User not found');
    const providers = await db
      .select({ provider: oauthAccounts.provider })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId));
    return toMe(
      row.user,
      row.profile,
      providers.map((p) => p.provider),
    );
  }

  /** Issues a one-time token, invalidating unused tokens of the same kind for the user. */
  async function issueToken(userId: number, kind: TokenKind): Promise<string> {
    const token = generateToken();
    await db.transaction(async (tx) => {
      await tx
        .delete(authTokens)
        .where(
          and(eq(authTokens.userId, userId), eq(authTokens.kind, kind), isNull(authTokens.usedAt)),
        );
      await tx.insert(authTokens).values({
        userId,
        kind,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS[kind]),
      });
    });
    return token;
  }

  /** Consumes a one-time token; returns the user id or throws a 400. */
  async function consumeToken(token: string, kind: TokenKind): Promise<number> {
    const [row] = await db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tokenHash, hashToken(token)),
          eq(authTokens.kind, kind),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) {
      throw new ValidationError(
        [{ path: 'token', message: 'This link is invalid or has expired' }],
        'Invalid token',
      );
    }
    await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id));
    return row.userId;
  }

  async function openSession(userId: number, meta: SessionMeta) {
    const token = await sessions.create(userId, meta);
    return { me: await loadMe(userId), token };
  }

  function ensureActive(user: { disabledAt: Date | null }): void {
    if (user.disabledAt) throw new ForbiddenError('This account has been disabled');
  }

  return {
    async register(input, meta) {
      const existing = await findUserByEmail(input.email);
      if (existing) {
        // Same response as a fresh registration (no account enumeration); tell the owner by mail.
        await enqueueMail(db, input.email, accountExistsMail(brand, links.signin, links.forgot));
        return { me: null, token: null, needsVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION };
      }
      const passwordHash = await hashPassword(input.password);
      const userId = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            email: input.email,
            passwordHash,
            emailVerifiedAt: env.AUTH_REQUIRE_EMAIL_VERIFICATION ? null : new Date(),
          })
          .returning({ id: users.id });
        if (!user) throw new Error('insert users returned nothing');
        await tx.insert(profiles).values({ userId: user.id });
        return user.id;
      });
      log.info({ userId }, 'user registered');
      if (env.AUTH_REQUIRE_EMAIL_VERIFICATION) {
        const token = await issueToken(userId, 'verify_email');
        await enqueueMail(db, input.email, verifyEmailMail(brand, links.verify(token)));
        return { me: null, token: null, needsVerification: true };
      }
      return { ...(await openSession(userId, meta)), needsVerification: false };
    },

    async login(input, meta) {
      const user = await findUserByEmail(input.email);
      if (!user?.passwordHash) {
        await wasteTimeLikeAVerification(input.password);
        throw new UnauthorizedError(INVALID_CREDENTIALS);
      }
      const check = await verifyPassword(user.passwordHash, input.password);
      if (!check.ok) throw new UnauthorizedError(INVALID_CREDENTIALS);
      ensureActive(user);
      if (env.AUTH_REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
        throw new EmailNotVerifiedError();
      }
      if (check.needsRehash) {
        await db
          .update(users)
          .set({ passwordHash: await hashPassword(input.password) })
          .where(eq(users.id, user.id));
        log.info({ userId: user.id }, 'legacy password hash upgraded to argon2id');
      }
      return openSession(user.id, meta);
    },

    logout: (sessionId) => sessions.delete(sessionId),
    logoutAll: (userId) => sessions.deleteAllForUser(userId),
    me: loadMe,

    async requestVerification(email) {
      const user = await findUserByEmail(email);
      if (!user || user.emailVerifiedAt || user.disabledAt) return;
      const token = await issueToken(user.id, 'verify_email');
      await enqueueMail(db, user.email, verifyEmailMail(brand, links.verify(token)));
    },

    async verifyEmail(token, meta) {
      const userId = await consumeToken(token, 'verify_email');
      await db
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new NotFoundError('User not found');
      ensureActive(user);
      return openSession(userId, meta);
    },

    async forgotPassword(email) {
      const user = await findUserByEmail(email);
      if (!user || user.disabledAt) return;
      const token = await issueToken(user.id, 'reset_password');
      await enqueueMail(db, user.email, resetPasswordMail(brand, links.reset(token)));
    },

    async resetPassword(token, password) {
      const userId = await consumeToken(token, 'reset_password');
      await db
        .update(users)
        // Proving control of the mailbox also verifies the address.
        .set({ passwordHash: await hashPassword(password), emailVerifiedAt: new Date() })
        .where(eq(users.id, userId));
      await sessions.deleteAllForUser(userId);
      log.info({ userId }, 'password reset');
    },

    async requestMagicLink(email) {
      const user = await findUserByEmail(email);
      // Magic links never create accounts (AUDIT SEC-18): unknown e-mails get nothing.
      if (!user || user.disabledAt) return;
      if (env.AUTH_REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
        // Clicking the link proves ownership, so send the verification link instead.
        const token = await issueToken(user.id, 'verify_email');
        await enqueueMail(db, user.email, verifyEmailMail(brand, links.verify(token)));
        return;
      }
      const token = await issueToken(user.id, 'magic_link');
      await enqueueMail(db, user.email, magicLinkMail(brand, links.magic(token)));
    },

    async consumeMagicLink(token, meta) {
      const userId = await consumeToken(token, 'magic_link');
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new NotFoundError('User not found');
      ensureActive(user);
      if (!user.emailVerifiedAt) {
        await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
      }
      return openSession(userId, meta);
    },

    async changePassword(userId, currentSessionId, input) {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new NotFoundError('User not found');
      if (!user.passwordHash) {
        throw new ConflictError(
          'This account has no password yet; use "Forgot password" to set one',
        );
      }
      const check = await verifyPassword(user.passwordHash, input.currentPassword);
      if (!check.ok) {
        throw new ValidationError([
          { path: 'currentPassword', message: 'Current password is incorrect' },
        ]);
      }
      await db
        .update(users)
        .set({ passwordHash: await hashPassword(input.newPassword) })
        .where(eq(users.id, userId));
      await sessions.deleteAllForUser(userId, currentSessionId);
      await enqueueMail(db, user.email, passwordChangedMail(brand, links.forgot));
    },

    async deleteAccount(userId, confirmation) {
      const [row] = await db
        .select({ user: users, avatarPath: profiles.avatarPath })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1);
      if (!row) throw new NotFoundError('User not found');
      if (row.user.passwordHash) {
        const ok = confirmation.password
          ? (await verifyPassword(row.user.passwordHash, confirmation.password)).ok
          : false;
        if (!ok)
          throw new ValidationError([{ path: 'password', message: 'Password is incorrect' }]);
      } else if (confirmation.email !== row.user.email) {
        throw new ValidationError([
          { path: 'email', message: 'Type your e-mail address to confirm' },
        ]);
      }
      await db.delete(users).where(eq(users.id, userId));
      await deps.onAccountDeleted?.(userId, row.avatarPath ?? null);
      log.info({ userId }, 'account deleted');
    },

    async signInWithOAuth(identity, meta) {
      const [linked] = await db
        .select({ userId: oauthAccounts.userId })
        .from(oauthAccounts)
        .where(
          and(
            eq(oauthAccounts.provider, identity.provider),
            eq(oauthAccounts.providerUserId, identity.providerUserId),
          ),
        )
        .limit(1);
      let userId: number;
      if (linked) {
        userId = linked.userId;
      } else {
        const existing = await findUserByEmail(identity.email);
        if (existing) {
          if (!identity.emailVerified) {
            throw new ForbiddenError(
              'Your GitHub e-mail address must be verified to link an existing account',
            );
          }
          userId = existing.id;
          if (!existing.emailVerifiedAt) {
            await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
          }
        } else {
          userId = await db.transaction(async (tx) => {
            const [user] = await tx
              .insert(users)
              .values({
                email: identity.email,
                emailVerifiedAt: identity.emailVerified ? new Date() : null,
              })
              .returning({ id: users.id });
            if (!user) throw new Error('insert users returned nothing');
            await tx
              .insert(profiles)
              .values({ userId: user.id, username: identity.username, website: identity.website });
            return user.id;
          });
          log.info({ userId, provider: identity.provider }, 'user created from OAuth identity');
        }
        await db
          .insert(oauthAccounts)
          .values({ provider: identity.provider, providerUserId: identity.providerUserId, userId })
          .onConflictDoNothing();
      }
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new NotFoundError('User not found');
      ensureActive(user);
      return openSession(userId, meta);
    },
  };
}

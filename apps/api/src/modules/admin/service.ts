import {
  type AdminStats,
  type AdminUser,
  type AdminUsersQuery,
  type AdminUserUpdateInput,
  displayNameOf,
} from '@devconnector/shared';
import { and, desc, eq, ilike, isNotNull, isNull, or, type SQL, sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { Db } from '../../db/client.ts';
import { comments, likes, posts, profiles, sessions, users } from '../../db/schema.ts';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.ts';
import { offsetOf, paginated } from '../../lib/pagination.ts';
import type { AuditService } from '../audit/service.ts';
import type { AuthService } from '../auth/service.ts';
import type { CurrentUser } from '../auth/session.ts';
import type { InvitationsService } from '../invitations/service.ts';
import { avatarUrlFor } from '../users/mappers.ts';

export interface AdminDeps {
  db: Db;
  log: Logger;
  audit: AuditService;
  invitations: InvitationsService;
  /** Role changes are applied by the auth service (revokes sessions, notifies). */
  applyRole: AuthService['applyRole'];
  /** Cleanup hook after a user row is deleted (e.g. avatar files). */
  onUserDeleted?: (userId: number) => Promise<void>;
}

/**
 * Users administration under the ADR-013 rules:
 * - the owner is untouchable (never demoted, disabled or deleted, by anyone);
 * - an admin may only act on `user` accounts and can never change a role;
 * - only the owner changes roles (to admin/user), and only for verified accounts.
 */
export function createAdminService({
  db,
  log,
  audit,
  invitations,
  applyRole,
  onUserDeleted,
}: AdminDeps) {
  const postCount = sql<number>`(select count(*)::int from ${posts} p where p.author_id = ${users.id})`;
  const lastSeen = sql<Date | null>`(select max(s.last_seen_at) from ${sessions} s where s.user_id = ${users.id})`;

  const selection = {
    user: users,
    username: profiles.username,
    avatarPath: profiles.avatarPath,
    postCount,
    lastSeenAt: lastSeen,
  };
  interface Row {
    user: typeof users.$inferSelect;
    username: string | null;
    avatarPath: string | null;
    postCount: number;
    lastSeenAt: Date | string | null;
  }

  const toAdminUser = (r: Row): AdminUser => ({
    id: r.user.id,
    email: r.user.email,
    role: r.user.role,
    disabled: r.user.disabledAt !== null,
    emailVerified: r.user.emailVerifiedAt !== null,
    createdAt: r.user.createdAt.toISOString(),
    lastSeenAt: r.lastSeenAt ? new Date(r.lastSeenAt).toISOString() : null,
    displayName: displayNameOf({ id: r.user.id, username: r.username }),
    avatarUrl: avatarUrlFor(r.avatarPath),
    postCount: r.postCount,
  });

  const query = () =>
    db.select(selection).from(users).leftJoin(profiles, eq(profiles.userId, users.id));

  async function getOne(id: number): Promise<AdminUser> {
    const [row] = await query().where(eq(users.id, id)).limit(1);
    if (!row) throw new NotFoundError('User not found');
    return toAdminUser(row);
  }

  /** Who may act on whom (disable/enable/delete). Role changes have their own rule in updateUser. */
  function assertCanActOn(actor: CurrentUser, target: AdminUser): void {
    if (target.role === 'owner') throw new ForbiddenError('The owner account cannot be modified');
    if (actor.id === target.id) throw new ForbiddenError('You cannot do this to your own account');
    if (actor.role === 'admin' && target.role !== 'user') {
      throw new ForbiddenError('Administrators can only act on regular user accounts');
    }
  }

  return {
    async stats(): Promise<AdminStats> {
      const [u] = await db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${users.disabledAt} is null)::int`,
          disabled: sql<number>`count(*) filter (where ${users.disabledAt} is not null)::int`,
          admins: sql<number>`count(*) filter (where ${users.role} in ('admin', 'owner'))::int`,
          verified: sql<number>`count(*) filter (where ${users.emailVerifiedAt} is not null)::int`,
        })
        .from(users);
      const [p] = await db
        .select({
          total: sql<number>`count(*)::int`,
          published: sql<number>`count(*) filter (where ${posts.published})::int`,
        })
        .from(posts);
      const [c] = await db.select({ count: sql<number>`count(*)::int` }).from(comments);
      const [l] = await db.select({ count: sql<number>`count(*)::int` }).from(likes);
      const recent = await query().orderBy(desc(users.createdAt), desc(users.id)).limit(5);
      return {
        users: u ?? { total: 0, active: 0, disabled: 0, admins: 0, verified: 0 },
        posts: p ?? { total: 0, published: 0 },
        comments: c?.count ?? 0,
        likes: l?.count ?? 0,
        pendingInvitations: await invitations.pendingCount(),
        recentUsers: recent.map(toAdminUser),
      };
    },

    async listUsers(q: AdminUsersQuery) {
      const filters: (SQL | undefined)[] = [
        q.q ? or(ilike(users.email, `%${q.q}%`), ilike(profiles.username, `%${q.q}%`)) : undefined,
        q.role ? eq(users.role, q.role) : undefined,
        q.status === 'active' ? isNull(users.disabledAt) : undefined,
        q.status === 'disabled' ? isNotNull(users.disabledAt) : undefined,
      ];
      const where = and(...filters);
      const rows = await query()
        .where(where)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(q.limit)
        .offset(offsetOf(q));
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(where);
      return paginated(rows.map(toAdminUser), q, total?.count ?? 0);
    },

    getUser: getOne,

    async updateUser(
      id: number,
      actor: CurrentUser,
      input: AdminUserUpdateInput,
      ip: string | null,
    ): Promise<AdminUser> {
      const target = await getOne(id);
      if (input.role !== undefined) {
        // Role changes: owner only (sudo is enforced by the route), never on the owner.
        if (actor.role !== 'owner') throw new ForbiddenError('Only the owner can change roles');
        if (target.role === 'owner') throw new ForbiddenError('The owner role cannot be changed');
        if (input.role === 'admin' && !target.emailVerified) {
          throw new ValidationError([
            {
              path: 'role',
              message: 'Only users with a verified e-mail can become administrators',
            },
          ]);
        }
        if (target.role !== input.role) {
          await applyRole(id, input.role, actor.id);
          await audit.record({
            action: 'role.change',
            actorId: actor.id,
            targetUserId: id,
            targetEmail: target.email,
            data: { from: target.role, to: input.role },
            ip,
          });
        }
      }
      if (input.disabled !== undefined) {
        assertCanActOn(actor, target);
        if (input.disabled !== target.disabled) {
          await db
            .update(users)
            .set({ disabledAt: input.disabled ? new Date() : null })
            .where(eq(users.id, id));
          if (input.disabled) await db.delete(sessions).where(eq(sessions.userId, id));
          await audit.record({
            action: input.disabled ? 'user.disable' : 'user.enable',
            actorId: actor.id,
            targetUserId: id,
            targetEmail: target.email,
            ip,
          });
        }
      }
      log.info({ targetId: id, actorId: actor.id, ...input }, 'admin updated user');
      return getOne(id);
    },

    async deleteUser(id: number, actor: CurrentUser, ip: string | null): Promise<void> {
      const target = await getOne(id);
      assertCanActOn(actor, target);
      await db.delete(users).where(eq(users.id, id));
      await onUserDeleted?.(id);
      await audit.record({
        action: 'user.delete',
        actorId: actor.id,
        targetEmail: target.email,
        data: { role: target.role },
        ip,
      });
      log.warn({ targetId: id, actorId: actor.id }, 'admin deleted user');
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;

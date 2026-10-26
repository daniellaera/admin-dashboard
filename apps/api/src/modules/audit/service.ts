import type { AuditAction, AuditEntryDto, AuditQuery } from '@devconnector/shared';
import { and, desc, eq, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db } from '../../db/client.ts';
import { type AuditData, auditLog, profiles, users } from '../../db/schema.ts';
import { offsetOf, paginated } from '../../lib/pagination.ts';
import { toAuthorCard } from '../users/mappers.ts';

export interface AuditEntryInput {
  action: AuditAction;
  actorId: number | null;
  targetUserId?: number | null;
  targetEmail?: string | null;
  data?: AuditData;
  ip?: string | null;
}

/** Append-only record of sensitive administrative actions (ADR-013). */
export function createAuditService(db: Db) {
  return {
    async record(entry: AuditEntryInput): Promise<void> {
      await db.insert(auditLog).values({
        action: entry.action,
        actorId: entry.actorId,
        targetUserId: entry.targetUserId ?? null,
        targetEmail: entry.targetEmail ?? null,
        data: entry.data ?? {},
        ip: entry.ip ?? null,
      });
    },

    async list(query: AuditQuery) {
      const actor = alias(users, 'actor');
      const actorProfile = alias(profiles, 'actor_profile');
      const filters: (SQL | undefined)[] = [
        query.action ? eq(auditLog.action, query.action) : undefined,
        query.userId ? eq(auditLog.targetUserId, query.userId) : undefined,
      ];
      const where = and(...filters);
      const rows = await db
        .select({
          entry: auditLog,
          actorUsername: actorProfile.username,
          actorAvatar: actorProfile.avatarPath,
        })
        .from(auditLog)
        .leftJoin(actor, eq(actor.id, auditLog.actorId))
        .leftJoin(actorProfile, eq(actorProfile.userId, actor.id))
        .where(where)
        .orderBy(desc(auditLog.id))
        .limit(query.limit)
        .offset(offsetOf(query));
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLog)
        .where(where);
      const items: AuditEntryDto[] = rows.map((r) => ({
        id: r.entry.id,
        action: r.entry.action,
        actor:
          r.entry.actorId === null
            ? null
            : toAuthorCard(
                { id: r.entry.actorId },
                { username: r.actorUsername, avatarPath: r.actorAvatar },
              ),
        targetUserId: r.entry.targetUserId,
        targetEmail: r.entry.targetEmail,
        data: r.entry.data,
        ip: r.entry.ip,
        createdAt: r.entry.createdAt.toISOString(),
      }));
      return paginated(items, query, total?.count ?? 0);
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;

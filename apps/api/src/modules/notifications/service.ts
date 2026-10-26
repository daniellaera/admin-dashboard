import {
  CONFIGURABLE_NOTIFICATION_TYPES,
  displayNameOf,
  type NotificationDto,
  type NotificationPreferenceDto,
  type NotificationPreferenceInput,
  type NotificationsQuery,
  type NotificationType,
} from '@devconnector/shared';
import { and, desc, eq, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Logger } from 'pino';
import type { Db } from '../../db/client.ts';
import {
  type NotificationData,
  notificationPreferences,
  notifications,
  profiles,
  users,
} from '../../db/schema.ts';
import type { Env } from '../../env.ts';
import { NotFoundError } from '../../lib/errors.ts';
import type { EventBus } from '../../lib/events.ts';
import { cursorPage } from '../../lib/pagination.ts';
import { enqueueMail } from '../../mail/outbox.ts';
import { notificationMail } from '../../mail/templates.ts';
import type { PostHooks } from '../posts/service.ts';
import { toAuthorCard } from '../users/mappers.ts';

export interface NotificationsDeps {
  db: Db;
  env: Env;
  events: EventBus;
  log: Logger;
}

interface NotifyInput {
  userId: number;
  type: NotificationType;
  actorId?: number | null;
  postId?: number | null;
  commentId?: number | null;
  data?: NotificationData;
}

const DEFAULTS: Record<NotificationType, { inApp: boolean; email: boolean }> = {
  comment: { inApp: true, email: false },
  like: { inApp: true, email: false },
  new_post: { inApp: false, email: false },
  system: { inApp: true, email: true },
};

/** Notifications (ADR-006): in-app inbox, per-user preferences, SSE push, optional e-mail. */
export function createNotificationsService({ db, env, events, log }: NotificationsDeps) {
  const brand = { appName: env.APP_NAME, appUrl: env.APP_URL };
  const preferencesUrl = `${env.APP_URL}/admin/notifications`;

  async function unreadCount(userId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return row?.count ?? 0;
  }

  async function preferenceFor(userId: number, type: NotificationType) {
    const [row] = await db
      .select({ inApp: notificationPreferences.inApp, email: notificationPreferences.email })
      .from(notificationPreferences)
      .where(
        and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.type, type)),
      );
    return row ?? DEFAULTS[type];
  }

  async function actorName(actorId: number | null | undefined): Promise<string> {
    if (!actorId) return 'Someone';
    const [row] = await db
      .select({ username: profiles.username })
      .from(profiles)
      .where(eq(profiles.userId, actorId));
    return displayNameOf({ id: actorId, username: row?.username ?? null });
  }

  async function publishUnread(
    userId: number,
    type: 'notification.created' | 'notification.read',
    notificationId?: number,
  ) {
    const unread = await unreadCount(userId);
    await events.publish({
      channel: `user:${userId}`,
      event:
        type === 'notification.created'
          ? { type, notificationId: notificationId ?? 0, unread }
          : { type, unread },
    });
  }

  /** Creates a notification honouring the recipient's preferences; `system` is always delivered. */
  async function notify(input: NotifyInput): Promise<void> {
    const [recipient] = await db
      .select({ email: users.email, disabledAt: users.disabledAt })
      .from(users)
      .where(eq(users.id, input.userId));
    if (!recipient || recipient.disabledAt) return;
    const pref =
      input.type === 'system' ? DEFAULTS.system : await preferenceFor(input.userId, input.type);
    if (!pref.inApp && !pref.email) return;

    if (pref.inApp) {
      const [row] = await db
        .insert(notifications)
        .values({
          userId: input.userId,
          type: input.type,
          actorId: input.actorId ?? null,
          postId: input.postId ?? null,
          commentId: input.commentId ?? null,
          data: input.data ?? {},
        })
        .returning({ id: notifications.id });
      await publishUnread(input.userId, 'notification.created', row?.id);
    }
    if (pref.email && input.type !== 'system') {
      const who = await actorName(input.actorId);
      const title = typeof input.data?.postTitle === 'string' ? input.data.postTitle : 'your post';
      const copy = {
        comment: {
          heading: 'New comment on your post',
          body: `${who} commented on "${title}".`,
          label: 'Read the comment',
        },
        like: {
          heading: 'Your post got a like',
          body: `${who} liked "${title}".`,
          label: 'Open the post',
        },
        new_post: {
          heading: 'New post published',
          body: `${who} published "${title}".`,
          label: 'Read the post',
        },
      }[input.type];
      await enqueueMail(
        db,
        recipient.email,
        notificationMail(brand, {
          ...copy,
          linkLabel: copy.label,
          link: input.postId ? `${env.APP_URL}/posts/${input.postId}` : env.APP_URL,
          preferencesUrl,
        }),
      );
    }
  }

  const actor = alias(users, 'actor');
  const actorProfile = alias(profiles, 'actor_profile');

  const hooks: PostHooks = {
    async commentCreated({ postId, postAuthorId, commentId, actorId, postTitle }) {
      if (postAuthorId === actorId) return;
      await notify({
        userId: postAuthorId,
        type: 'comment',
        actorId,
        postId,
        commentId,
        data: { postTitle },
      });
    },
    async likeCreated({ postId, postAuthorId, actorId, postTitle }) {
      if (postAuthorId === actorId) return;
      await notify({ userId: postAuthorId, type: 'like', actorId, postId, data: { postTitle } });
    },
    async postPublished({ postId, authorId, title }) {
      // Opt-in only: users who turned on `new_post` in-app or by e-mail.
      const subscribers = await db
        .select({ userId: notificationPreferences.userId })
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.type, 'new_post'),
            or(eq(notificationPreferences.inApp, true), eq(notificationPreferences.email, true)),
            ne(notificationPreferences.userId, authorId),
          ),
        );
      for (const { userId } of subscribers) {
        await notify({
          userId,
          type: 'new_post',
          actorId: authorId,
          postId,
          data: { postTitle: title },
        });
      }
      log.debug({ postId, recipients: subscribers.length }, 'new_post notifications sent');
    },
  };

  return {
    notify,
    hooks,
    unreadCount,

    async list(userId: number, query: NotificationsQuery) {
      const rows = await db
        .select({
          n: notifications,
          actorUsername: actorProfile.username,
          actorAvatar: actorProfile.avatarPath,
        })
        .from(notifications)
        .leftJoin(actor, eq(actor.id, notifications.actorId))
        .leftJoin(actorProfile, eq(actorProfile.userId, actor.id))
        .where(
          and(
            eq(notifications.userId, userId),
            query.cursor ? lt(notifications.id, query.cursor) : undefined,
            query.unreadOnly ? isNull(notifications.readAt) : undefined,
          ),
        )
        .orderBy(desc(notifications.id))
        .limit(query.limit + 1);
      const items: NotificationDto[] = rows.map((r) => ({
        id: r.n.id,
        type: r.n.type,
        createdAt: r.n.createdAt.toISOString(),
        readAt: r.n.readAt?.toISOString() ?? null,
        actor:
          r.n.actorId === null
            ? null
            : toAuthorCard(
                { id: r.n.actorId },
                { username: r.actorUsername, avatarPath: r.actorAvatar },
              ),
        postId: r.n.postId,
        commentId: r.n.commentId,
        data: r.n.data,
      }));
      return cursorPage(items, query.limit);
    },

    async markRead(userId: number, id: number): Promise<void> {
      const updated = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.id, id),
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
          ),
        )
        .returning({ id: notifications.id });
      if (updated.length === 0) {
        const [exists] = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
        if (!exists) throw new NotFoundError('Notification not found');
        return;
      }
      await publishUnread(userId, 'notification.read');
    },

    async markAllRead(userId: number): Promise<void> {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
      await publishUnread(userId, 'notification.read');
    },

    async remove(userId: number, id: number): Promise<void> {
      const deleted = await db
        .delete(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
        .returning({ id: notifications.id, readAt: notifications.readAt });
      if (deleted.length === 0) throw new NotFoundError('Notification not found');
      if (deleted[0]?.readAt === null) await publishUnread(userId, 'notification.read');
    },

    async getPreferences(userId: number): Promise<NotificationPreferenceDto[]> {
      const rows = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));
      return CONFIGURABLE_NOTIFICATION_TYPES.map((type) => {
        const row = rows.find((r) => r.type === type);
        return {
          type,
          inApp: row?.inApp ?? DEFAULTS[type].inApp,
          email: row?.email ?? DEFAULTS[type].email,
        };
      });
    },

    async setPreferences(
      userId: number,
      prefs: NotificationPreferenceInput[],
    ): Promise<NotificationPreferenceDto[]> {
      for (const pref of prefs) {
        await db
          .insert(notificationPreferences)
          .values({ userId, type: pref.type, inApp: pref.inApp, email: pref.email })
          .onConflictDoUpdate({
            target: [notificationPreferences.userId, notificationPreferences.type],
            set: { inApp: pref.inApp, email: pref.email },
          });
      }
      return this.getPreferences(userId);
    },
  };
}

export type NotificationsService = ReturnType<typeof createNotificationsService>;

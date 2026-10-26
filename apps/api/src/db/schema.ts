import { NOTIFICATION_TYPES, POST_TYPES, ROLES } from '@devconnector/shared';
import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Database schema (PostgreSQL 18). See TARGET.md §4 for the mapping from the legacy Prisma
 * model: `users.id` takes the legacy `Profile.id`, tags/skills are text[] columns, likes have
 * a composite primary key, every foreign key is indexed.
 */

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const userRole = pgEnum('user_role', ROLES);
export const postType = pgEnum('post_type', POST_TYPES);
export const notificationType = pgEnum('notification_type', NOTIFICATION_TYPES);
export const authTokenKind = pgEnum('auth_token_kind', [
  'verify_email',
  'reset_password',
  'magic_link',
]);
export const oauthProvider = pgEnum('oauth_provider', ['github']);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    /** Always stored lower-cased (normalised by the shared e-mail schema). */
    email: text('email').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'date' }),
    /** argon2id, or a legacy bcrypt hash imported from Supabase until the next login. Null = OAuth-only. */
    passwordHash: text('password_hash'),
    role: userRole('role').notNull().default('user'),
    disabledAt: timestamp('disabled_at', { withTimezone: true, mode: 'date' }),
    /** Supabase `auth.users.id` for imported accounts (traceability only). */
    legacyAuthId: uuid('legacy_auth_id'),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_email_key').on(t.email)],
);

export const profiles = pgTable(
  'profiles',
  {
    userId: integer('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    username: text('username'),
    website: text('website'),
    company: text('company'),
    bio: text('bio'),
    /** Relative path under UPLOADS_DIR, e.g. `avatars/12/ab12….webp`. */
    avatarPath: text('avatar_path'),
    isPublic: boolean('is_public').notNull().default(true),
    skills: text('skills')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ...timestamps,
  },
  (t) => [
    index('profiles_skills_gin').using('gin', t.skills),
    index('profiles_public_idx').on(t.isPublic, t.createdAt),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 (hex) of the opaque token held by the browser cookie. */
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
);

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    provider: oauthProvider('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerUserId] }),
    index('oauth_accounts_user_idx').on(t.userId),
  ],
);

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: authTokenKind('kind').notNull(),
    /** SHA-256 (hex) of the token in the e-mail link. */
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('auth_tokens_hash_key').on(t.tokenHash),
    index('auth_tokens_user_kind_idx').on(t.userId, t.kind),
  ],
);

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: postType('type').notNull().default('FUNNY'),
    title: text('title').notNull(),
    content: text('content').notNull(),
    published: boolean('published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
    viewCount: integer('view_count').notNull().default(0),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ...timestamps,
  },
  (t) => [
    index('posts_author_idx').on(t.authorId),
    index('posts_feed_idx').on(t.published, t.createdAt.desc()),
    index('posts_type_idx').on(t.type),
    index('posts_tags_gin').using('gin', t.tags),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('comments_post_idx').on(t.postId, t.createdAt.desc()),
    index('comments_author_idx').on(t.authorId),
  ],
);

export const likes = pgTable(
  'likes',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] }), index('likes_user_idx').on(t.userId)],
);

const cvPeriod = {
  startedOn: date('started_on', { mode: 'string' }).notNull(),
  endedOn: date('ended_on', { mode: 'string' }),
  isCurrent: boolean('is_current').notNull().default(false),
};

export const experiences = pgTable(
  'experiences',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    company: text('company').notNull(),
    location: text('location').notNull(),
    ...cvPeriod,
    ...timestamps,
  },
  (t) => [index('experiences_user_idx').on(t.userId, t.startedOn.desc())],
);

export const educations = pgTable(
  'educations',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    school: text('school').notNull(),
    description: text('description').notNull(),
    degree: text('degree').notNull(),
    fieldOfStudy: text('field_of_study').notNull(),
    ...cvPeriod,
    ...timestamps,
  },
  (t) => [index('educations_user_idx').on(t.userId, t.startedOn.desc())],
);

export type NotificationData = Record<string, string | number | boolean | null>;

export const notifications = pgTable(
  'notifications',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationType('type').notNull(),
    actorId: integer('actor_id').references(() => users.id, { onDelete: 'set null' }),
    postId: integer('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    commentId: integer('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
    data: jsonb('data').$type<NotificationData>().notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('notifications_user_idx').on(t.userId, t.createdAt.desc()),
    index('notifications_unread_idx')
      .on(t.userId)
      .where(sql`${t.readAt} IS NULL`),
  ],
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationType('type').notNull(),
    inApp: boolean('in_app').notNull().default(true),
    email: boolean('email').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.type] })],
);

export const emailOutbox = pgTable(
  'email_outbox',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    toEmail: text('to_email').notNull(),
    subject: text('subject').notNull(),
    html: text('html').notNull(),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (t) => [
    index('email_outbox_pending_idx')
      .on(t.nextAttemptAt)
      .where(sql`${t.sentAt} IS NULL`),
  ],
);

/** Every application table, in dependency order (used by tests and the reset script). */
export const ALL_TABLES = [
  'email_outbox',
  'notification_preferences',
  'notifications',
  'likes',
  'comments',
  'posts',
  'educations',
  'experiences',
  'auth_tokens',
  'oauth_accounts',
  'sessions',
  'profiles',
  'users',
] as const;

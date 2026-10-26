import {
  AUDIT_ACTIONS,
  INVITABLE_ROLES,
  NOTIFICATION_TYPES,
  POST_TYPES,
  REGISTRATION_MODES,
  ROLES,
} from '@devconnector/shared';
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
 * model: `users.id` takes the legacy `Profile.id`, tags/skills are text[] columns validated
 * against the catalog tables, likes have a composite primary key, every foreign key is indexed.
 * Roles and ownership rules: ADR-013.
 */

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

const timestamps = {
  createdAt: tz('created_at').notNull().defaultNow(),
  updatedAt: tz('updated_at')
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
export const invitationRole = pgEnum('invitation_role', INVITABLE_ROLES);
export const registrationMode = pgEnum('registration_mode', REGISTRATION_MODES);
export const auditAction = pgEnum('audit_action', AUDIT_ACTIONS);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    /** Always stored lower-cased (normalised by the shared e-mail schema). */
    email: text('email').notNull(),
    emailVerifiedAt: tz('email_verified_at'),
    /** argon2id, or a legacy bcrypt hash imported from Supabase until the next login. Null = OAuth-only. */
    passwordHash: text('password_hash'),
    role: userRole('role').notNull().default('user'),
    disabledAt: tz('disabled_at'),
    /** Supabase `auth.users.id` for imported accounts (traceability only). */
    legacyAuthId: uuid('legacy_auth_id'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_email_key').on(t.email),
    // ADR-013: exactly one owner.
    uniqueIndex('users_single_owner')
      .on(t.role)
      .where(sql`${t.role} = 'owner'`),
  ],
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
    createdAt: tz('created_at').notNull().defaultNow(),
    expiresAt: tz('expires_at').notNull(),
    lastSeenAt: tz('last_seen_at').notNull().defaultNow(),
    /** Sudo mode (ADR-013): sensitive admin actions allowed until this instant. */
    sudoUntil: tz('sudo_until'),
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
    createdAt: tz('created_at').notNull().defaultNow(),
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
    expiresAt: tz('expires_at').notNull(),
    usedAt: tz('used_at'),
    createdAt: tz('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('auth_tokens_hash_key').on(t.tokenHash),
    index('auth_tokens_user_kind_idx').on(t.userId, t.kind),
  ],
);

export const invitations = pgTable(
  'invitations',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    role: invitationRole('role').notNull(),
    tokenHash: text('token_hash').notNull(),
    invitedBy: integer('invited_by').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: tz('expires_at').notNull(),
    acceptedAt: tz('accepted_at'),
    acceptedBy: integer('accepted_by').references(() => users.id, { onDelete: 'set null' }),
    revokedAt: tz('revoked_at'),
    createdAt: tz('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('invitations_token_key').on(t.tokenHash),
    index('invitations_email_idx').on(t.email),
    index('invitations_pending_idx')
      .on(t.expiresAt)
      .where(sql`${t.acceptedAt} IS NULL AND ${t.revokedAt} IS NULL`),
  ],
);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<string | number | boolean | Record<string, unknown>>().notNull(),
  updatedAt: tz('updated_at').notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
});

export type AuditData = Record<string, string | number | boolean | null>;

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    action: auditAction('action').notNull(),
    actorId: integer('actor_id').references(() => users.id, { onDelete: 'set null' }),
    targetUserId: integer('target_user_id').references(() => users.id, { onDelete: 'set null' }),
    /** Kept so entries stay meaningful after the target account is deleted. */
    targetEmail: text('target_email'),
    data: jsonb('data').$type<AuditData>().notNull().default({}),
    ip: text('ip'),
    createdAt: tz('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('audit_log_created_idx').on(t.createdAt.desc()),
    index('audit_log_target_idx').on(t.targetUserId),
    index('audit_log_action_idx').on(t.action),
  ],
);

export const catalogSkills = pgTable('catalog_skills', {
  value: text('value').primaryKey(),
  label: text('label').notNull(),
  createdAt: tz('created_at').notNull().defaultNow(),
});

export const catalogTags = pgTable('catalog_tags', {
  value: text('value').primaryKey(),
  label: text('label').notNull(),
  createdAt: tz('created_at').notNull().defaultNow(),
});

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
    publishedAt: tz('published_at'),
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
    createdAt: tz('created_at').notNull().defaultNow(),
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
    createdAt: tz('created_at').notNull().defaultNow(),
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
    readAt: tz('read_at'),
    createdAt: tz('created_at').notNull().defaultNow(),
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
    createdAt: tz('created_at').notNull().defaultNow(),
    nextAttemptAt: tz('next_attempt_at').notNull().defaultNow(),
    sentAt: tz('sent_at'),
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
  'audit_log',
  'invitations',
  'settings',
  'auth_tokens',
  'oauth_accounts',
  'sessions',
  'profiles',
  'users',
] as const;

/** Catalog tables are reference data: tests re-seed them instead of truncating them. */
export const CATALOG_TABLES = ['catalog_skills', 'catalog_tags'] as const;

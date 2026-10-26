import { inArray, sql, TransactionRollbackError } from 'drizzle-orm';
import pg from 'pg';
import type { Logger } from 'pino';
import type { FilesService } from '../modules/files/service.ts';
import type { Db } from './client.ts';
import {
  catalogSkills,
  catalogTags,
  comments,
  educations,
  experiences,
  likes,
  oauthAccounts,
  posts,
  profiles,
  users,
} from './schema.ts';

// `pg` is CommonJS; named imports are not reliably detected under native ESM.
const { Pool } = pg;

const BCRYPT = /^\$2[abxy]\$/;
const POST_TYPES = new Set(['FUNNY', 'TECH', 'RANDOM', 'NEWS', 'SERIOUS']);

/* ── Shapes of the legacy tables (Prisma schema on `main`, Supabase `auth` schema) ───────── */

interface LegacyProfile {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  avatarUrl: string | null;
  username: string | null;
  website: string | null;
  company: string | null;
  bio: string | null;
  authorEmail: string;
  isPublic: boolean;
}
interface LegacyAuthUser {
  id: string;
  email: string | null;
  encrypted_password: string | null;
  email_confirmed_at: Date | null;
  created_at: Date | null;
}
interface LegacyIdentity {
  user_id: string;
  provider_id: string | null;
  sub: string | null;
}
interface LegacyPost {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  title: string;
  content: string;
  published: boolean;
  viewCount: number;
  profileId: number;
}
interface LegacyComment {
  id: number;
  createdAt: Date;
  text: string;
  postId: number;
  profileId: number;
}
interface LegacyLike {
  postId: number;
  profileId: number;
  createdAt: Date;
}
interface LegacyPeriod {
  id: number;
  description: string;
  from_date: string;
  to_date: string | null;
  current: boolean;
  createdAt: Date;
  updatedAt: Date;
  profileId: number;
}
interface LegacyExperience extends LegacyPeriod {
  title: string;
  company: string;
  location: string;
}
interface LegacyEducation extends LegacyPeriod {
  school: string;
  degree: string;
  fieldOfStudy: string;
}

/* ── Options and report ──────────────────────────────────────────────────────────────────── */

export interface ImportOptions {
  /** Scratch PostgreSQL holding the restored Supabase dump (never the live project). */
  sourceUrl: string;
  /** Target database with the new schema migrated. */
  db: Db;
  /** Compute the report inside a transaction, then roll everything back. */
  dryRun?: boolean;
  /** Keep the legacy `isPublic` flag instead of the new default (public, D-013 Q4). */
  keepVisibility?: boolean;
  /** Download avatars from the Supabase public bucket and run them through the avatar pipeline. */
  avatars?: { supabaseUrl: string; files: FilesService } | undefined;
  fetchImpl?: typeof fetch;
  logger?: Logger;
}

export interface ImportReport {
  dryRun: boolean;
  counts: {
    users: number;
    profiles: number;
    oauthAccounts: number;
    posts: number;
    comments: number;
    likes: number;
    experiences: number;
    educations: number;
    avatars: number;
  };
  /** Profiles whose e-mail has no `auth.users` row: imported without password, unverified. */
  profilesWithoutAuth: string[];
  /** `auth.users` rows without a profile: imported with an empty profile. */
  authWithoutProfile: string[];
  /** Legacy accounts merged into an existing target account with the same e-mail. */
  mergedIntoExisting: string[];
  unknownSkills: string[];
  unknownTags: string[];
  duplicateLikes: number;
  visibilityForcedPublic: number;
  skipped: { table: string; id: number | string; reason: string }[];
  avatarFailures: { userId: number; url: string; reason: string }[];
}

const emptyReport = (dryRun: boolean): ImportReport => ({
  dryRun,
  counts: {
    users: 0,
    profiles: 0,
    oauthAccounts: 0,
    posts: 0,
    comments: 0,
    likes: 0,
    experiences: 0,
    educations: 0,
    avatars: 0,
  },
  profilesWithoutAuth: [],
  authWithoutProfile: [],
  mergedIntoExisting: [],
  unknownSkills: [],
  unknownTags: [],
  duplicateLikes: 0,
  visibilityForcedPublic: 0,
  skipped: [],
  avatarFailures: [],
});

/* ── Reading the dump ────────────────────────────────────────────────────────────────────── */

interface Source {
  profiles: LegacyProfile[];
  skills: Map<number, string[]>;
  auth: LegacyAuthUser[];
  identities: LegacyIdentity[];
  posts: LegacyPost[];
  tags: Map<number, string[]>;
  comments: LegacyComment[];
  likes: LegacyLike[];
  experiences: LegacyExperience[];
  educations: LegacyEducation[];
}

async function readSource(sourceUrl: string): Promise<Source> {
  const pool = new Pool({ connectionString: sourceUrl, max: 2 });
  const rows = async <T extends pg.QueryResultRow>(text: string): Promise<T[]> =>
    (await pool.query<T>(text)).rows;
  const exists = async (table: string) =>
    (await pool.query<{ ok: string | null }>('select to_regclass($1) as ok', [table])).rows[0]
      ?.ok != null;
  const groupBy = (list: { key: number; value: string }[]) => {
    const map = new Map<number, string[]>();
    for (const row of list) map.set(row.key, [...(map.get(row.key) ?? []), row.value]);
    return map;
  };
  try {
    const period = (table: string, cols: string) =>
      `select id, ${cols}, description, to_char("from", 'YYYY-MM-DD') as from_date,
              to_char("to", 'YYYY-MM-DD') as to_date, current, "createdAt", "updatedAt", "profileId"
       from public."${table}" order by id`;
    return {
      profiles: await rows<LegacyProfile>(
        `select id, "createdAt", "updatedAt", "avatarUrl", username, website, company, bio,
                "authorEmail", "isPublic" from public."Profile" order by id`,
      ),
      skills: groupBy(
        await rows<{ key: number; value: string }>(
          `select "profileId" as key, value from public."ProgrammingLanguage" order by id`,
        ),
      ),
      auth: (await exists('auth.users'))
        ? await rows<LegacyAuthUser>(
            `select id, email, encrypted_password, email_confirmed_at, created_at from auth.users`,
          )
        : [],
      identities: (await exists('auth.identities'))
        ? await rows<LegacyIdentity>(
            `select user_id, provider_id, identity_data->>'sub' as sub
             from auth.identities where provider = 'github'`,
          )
        : [],
      posts: await rows<LegacyPost>(
        `select id, "createdAt", "updatedAt", type::text as type, title, content, published,
                "viewCount", "profileId" from public."Post" order by id`,
      ),
      tags: groupBy(
        await rows<{ key: number; value: string }>(
          `select "postId" as key, value from public."Tags" order by id`,
        ),
      ),
      comments: await rows<LegacyComment>(
        `select id, "createdAt", text, "postId", "profileId" from public."Comment" order by id`,
      ),
      likes: await rows<LegacyLike>(
        `select "postId", "profileId", "createdAt" from public."Like" order by id`,
      ),
      experiences: await rows<LegacyExperience>(period('Experiences', 'title, company, location')),
      educations: await rows<LegacyEducation>(
        period('Education', 'school, degree, "fieldOfStudy"'),
      ),
    };
  } finally {
    await pool.end();
  }
}

/* ── Import ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Imports a restored Supabase dump into the new schema (ADR-012). Ids of profiles, posts,
 * comments and CV rows are preserved so existing URLs keep working; e-mails are lower-cased;
 * bcrypt hashes are copied verbatim and rehashed to argon2id on the next login. Everything runs
 * in one transaction; `dryRun` rolls it back after computing the report. Re-runs are idempotent.
 */
export async function importSupabase(options: ImportOptions): Promise<ImportReport> {
  const { db, logger } = options;
  const report = emptyReport(options.dryRun ?? false);
  const source = await readSource(options.sourceUrl);
  logger?.info(
    {
      profiles: source.profiles.length,
      authUsers: source.auth.length,
      posts: source.posts.length,
      comments: source.comments.length,
      likes: source.likes.length,
    },
    'legacy data read',
  );

  const knownSkills = new Set((await db.select().from(catalogSkills)).map((s) => s.value));
  const knownTags = new Set((await db.select().from(catalogTags)).map((t) => t.value));
  const authByEmail = new Map<string, LegacyAuthUser>();
  for (const a of source.auth) if (a.email) authByEmail.set(a.email.trim().toLowerCase(), a);

  /** legacy profile id → target user id (differs only when merged into an existing account) */
  const userIdOf = new Map<number, number>();
  /** legacy auth uuid → target user id (for GitHub identities) */
  const userIdOfAuth = new Map<string, number>();
  const avatarJobs: { userId: number; url: string }[] = [];

  const skip = (table: string, id: number | string, reason: string) => {
    report.skipped.push({ table, id, reason });
  };

  try {
    await db.transaction(async (tx) => {
      // Accounts that already exist in the target (e.g. the owner) are merged by e-mail.
      const legacyEmails = source.profiles.map((p) => p.authorEmail.trim().toLowerCase());
      const existing = legacyEmails.length
        ? await tx
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(inArray(users.email, legacyEmails))
        : [];
      const existingByEmail = new Map(existing.map((u) => [u.email, u.id]));

      // 1. Profiles → users + profiles (ids preserved)
      const seenEmails = new Set<string>();
      for (const p of source.profiles) {
        const email = p.authorEmail.trim().toLowerCase();
        if (seenEmails.has(email)) {
          skip('Profile', p.id, `duplicate e-mail ${email}`);
          continue;
        }
        seenEmails.add(email);
        const auth = authByEmail.get(email);
        if (!auth) report.profilesWithoutAuth.push(email);
        const bcryptHash =
          auth?.encrypted_password && BCRYPT.test(auth.encrypted_password)
            ? auth.encrypted_password
            : null;

        let userId = existingByEmail.get(email);
        if (userId !== undefined && userId !== p.id) {
          report.mergedIntoExisting.push(email);
        } else {
          const [row] = await tx
            .insert(users)
            .values({
              id: p.id,
              email,
              emailVerifiedAt: auth?.email_confirmed_at ?? null,
              passwordHash: bcryptHash,
              role: 'user',
              legacyAuthId: auth?.id ?? null,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            })
            .onConflictDoUpdate({
              target: users.id,
              set: {
                email: sql`excluded.email`,
                legacyAuthId: sql`excluded.legacy_auth_id`,
                emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, excluded.email_verified_at)`,
                // Never downgrade a hash that was already rehashed to argon2id after a first import.
                passwordHash: sql`coalesce(${users.passwordHash}, excluded.password_hash)`,
              },
            })
            .returning({ id: users.id });
          if (!row) throw new Error(`user upsert returned nothing for profile ${String(p.id)}`);
          userId = row.id;
          report.counts.users += 1;
        }
        userIdOf.set(p.id, userId);
        if (auth) userIdOfAuth.set(auth.id, userId);

        const skills = source.skills.get(p.id) ?? [];
        for (const s of skills)
          if (!knownSkills.has(s) && !report.unknownSkills.includes(s))
            report.unknownSkills.push(s);
        const isPublic = options.keepVisibility ? p.isPublic : true;
        if (!options.keepVisibility && !p.isPublic) report.visibilityForcedPublic += 1;
        await tx
          .insert(profiles)
          .values({
            userId,
            username: p.username,
            website: p.website,
            company: p.company,
            bio: p.bio,
            isPublic,
            skills: [...new Set(skills)],
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })
          .onConflictDoUpdate({
            target: profiles.userId,
            set: {
              username: sql`excluded.username`,
              website: sql`excluded.website`,
              company: sql`excluded.company`,
              bio: sql`excluded.bio`,
              isPublic: sql`excluded.is_public`,
              skills: sql`excluded.skills`,
            },
          });
        report.counts.profiles += 1;
        if (p.avatarUrl) avatarJobs.push({ userId, url: p.avatarUrl });
      }

      // Explicit ids were inserted: move the sequence past them before serial inserts.
      await resetSequence(tx, 'users');

      // 2. auth.users without a profile → account with an empty profile
      for (const a of source.auth) {
        const email = a.email?.trim().toLowerCase();
        if (!email || seenEmails.has(email)) continue;
        seenEmails.add(email);
        report.authWithoutProfile.push(email);
        const [row] = await tx
          .insert(users)
          .values({
            email,
            emailVerifiedAt: a.email_confirmed_at,
            passwordHash:
              a.encrypted_password && BCRYPT.test(a.encrypted_password)
                ? a.encrypted_password
                : null,
            role: 'user',
            legacyAuthId: a.id,
            createdAt: a.created_at ?? new Date(),
          })
          .onConflictDoUpdate({
            target: users.email,
            set: { legacyAuthId: sql`excluded.legacy_auth_id` },
          })
          .returning({ id: users.id });
        if (!row) continue;
        userIdOfAuth.set(a.id, row.id);
        await tx.insert(profiles).values({ userId: row.id }).onConflictDoNothing();
        report.counts.users += 1;
        report.counts.profiles += 1;
      }

      // 3. GitHub identities → oauth_accounts
      for (const identity of source.identities) {
        const userId = userIdOfAuth.get(identity.user_id);
        const providerUserId = identity.provider_id ?? identity.sub;
        if (!userId || !providerUserId) {
          skip('auth.identities', identity.user_id, 'no matching user or provider id');
          continue;
        }
        await tx
          .insert(oauthAccounts)
          .values({ provider: 'github', providerUserId, userId })
          .onConflictDoNothing();
        report.counts.oauthAccounts += 1;
      }

      // 4. Posts (ids preserved), tags validated against the catalog
      const postIds = new Set<number>();
      for (const p of source.posts) {
        const authorId = userIdOf.get(p.profileId);
        if (!authorId) {
          skip('Post', p.id, `unknown author profile ${String(p.profileId)}`);
          continue;
        }
        const tags = [...new Set(source.tags.get(p.id) ?? [])];
        for (const t of tags)
          if (!knownTags.has(t) && !report.unknownTags.includes(t)) report.unknownTags.push(t);
        await tx
          .insert(posts)
          .values({
            id: p.id,
            authorId,
            type: POST_TYPES.has(p.type) ? (p.type as 'FUNNY') : 'FUNNY',
            title: p.title,
            content: p.content,
            published: p.published,
            publishedAt: p.published ? p.createdAt : null,
            viewCount: p.viewCount,
            tags,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })
          .onConflictDoUpdate({
            target: posts.id,
            set: {
              title: sql`excluded.title`,
              content: sql`excluded.content`,
              published: sql`excluded.published`,
              tags: sql`excluded.tags`,
            },
          });
        postIds.add(p.id);
        report.counts.posts += 1;
      }
      await resetSequence(tx, 'posts');

      // 5. Comments (ids preserved)
      for (const c of source.comments) {
        const authorId = userIdOf.get(c.profileId);
        if (!authorId || !postIds.has(c.postId)) {
          skip('Comment', c.id, 'unknown author or post');
          continue;
        }
        await tx
          .insert(comments)
          .values({ id: c.id, postId: c.postId, authorId, body: c.text, createdAt: c.createdAt })
          .onConflictDoNothing();
        report.counts.comments += 1;
      }
      await resetSequence(tx, 'comments');

      // 6. Likes: the new primary key collapses duplicates
      let likeRows = 0;
      for (const l of source.likes) {
        const userId = userIdOf.get(l.profileId);
        if (!userId || !postIds.has(l.postId)) {
          skip('Like', `${String(l.postId)}/${String(l.profileId)}`, 'unknown user or post');
          continue;
        }
        likeRows += 1;
        const inserted = await tx
          .insert(likes)
          .values({ postId: l.postId, userId, createdAt: l.createdAt })
          .onConflictDoNothing()
          .returning({ postId: likes.postId });
        report.counts.likes += inserted.length;
      }
      report.duplicateLikes = likeRows - report.counts.likes;

      // 7. CV rows (ids preserved; a current position has no end date)
      for (const e of source.experiences) {
        const userId = userIdOf.get(e.profileId);
        if (!userId) {
          skip('Experiences', e.id, 'unknown profile');
          continue;
        }
        await tx
          .insert(experiences)
          .values({
            id: e.id,
            userId,
            title: e.title,
            description: e.description,
            company: e.company,
            location: e.location,
            startedOn: e.from_date,
            endedOn: e.current ? null : e.to_date,
            isCurrent: e.current,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          })
          .onConflictDoNothing();
        report.counts.experiences += 1;
      }
      await resetSequence(tx, 'experiences');
      for (const e of source.educations) {
        const userId = userIdOf.get(e.profileId);
        if (!userId) {
          skip('Education', e.id, 'unknown profile');
          continue;
        }
        await tx
          .insert(educations)
          .values({
            id: e.id,
            userId,
            school: e.school,
            description: e.description,
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy,
            startedOn: e.from_date,
            endedOn: e.current ? null : e.to_date,
            isCurrent: e.current,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          })
          .onConflictDoNothing();
        report.counts.educations += 1;
      }
      await resetSequence(tx, 'educations');

      if (options.dryRun) tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }

  // 8. Avatars (after the commit; skipped in a dry run)
  if (options.avatars && !options.dryRun) {
    const fetchImpl = options.fetchImpl ?? fetch;
    const base = options.avatars.supabaseUrl.replace(/\/$/, '');
    for (const job of avatarJobs) {
      const url = /^https?:\/\//.test(job.url)
        ? job.url
        : `${base}/storage/v1/object/public/images/${job.url.replace(/^\/+/, '')}`;
      try {
        const res = await fetchImpl(url);
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
        await options.avatars.files.uploadAvatar(job.userId, Buffer.from(await res.arrayBuffer()));
        report.counts.avatars += 1;
      } catch (error) {
        report.avatarFailures.push({
          userId: job.userId,
          url,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } else {
    report.counts.avatars = 0;
  }

  logger?.info(
    report.counts,
    options.dryRun ? 'dry run complete (rolled back)' : 'import complete',
  );
  return report;
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

async function resetSequence(tx: Tx, table: string): Promise<void> {
  await tx.execute(
    sql.raw(
      `select setval(pg_get_serial_sequence('${table}', 'id'), coalesce((select max(id) from ${table}), 0) + 1, false)`,
    ),
  );
}

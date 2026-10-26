import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import pino from 'pino';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { importSupabase } from '../../src/db/import-supabase.ts';
import {
  comments,
  educations,
  experiences,
  likes,
  oauthAccounts,
  posts,
  profiles,
  users,
} from '../../src/db/schema.ts';
import { createLocalStorage } from '../../src/lib/storage.ts';
import { createFilesService } from '../../src/modules/files/service.ts';
import { testDatabase, truncateAll } from '../db.ts';
import { buildApp, json, sessionCookie, TEST_UPLOADS_DIR } from '../helpers.ts';

const { Client } = pg;

const ALICE_AUTH_ID = '11111111-1111-4111-8111-111111111111';
const CAROL_AUTH_ID = '33333333-3333-4333-8333-333333333333';
const ALICE_PASSWORD = 'Secret123!';

/** A tiny "Supabase-shaped" scratch database: Prisma tables in public, auth.users/identities. */
async function createLegacyDatabase(adminUrl: string): Promise<string> {
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query('drop database if exists devconnector_legacy_src');
  await admin.query('create database devconnector_legacy_src');
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = '/devconnector_legacy_src';
  const legacy = new Client({ connectionString: url.toString() });
  await legacy.connect();
  const bcryptHash = bcrypt.hashSync(ALICE_PASSWORD, 10);
  await legacy.query(`
    create schema auth;
    create table auth.users (id uuid primary key, email text, encrypted_password text,
      email_confirmed_at timestamptz, created_at timestamptz, raw_app_meta_data jsonb);
    create table auth.identities (id uuid, user_id uuid, provider text, provider_id text, identity_data jsonb);
    create type "PostType" as enum ('FUNNY','TECH','RANDOM','NEWS','SERIOUS');
    create table "Profile" (id serial primary key, "createdAt" timestamptz default now(), "updatedAt" timestamptz default now(),
      "avatarUrl" text, username text, website text, company text, bio text, "authorEmail" text unique not null,
      "isPublic" boolean default false);
    create table "ProgrammingLanguage" (id serial primary key, value text, label text, "profileId" int);
    create table "Post" (id serial primary key, "createdAt" timestamptz default now(), "updatedAt" timestamptz default now(),
      type "PostType" default 'FUNNY', title text, content text, published boolean default false, "viewCount" int default 0, "profileId" int);
    create table "Tags" (id serial primary key, value text, label text, "postId" int);
    create table "Comment" (id serial primary key, "createdAt" timestamptz default now(), text text, "postId" int, "profileId" int);
    create table "Like" (id serial primary key, "createdAt" timestamptz default now(), "postId" int, "profileId" int);
    create table "Experiences" (id serial primary key, title text, description text, company text, location text,
      "from" date, "to" date, current boolean default true, "createdAt" timestamptz default now(), "updatedAt" timestamptz default now(), "profileId" int);
    create table "Education" (id serial primary key, school text, description text, degree text, "fieldOfStudy" text,
      "from" date, "to" date, current boolean default true, "createdAt" timestamptz default now(), "updatedAt" timestamptz default now(), "profileId" int);

    insert into auth.users values
      ('${ALICE_AUTH_ID}', 'Alice@Example.com', '${bcryptHash}', '2023-02-01T10:00:00Z', '2023-01-01T00:00:00Z', '{"provider":"email"}'),
      ('${CAROL_AUTH_ID}', 'carol@example.com', null, '2023-03-01T10:00:00Z', '2023-03-01T00:00:00Z', '{"provider":"github"}');
    insert into auth.identities values
      ('44444444-4444-4444-8444-444444444444', '${CAROL_AUTH_ID}', 'github', '987654', '{"sub":"987654"}');
    insert into "Profile" (id, "avatarUrl", username, website, company, bio, "authorEmail", "isPublic") values
      (1, 'avatars/alice.png', 'alice', 'https://alice.dev', 'ACME', 'Hi', 'Alice@Example.com', false),
      (2, null, 'bob', null, null, null, 'bob@example.com', true);
    insert into "ProgrammingLanguage" (value, label, "profileId") values ('typescript','TypeScript',1), ('cobol','COBOL',1), ('typescript','TypeScript',1);
    insert into "Post" (id, type, title, content, published, "viewCount", "profileId") values
      (10, 'TECH', 'Hello', 'World', true, 7, 1),
      (11, 'FUNNY', 'Draft', 'Not yet', false, 0, 2),
      (12, 'NEWS', 'Orphan', 'author gone', true, 0, 99);
    insert into "Tags" (value, label, "postId") values ('engineering','Engineering',10), ('weird','Weird',10);
    insert into "Comment" (id, text, "postId", "profileId") values (100, 'Nice', 10, 2), (101, 'orphan', 12, 1);
    insert into "Like" ("postId", "profileId") values (10, 2), (10, 2), (10, 1);
    insert into "Experiences" (id, title, description, company, location, "from", "to", current, "profileId") values
      (5, 'Engineer', 'Built', 'ACME', 'Remote', '2020-01-15', '2021-01-15', true, 1);
    insert into "Education" (id, school, description, degree, "fieldOfStudy", "from", "to", current, "profileId") values
      (6, 'MIT', 'Studied', 'BSc', 'CS', '2015-09-01', '2019-06-30', false, 1);
  `);
  await legacy.end();
  return url.toString();
}

describe('import from a Supabase dump (ADR-012)', () => {
  let sourceUrl: string;
  const fetched: string[] = [];
  const png = sharp({ create: { width: 8, height: 8, channels: 3, background: '#3366ff' } })
    .png()
    .toBuffer();
  const fetchImpl: typeof fetch = async (input) => {
    fetched.push(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    return new Response(new Uint8Array(await png), { status: 200 });
  };

  beforeAll(async () => {
    sourceUrl = await createLegacyDatabase(inject('databaseUrl'));
    await truncateAll();
  });
  afterAll(async () => {
    const admin = new Client({ connectionString: inject('databaseUrl') });
    await admin.connect();
    await admin.query('drop database if exists devconnector_legacy_src');
    await admin.end();
  });

  it('dry run reports the mapping and writes nothing', async () => {
    const { db } = await testDatabase();
    const report = await importSupabase({
      sourceUrl,
      db,
      dryRun: true,
      logger: pino({ level: 'silent' }),
    });
    expect(report.dryRun).toBe(true);
    expect(report.counts).toMatchObject({ users: 3, profiles: 3, posts: 2, comments: 1, likes: 2 });
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('imports accounts, content and avatars with ids preserved; bcrypt logins rehash to argon2id', async () => {
    const { db } = await testDatabase();
    const files = createFilesService({
      db,
      storage: createLocalStorage(TEST_UPLOADS_DIR),
      maxUploadBytes: 2 * 1024 * 1024,
      log: pino({ level: 'silent' }),
    });
    const report = await importSupabase({
      sourceUrl,
      db,
      avatars: { supabaseUrl: 'https://ref.supabase.co/', files },
      fetchImpl,
    });

    expect(report.counts).toEqual({
      users: 3,
      profiles: 3,
      oauthAccounts: 1,
      posts: 2,
      comments: 1,
      likes: 2,
      experiences: 1,
      educations: 1,
      avatars: 1,
    });
    expect(report.duplicateLikes).toBe(1);
    expect(report.unknownSkills).toEqual(['cobol']);
    expect(report.unknownTags).toEqual(['weird']);
    expect(report.profilesWithoutAuth).toEqual(['bob@example.com']);
    expect(report.authWithoutProfile).toEqual(['carol@example.com']);
    expect(report.visibilityForcedPublic).toBe(1);
    expect(report.skipped.map((s) => `${s.table}:${String(s.id)}`)).toEqual([
      'Post:12',
      'Comment:101',
    ]);
    expect(fetched).toEqual([
      'https://ref.supabase.co/storage/v1/object/public/images/avatars/alice.png',
    ]);

    // Alice: id kept, e-mail lower-cased, verified, bcrypt hash copied, avatar processed.
    const [alice] = await db.select().from(users).where(eq(users.id, 1));
    expect(alice).toMatchObject({
      email: 'alice@example.com',
      legacyAuthId: ALICE_AUTH_ID,
      role: 'user',
    });
    expect(alice?.emailVerifiedAt).not.toBeNull();
    expect(alice?.passwordHash).toMatch(/^\$2[ab]\$/);
    const [aliceProfile] = await db.select().from(profiles).where(eq(profiles.userId, 1));
    expect(aliceProfile).toMatchObject({ username: 'alice', company: 'ACME', isPublic: true });
    expect(aliceProfile?.skills).toEqual(['typescript', 'cobol']);
    expect(aliceProfile?.avatarPath).toMatch(/^avatars\/1\/[a-f0-9]+\.webp$/);

    // Bob: no auth row → unverified, no password. Carol: auth-only → empty profile + GitHub identity.
    const [bob] = await db.select().from(users).where(eq(users.id, 2));
    expect(bob).toMatchObject({
      email: 'bob@example.com',
      passwordHash: null,
      emailVerifiedAt: null,
    });
    const [carol] = await db.select().from(users).where(eq(users.email, 'carol@example.com'));
    expect(carol?.legacyAuthId).toBe(CAROL_AUTH_ID);
    expect(await db.select().from(oauthAccounts)).toEqual([
      expect.objectContaining({ provider: 'github', providerUserId: '987654', userId: carol?.id }),
    ]);

    // Content: ids preserved, orphans skipped, duplicates collapsed, current position without end date.
    expect((await db.select().from(posts)).map((p) => p.id).sort()).toEqual([10, 11]);
    const [hello] = await db.select().from(posts).where(eq(posts.id, 10));
    expect(hello).toMatchObject({
      authorId: 1,
      type: 'TECH',
      published: true,
      viewCount: 7,
      tags: ['engineering', 'weird'],
    });
    expect(hello?.publishedAt).not.toBeNull();
    expect(await db.select().from(comments)).toEqual([
      expect.objectContaining({ id: 100, postId: 10, authorId: 2, body: 'Nice' }),
    ]);
    expect(await db.select().from(likes)).toHaveLength(2);
    expect(await db.select().from(experiences)).toEqual([
      expect.objectContaining({
        id: 5,
        userId: 1,
        startedOn: '2020-01-15',
        endedOn: null,
        isCurrent: true,
      }),
    ]);
    expect(await db.select().from(educations)).toEqual([
      expect.objectContaining({
        id: 6,
        startedOn: '2015-09-01',
        endedOn: '2019-06-30',
        isCurrent: false,
      }),
    ]);

    // Sequences moved past the imported ids.
    const [fresh] = await db
      .insert(users)
      .values({ email: 'new@example.com' })
      .returning({ id: users.id });
    expect(fresh?.id).toBeGreaterThan(3);
    const [freshPost] = await db
      .insert(posts)
      .values({ authorId: 1, title: 't', content: 'c' })
      .returning({ id: posts.id });
    expect(freshPost?.id).toBe(12); // 10 and 11 imported, 12 was skipped

    // The migrated bcrypt password works once, then the hash is argon2id.
    const app = await buildApp();
    const login = await json(app, 'POST', '/auth/login', {
      email: 'alice@example.com',
      password: ALICE_PASSWORD,
    });
    expect(login.status).toBe(200);
    expect(sessionCookie(login)).not.toBeNull();
    const [rehashed] = await db.select().from(users).where(eq(users.id, 1));
    expect(rehashed?.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('is idempotent: a second run keeps counts, ids and an argon2id hash made in between', async () => {
    const { db } = await testDatabase();
    await importSupabase({ sourceUrl, db });
    const app = await buildApp();
    expect(
      (
        await json(app, 'POST', '/auth/login', {
          email: 'alice@example.com',
          password: ALICE_PASSWORD,
        })
      ).status,
    ).toBe(200);
    const again = await importSupabase({ sourceUrl, db });
    expect(again.counts).toMatchObject({ users: 3, profiles: 3, posts: 2, comments: 1 });
    expect(again.counts.likes).toBe(0); // already there: the primary key collapses them
    expect(await db.select().from(posts)).toHaveLength(2);
    expect(await db.select().from(users)).toHaveLength(3);
    const [alice] = await db.select().from(users).where(eq(users.id, 1));
    expect(alice?.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('merges a legacy profile into an existing account with the same e-mail', async () => {
    await truncateAll();
    const { db } = await testDatabase();
    const [owner] = await db
      .insert(users)
      .values({ id: 50, email: 'alice@example.com', role: 'owner', emailVerifiedAt: new Date() })
      .returning({ id: users.id });
    await db.insert(profiles).values({ userId: owner!.id });
    const report = await importSupabase({ sourceUrl, db });
    expect(report.mergedIntoExisting).toEqual(['alice@example.com']);
    const [hello] = await db.select().from(posts).where(eq(posts.id, 10));
    expect(hello?.authorId).toBe(owner!.id);
    const [ownerRow] = await db.select().from(users).where(eq(users.id, owner!.id));
    expect(ownerRow?.role).toBe('owner');
  });
});

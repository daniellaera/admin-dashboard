import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { comments, likes, posts, profiles, users } from '../../src/db/schema.ts';
import { seed, SEED_ADMIN } from '../../src/db/seed.ts';
import { testDatabase } from '../db.ts';

/** Drizzle wraps driver errors ("Failed query: …"); the PostgreSQL error is the `cause`. */
async function expectUniqueViolation(promise: Promise<unknown>): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(Error);
  const cause = (caught as Error & { cause?: { code?: string } }).cause ?? caught;
  expect((cause as { code?: string }).code).toBe('23505');
}

describe('database schema', () => {
  it('applies every migration and exposes the expected tables', async () => {
    const { db } = await testDatabase();
    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`,
    );
    const names = rows.rows.map((r) => r.table_name);
    expect(names).toEqual(
      expect.arrayContaining([
        'users',
        'profiles',
        'sessions',
        'oauth_accounts',
        'auth_tokens',
        'posts',
        'comments',
        'likes',
        'experiences',
        'educations',
        'notifications',
        'notification_preferences',
        'email_outbox',
      ]),
    );
  });

  it('enforces unique e-mails and one like per user and post', async () => {
    const { db } = await testDatabase();
    const [u] = await db.insert(users).values({ email: 'a@b.co' }).returning({ id: users.id });
    await expectUniqueViolation(db.insert(users).values({ email: 'a@b.co' }));

    const [p] = await db
      .insert(posts)
      .values({ authorId: u!.id, title: 't', content: 'c' })
      .returning({ id: posts.id });
    await db.insert(likes).values({ postId: p!.id, userId: u!.id });
    await expectUniqueViolation(db.insert(likes).values({ postId: p!.id, userId: u!.id }));
  });

  it('cascades a user deletion to profile, posts, comments and likes', async () => {
    const { db } = await testDatabase();
    const [author] = await db.insert(users).values({ email: 'author@x.io' }).returning();
    const [reader] = await db.insert(users).values({ email: 'reader@x.io' }).returning();
    await db.insert(profiles).values({ userId: author!.id, username: 'author' });
    const [post] = await db
      .insert(posts)
      .values({ authorId: author!.id, title: 't', content: 'c', published: true })
      .returning();
    await db.insert(comments).values({ postId: post!.id, authorId: reader!.id, body: 'hi' });
    await db.insert(likes).values({ postId: post!.id, userId: reader!.id });

    await db.delete(users).where(eq(users.id, author!.id));

    expect(await db.select().from(posts)).toHaveLength(0);
    expect(await db.select().from(comments)).toHaveLength(0);
    expect(await db.select().from(likes)).toHaveLength(0);
    expect(await db.select().from(profiles)).toHaveLength(0);
    expect(await db.select().from(users)).toHaveLength(1); // the reader survives
  });

  it('seeds idempotently', async () => {
    const { db } = await testDatabase();
    const first = await seed(db);
    const second = await seed(db);
    expect(second).toEqual(first);
    expect(first.users).toBe(6); // 4 personas + owner + admin
    expect(first.posts).toBe(6);
    const [admin] = await db.select().from(users).where(eq(users.email, SEED_ADMIN.email));
    expect(admin?.role).toBe('admin');
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(comments);
    expect(row?.count).toBe(2);
  });
});

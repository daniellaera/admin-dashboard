import type { Role } from '@devconnector/shared';
import { comments, posts, profiles, sessions, users } from '../src/db/schema.ts';
import { generateToken, hashToken } from '../src/lib/tokens.ts';
import { testDatabase } from './db.ts';

let seq = 0;

export interface TestUser {
  id: number;
  email: string;
  cookie: string;
}

/**
 * Inserts a verified user with a profile and an open session (no password hashing — fast).
 * The cookie value is what a browser would send back. `sudo: true` opens the sudo window.
 */
export async function createUser(
  options: {
    email?: string;
    role?: Role;
    username?: string | null;
    isPublic?: boolean;
    disabled?: boolean;
    verified?: boolean;
    company?: string | null;
    sudo?: boolean;
    passwordHash?: string | null;
  } = {},
): Promise<TestUser> {
  const { db } = await testDatabase();
  seq += 1;
  const email = options.email ?? `user${seq}@example.test`;
  const [user] = await db
    .insert(users)
    .values({
      email,
      role: options.role ?? 'user',
      emailVerifiedAt: options.verified === false ? null : new Date(),
      disabledAt: options.disabled ? new Date() : null,
      passwordHash: options.passwordHash ?? null,
    })
    .returning({ id: users.id });
  if (!user) throw new Error('factory: insert users failed');
  await db.insert(profiles).values({
    userId: user.id,
    username: options.username === undefined ? `dev${seq}` : options.username,
    isPublic: options.isPublic ?? true,
    company: options.company ?? null,
  });
  const token = generateToken();
  await db.insert(sessions).values({
    id: hashToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + 86_400_000),
    sudoUntil: options.sudo ? new Date(Date.now() + 10 * 60_000) : null,
  });
  return { id: user.id, email, cookie: `dc_session=${token}` };
}

export async function createPost(
  authorId: number,
  options: {
    title?: string;
    content?: string;
    published?: boolean;
    type?: 'FUNNY' | 'TECH';
    tags?: string[];
  } = {},
): Promise<number> {
  const { db } = await testDatabase();
  seq += 1;
  const [row] = await db
    .insert(posts)
    .values({
      authorId,
      title: options.title ?? `Post ${seq}`,
      content: options.content ?? 'Lorem ipsum',
      published: options.published ?? true,
      publishedAt: (options.published ?? true) ? new Date() : null,
      type: options.type ?? 'TECH',
      tags: options.tags ?? [],
    })
    .returning({ id: posts.id });
  if (!row) throw new Error('factory: insert posts failed');
  return row.id;
}

export async function createComment(
  postId: number,
  authorId: number,
  body = 'nice',
): Promise<number> {
  const { db } = await testDatabase();
  const [row] = await db
    .insert(comments)
    .values({ postId, authorId, body })
    .returning({ id: comments.id });
  if (!row) throw new Error('factory: insert comments failed');
  return row.id;
}

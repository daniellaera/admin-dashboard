import { eq, sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import { hashPassword } from '../lib/password.ts';
import type { Db } from './client.ts';
import { comments, educations, experiences, likes, posts, profiles, users } from './schema.ts';

/** Development password shared by every seeded persona (never used outside dev/test). */
export const SEED_PASSWORD = 'Password123!';
export const SEED_ADMIN = { email: 'admin@devconnector.local', password: 'Admin1234!' } as const;

interface Persona {
  email: string;
  username: string;
  website?: string;
  company?: string;
  bio?: string;
  skills?: string[];
  posts: {
    title: string;
    content: string;
    type?: 'FUNNY' | 'TECH' | 'RANDOM' | 'NEWS' | 'SERIOUS';
    tags?: string[];
  }[];
}

/** The four personas of the original Prisma seed, plus a little more life. */
const PERSONAS: Persona[] = [
  {
    email: 'hulk@marvel.com',
    username: 'Hulk Green',
    bio: 'Smashing bugs since 1962.',
    skills: ['typescript', 'rust'],
    posts: [
      {
        title: 'Where does it come from?',
        content:
          'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old.',
        type: 'TECH',
        tags: ['engineering', 'programming'],
      },
      {
        title: 'Why do we use it?',
        content:
          'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.',
        type: 'FUNNY',
        tags: ['productivity'],
      },
    ],
  },
  {
    email: 'matthewlaing@gmail.com',
    username: 'Matthew Laing',
    website: 'https://matthewlaing.io',
    company: 'Matthew&Co',
    skills: ['python', 'golang'],
    posts: [
      {
        title: 'Join the community chat',
        content: 'We moved our discussions to a self-hosted chat. Come say hi!',
        type: 'NEWS',
        tags: ['tech'],
      },
    ],
  },
  {
    email: 'ken@jimmy.io',
    username: 'Ken Jimmy',
    skills: ['java', 'kotlin', 'scala'],
    posts: [
      {
        title: "Words which don't look",
        content:
          'Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" by Cicero, written in 45 BC.',
        type: 'RANDOM',
        tags: ['computerscience'],
      },
      {
        title: 'Why do we use it? (part 2)',
        content:
          'Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text.',
        type: 'SERIOUS',
        tags: ['joblife', 'productivity'],
      },
    ],
  },
  {
    email: 'randysmith@gmail.com',
    username: 'Randy Smith',
    website: 'https://randysmith.io',
    company: 'Randy&Co',
    skills: ['devops' as never, 'rust'].filter((s) => s !== 'devops'),
    posts: [
      {
        title: 'Ask a question about the project on GitHub',
        content: 'Open a discussion and we will get back to you.',
        type: 'TECH',
        tags: ['devops', 'it'],
      },
    ],
  },
];

export interface SeedOptions {
  /** Create the admin account (default true). */
  admin?: boolean;
  logger?: Logger;
}

/**
 * Idempotent development seed: upserts users by e-mail and posts by (author, title), so running
 * it twice yields the same database. Returns the ids it touched.
 */
export async function seed(
  db: Db,
  options: SeedOptions = {},
): Promise<{ users: number; posts: number }> {
  const log = options.logger;
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const userIds = new Map<string, number>();

  for (const persona of PERSONAS) {
    const [user] = await db
      .insert(users)
      .values({ email: persona.email, passwordHash, emailVerifiedAt: new Date() })
      .onConflictDoUpdate({
        target: users.email,
        set: { emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` },
      })
      .returning({ id: users.id });
    if (!user) throw new Error(`seed: could not upsert ${persona.email}`);
    userIds.set(persona.email, user.id);

    await db
      .insert(profiles)
      .values({
        userId: user.id,
        username: persona.username,
        website: persona.website ?? null,
        company: persona.company ?? null,
        bio: persona.bio ?? null,
        skills: persona.skills ?? [],
        isPublic: true,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          username: persona.username,
          website: persona.website ?? null,
          company: persona.company ?? null,
          bio: persona.bio ?? null,
          skills: persona.skills ?? [],
        },
      });

    for (const post of persona.posts) {
      const existing = await db
        .select({ id: posts.id })
        .from(posts)
        .where(sql`${posts.authorId} = ${user.id} and ${posts.title} = ${post.title}`)
        .limit(1);
      if (existing.length === 0) {
        await db.insert(posts).values({
          authorId: user.id,
          title: post.title,
          content: post.content,
          type: post.type ?? 'FUNNY',
          tags: post.tags ?? [],
          published: true,
          publishedAt: new Date(),
        });
      }
    }
  }

  if (options.admin !== false) {
    const [admin] = await db
      .insert(users)
      .values({
        email: SEED_ADMIN.email,
        passwordHash: await hashPassword(SEED_ADMIN.password),
        emailVerifiedAt: new Date(),
        role: 'admin',
      })
      .onConflictDoUpdate({ target: users.email, set: { role: 'admin' } })
      .returning({ id: users.id });
    if (admin) {
      await db
        .insert(profiles)
        .values({ userId: admin.id, username: 'Admin', isPublic: false })
        .onConflictDoNothing();
      userIds.set(SEED_ADMIN.email, admin.id);
    }
  }

  // A few interactions so the feed, counters and notifications have something to show.
  const hulk = userIds.get('hulk@marvel.com');
  const ken = userIds.get('ken@jimmy.io');
  const matthew = userIds.get('matthewlaing@gmail.com');
  if (hulk && ken && matthew) {
    const [hulkPost] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.authorId, hulk))
      .orderBy(posts.id)
      .limit(1);
    if (hulkPost) {
      const existingComments = await db
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.postId, hulkPost.id));
      if (existingComments.length === 0) {
        await db.insert(comments).values([
          { postId: hulkPost.id, authorId: ken, body: 'Great post, thanks for sharing!' },
          { postId: hulkPost.id, authorId: matthew, body: 'Classic. Still relevant in 2026.' },
        ]);
      }
      await db
        .insert(likes)
        .values([
          { postId: hulkPost.id, userId: ken },
          { postId: hulkPost.id, userId: matthew },
        ])
        .onConflictDoNothing();
    }

    const hasCv = await db
      .select({ id: experiences.id })
      .from(experiences)
      .where(eq(experiences.userId, hulk));
    if (hasCv.length === 0) {
      await db.insert(experiences).values({
        userId: hulk,
        title: 'Senior Smash Engineer',
        description: 'Breaking things so others do not have to.',
        company: 'Avengers Inc.',
        location: 'New York, NY',
        startedOn: '2019-05-01',
        endedOn: null,
        isCurrent: true,
      });
      await db.insert(educations).values({
        userId: hulk,
        school: 'Culver University',
        description: 'Gamma radiation and its side effects.',
        degree: 'PhD',
        fieldOfStudy: 'Nuclear physics',
        startedOn: '2008-09-01',
        endedOn: '2012-06-30',
        isCurrent: false,
      });
    }
  }

  const [userRow] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [postRow] = await db.select({ count: sql<number>`count(*)::int` }).from(posts);
  const result = { users: userRow?.count ?? 0, posts: postRow?.count ?? 0 };
  log?.info(result, 'seed complete');
  return result;
}

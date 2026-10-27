import { eq, inArray, sql } from 'drizzle-orm';
import { createDatabase } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';
import {
  comments,
  educations,
  experiences,
  likes,
  notifications,
  posts,
  profiles,
  users,
} from '../db/schema.ts';
import { SEED_PASSWORD, seed } from '../db/seed.ts';
import { loadEnv } from '../env.ts';
import { createLogger } from '../lib/logger.ts';
import { hashPassword } from '../lib/password.ts';

// Usage: pnpm --filter @devconnector/api exec tsx --env-file-if-exists=../../.env src/scripts/seed-demo.ts
// Development only. Layers a dozen developers with CVs, posts, comments, likes and notifications
// on top of the base seed (owner, admin, 4 personas). Idempotent: skips users that already exist.

const TEST_USER = { email: 'user@devconnector.local', password: 'User1234!' } as const;

type PostType = 'FUNNY' | 'TECH' | 'RANDOM' | 'NEWS' | 'SERIOUS';

interface Dev {
  email: string;
  username: string;
  password?: string;
  company: string;
  website?: string;
  bio: string;
  skills: string[];
  job: {
    title: string;
    company: string;
    location: string;
    from: string;
    to?: string;
    text: string;
  };
  past?: {
    title: string;
    company: string;
    location: string;
    from: string;
    to: string;
    text: string;
  };
  school: { school: string; degree: string; field: string; from: string; to: string; text: string };
  posts: { title: string; content: string; type: PostType; tags: string[] }[];
}

const DEVS: Dev[] = [
  {
    email: TEST_USER.email,
    username: 'Test User',
    password: TEST_USER.password,
    company: 'Acme Labs',
    bio: 'Regular member account for testing.',
    skills: ['typescript', 'javascript', 'python'],
    job: {
      title: 'Full-stack Developer',
      company: 'Acme Labs',
      location: 'Berlin, DE',
      from: '2022-03-01',
      text: 'Building internal tools with React and Node.',
    },
    school: {
      school: 'TU Berlin',
      degree: 'BSc',
      field: 'Computer Science',
      from: '2015-10-01',
      to: '2019-07-31',
      text: 'Software engineering track.',
    },
    posts: [
      {
        title: 'My first week with TanStack Router',
        content:
          'File-based routing with type-safe params is a joy. Notes on the migration from React Router inside.',
        type: 'TECH',
        tags: ['programming', 'engineering'],
      },
    ],
  },
  {
    email: 'ada.lovelace@example.dev',
    username: 'Ada Lovelace',
    company: 'Analytical Engines',
    website: 'https://ada.example.dev',
    bio: 'Algorithms first, languages second.',
    skills: ['python', 'rust', 'golang'],
    job: {
      title: 'Principal Engineer',
      company: 'Analytical Engines',
      location: 'London, UK',
      from: '2018-01-01',
      text: 'Leads the compiler team.',
    },
    past: {
      title: 'Software Engineer',
      company: 'Difference Co',
      location: 'London, UK',
      from: '2013-06-01',
      to: '2017-12-31',
      text: 'Numerical libraries.',
    },
    school: {
      school: 'University of London',
      degree: 'MSc',
      field: 'Mathematics',
      from: '2010-09-01',
      to: '2012-06-30',
      text: 'Thesis on computation.',
    },
    posts: [
      {
        title: 'Why I still write tests first',
        content: 'Red, green, refactor. It keeps the design honest and the diffs small.',
        type: 'SERIOUS',
        tags: ['engineering', 'productivity'],
      },
      {
        title: 'Rust ownership in five minutes',
        content: 'Borrowing is just a library loan: one writer or many readers, never both.',
        type: 'TECH',
        tags: ['programming', 'computerscience'],
      },
    ],
  },
  {
    email: 'linus.t@example.dev',
    username: 'Linus Torvalds Jr',
    company: 'Kernel Panic GmbH',
    bio: 'C, coffee, and strong opinions.',
    skills: ['c++', 'rust', 'golang'],
    job: {
      title: 'Systems Engineer',
      company: 'Kernel Panic GmbH',
      location: 'Munich, DE',
      from: '2020-02-01',
      text: 'Low-latency networking stack.',
    },
    school: {
      school: 'TU Munich',
      degree: 'MSc',
      field: 'Informatics',
      from: '2014-10-01',
      to: '2017-09-30',
      text: 'Operating systems.',
    },
    posts: [
      {
        title: 'Merge commits are fine, actually',
        content: 'Hot take: a clean history is nice, a truthful history is better.',
        type: 'FUNNY',
        tags: ['engineering'],
      },
    ],
  },
  {
    email: 'grace.h@example.dev',
    username: 'Grace Hopper-Lee',
    company: 'Cobol & Sons',
    bio: 'Debugging since before it was cool.',
    skills: ['java', 'kotlin', 'scala'],
    job: {
      title: 'Staff Engineer',
      company: 'Cobol & Sons',
      location: 'New York, US',
      from: '2017-04-01',
      text: 'JVM platform modernisation.',
    },
    school: {
      school: 'Vassar College',
      degree: 'BA',
      field: 'Mathematics',
      from: '2008-09-01',
      to: '2012-05-31',
      text: 'Applied maths.',
    },
    posts: [
      {
        title: 'Migrating 2M lines of Java to Kotlin',
        content: 'We did it module by module. The interop story is the real hero.',
        type: 'TECH',
        tags: ['engineering', 'devops'],
      },
      {
        title: 'On naming things',
        content: 'There are two hard problems: naming, cache invalidation, and off-by-one errors.',
        type: 'FUNNY',
        tags: ['joblife'],
      },
    ],
  },
  {
    email: 'margaret.h@example.dev',
    username: 'Margaret Hamilton-Ng',
    company: 'Apollo Software',
    bio: 'Reliability is a feature.',
    skills: ['c++', 'python', 'javascript'],
    job: {
      title: 'Reliability Engineer',
      company: 'Apollo Software',
      location: 'Boston, US',
      from: '2019-09-01',
      text: 'SRE for flight-critical systems.',
    },
    school: {
      school: 'MIT',
      degree: 'BSc',
      field: 'Electrical Engineering',
      from: '2011-09-01',
      to: '2015-06-30',
      text: 'Embedded systems.',
    },
    posts: [
      {
        title: 'Postmortems without blame',
        content: 'The template we use, and why asking "how" beats asking "who".',
        type: 'SERIOUS',
        tags: ['devops', 'joblife'],
      },
    ],
  },
  {
    email: 'alan.t@example.dev',
    username: 'Alan Turing-Park',
    company: 'Enigma Security',
    bio: 'Breaking things (legally).',
    skills: ['python', 'golang', 'c++'],
    job: {
      title: 'Security Researcher',
      company: 'Enigma Security',
      location: 'Manchester, UK',
      from: '2021-01-01',
      text: 'Pentesting and fuzzing.',
    },
    school: {
      school: 'University of Manchester',
      degree: 'PhD',
      field: 'Computer Security',
      from: '2015-09-01',
      to: '2020-12-31',
      text: 'Fuzzing parsers.',
    },
    posts: [
      {
        title: 'Fuzzing a JSON parser over lunch',
        content:
          'Thirty minutes of coverage-guided fuzzing found three crashes. Details and the harness inside.',
        type: 'TECH',
        tags: ['security', 'cybersecurity'],
      },
    ],
  },
  {
    email: 'barbara.l@example.dev',
    username: 'Barbara Liskov-Diaz',
    company: 'Substitution Inc.',
    bio: 'Types, contracts and clean abstractions.',
    skills: ['typescript', 'java', 'clojure'],
    job: {
      title: 'Architect',
      company: 'Substitution Inc.',
      location: 'Madrid, ES',
      from: '2016-05-01',
      text: 'API design across 40 services.',
    },
    school: {
      school: 'Universidad Politécnica de Madrid',
      degree: 'MSc',
      field: 'Software Engineering',
      from: '2009-09-01',
      to: '2011-07-31',
      text: 'Formal methods.',
    },
    posts: [
      {
        title: 'Strict TypeScript config you will not regret',
        content: 'noUncheckedIndexedAccess, exactOptionalPropertyTypes, and why they pay off.',
        type: 'TECH',
        tags: ['programming', 'engineering'],
      },
    ],
  },
  {
    email: 'tim.bl@example.dev',
    username: 'Tim Berners-Smith',
    company: 'Web Foundations',
    website: 'https://tim.example.dev',
    bio: 'The web is for everyone.',
    skills: ['javascript', 'typescript', 'php'],
    job: {
      title: 'Frontend Lead',
      company: 'Web Foundations',
      location: 'Geneva, CH',
      from: '2015-11-01',
      text: 'Accessible design systems.',
    },
    school: {
      school: 'Oxford',
      degree: 'BA',
      field: 'Physics',
      from: '2005-10-01',
      to: '2008-06-30',
      text: 'Physics, mostly.',
    },
    posts: [
      {
        title: 'Accessibility is not a sprint ticket',
        content: 'Ship it in the design system once, and every page inherits it.',
        type: 'SERIOUS',
        tags: ['product', 'engineering'],
      },
      {
        title: 'CSS container queries changed my life',
        content: 'Components that respond to their own width. Finally.',
        type: 'FUNNY',
        tags: ['programming'],
      },
    ],
  },
  {
    email: 'radia.p@example.dev',
    username: 'Radia Perlman-Cho',
    company: 'Spanning Tree Ltd',
    bio: 'Networks that heal themselves.',
    skills: ['golang', 'rust', 'python'],
    job: {
      title: 'Network Engineer',
      company: 'Spanning Tree Ltd',
      location: 'Seoul, KR',
      from: '2019-07-01',
      text: 'Routing protocols and observability.',
    },
    school: {
      school: 'KAIST',
      degree: 'MSc',
      field: 'Computer Networks',
      from: '2012-03-01',
      to: '2014-02-28',
      text: 'Distributed systems.',
    },
    posts: [
      {
        title: 'Observability on a budget',
        content: 'Structured logs plus three well-chosen metrics beat a dashboard nobody reads.',
        type: 'TECH',
        tags: ['devops', 'it'],
      },
    ],
  },
  {
    email: 'guido.v@example.dev',
    username: 'Guido van Rossum-Kim',
    company: 'Snake Oil Systems',
    bio: 'There should be one obvious way to do it.',
    skills: ['python', 'ruby', 'javascript'],
    job: {
      title: 'Developer Advocate',
      company: 'Snake Oil Systems',
      location: 'Amsterdam, NL',
      from: '2020-10-01',
      text: 'Talks, docs, and community.',
    },
    school: {
      school: 'University of Amsterdam',
      degree: 'BSc',
      field: 'Computer Science',
      from: '2010-09-01',
      to: '2013-07-31',
      text: 'Programming languages.',
    },
    posts: [
      {
        title: 'Python 3.15 free-threading: what changed for me',
        content: 'Benchmarks on a real workload, and the two places it still bites.',
        type: 'NEWS',
        tags: ['tech', 'programming'],
      },
    ],
  },
  {
    email: 'yukihiro.m@example.dev',
    username: 'Yuki Matsumoto',
    company: 'Gem Studio',
    bio: 'Optimising for developer happiness.',
    skills: ['ruby', 'javascript', 'solidity'],
    job: {
      title: 'Rails Engineer',
      company: 'Gem Studio',
      location: 'Tokyo, JP',
      from: '2018-04-01',
      text: 'Marketplace backend.',
    },
    school: {
      school: 'University of Tsukuba',
      degree: 'BSc',
      field: 'Information Science',
      from: '2010-04-01',
      to: '2014-03-31',
      text: 'Language design.',
    },
    posts: [
      {
        title: 'Why I keep reaching for boring technology',
        content: 'Postgres, a queue, and a monolith carry you astonishingly far.',
        type: 'SERIOUS',
        tags: ['engineering', 'productivity'],
      },
    ],
  },
  {
    email: 'sam.rando@example.dev',
    username: 'Sam Rando',
    company: 'Freelance',
    bio: 'Jack of all stacks.',
    skills: ['.net', 'c#', 'typescript'],
    job: {
      title: 'Contractor',
      company: 'Freelance',
      location: 'Lisbon, PT',
      from: '2021-06-01',
      text: 'Short engagements, mostly .NET.',
    },
    school: {
      school: 'Universidade de Lisboa',
      degree: 'BSc',
      field: 'Informatics',
      from: '2012-09-01',
      to: '2015-07-31',
      text: 'General CS.',
    },
    posts: [
      {
        title: 'Rubber ducks are underrated',
        content: 'Explaining the bug out loud found it in 40 seconds. The duck gets no credit.',
        type: 'RANDOM',
        tags: ['joblife'],
      },
    ],
  },
];

const COMMENTS = [
  'Great write-up, thanks for sharing!',
  'This matches what we saw in production.',
  'Bookmarked. The second paragraph is gold.',
  'Disagree on one point, but well argued.',
  'Would love a follow-up on the trade-offs.',
  'We tried this last quarter — worked nicely.',
  'Ha, painfully true.',
];

const env = loadEnv();
if (env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data into a production environment.');
  process.exit(1);
}
const logger = createLogger(env);
const database = createDatabase(env.DATABASE_URL, logger);
const { db } = database;

try {
  await runMigrations(db);
  await seed(db, { logger }); // catalog, owner, admin, base personas

  const hash = await hashPassword(SEED_PASSWORD);
  const userHash = await hashPassword(TEST_USER.password);
  const ids: number[] = [];
  let created = 0;

  for (const dev of DEVS) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dev.email));
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    created++;
    const [u] = await db
      .insert(users)
      .values({
        email: dev.email,
        passwordHash: dev.password ? userHash : hash,
        emailVerifiedAt: new Date(),
      })
      .returning({ id: users.id });
    if (!u) throw new Error(`could not create ${dev.email}`);
    ids.push(u.id);
    await db.insert(profiles).values({
      userId: u.id,
      username: dev.username,
      company: dev.company,
      website: dev.website ?? null,
      bio: dev.bio,
      skills: dev.skills,
      isPublic: true,
    });
    const jobs = [dev.job, ...(dev.past ? [dev.past] : [])];
    await db.insert(experiences).values(
      jobs.map((j) => ({
        userId: u.id,
        title: j.title,
        description: j.text,
        company: j.company,
        location: j.location,
        startedOn: j.from,
        endedOn: 'to' in j && j.to ? j.to : null,
        isCurrent: !('to' in j && j.to),
      })),
    );
    await db.insert(educations).values({
      userId: u.id,
      school: dev.school.school,
      description: dev.school.text,
      degree: dev.school.degree,
      fieldOfStudy: dev.school.field,
      startedOn: dev.school.from,
      endedOn: dev.school.to,
      isCurrent: false,
    });
    for (const [i, p] of dev.posts.entries()) {
      const at = new Date(Date.now() - (ids.length * 5 + i * 3) * 3_600_000);
      await db.insert(posts).values({
        authorId: u.id,
        title: p.title,
        content: p.content,
        type: p.type,
        tags: p.tags,
        published: true,
        publishedAt: at,
        createdAt: at,
        viewCount: 10 + ((ids.length * 37 + i * 11) % 200),
      });
    }
  }

  if (created > 0) {
    // Likes and comments across the whole feed, deterministic so re-runs on a fresh DB match.
    const feed = await db
      .select({ id: posts.id, authorId: posts.authorId, title: posts.title })
      .from(posts)
      .where(inArray(posts.authorId, ids));
    const allUsers = [...ids];
    let n = 0;
    for (const post of feed) {
      const fans = allUsers.filter((id, i) => id !== post.authorId && (i + post.id) % 3 === 0);
      if (fans.length > 0) {
        await db
          .insert(likes)
          .values(fans.map((userId) => ({ postId: post.id, userId })))
          .onConflictDoNothing();
      }
      const talkers = allUsers.filter((id, i) => id !== post.authorId && (i + post.id) % 4 === 1);
      for (const authorId of talkers.slice(0, 3)) {
        const [c] = await db
          .insert(comments)
          .values({ postId: post.id, authorId, body: COMMENTS[n++ % COMMENTS.length] ?? 'Nice!' })
          .returning({ id: comments.id });
        await db.insert(notifications).values({
          userId: post.authorId,
          type: 'comment',
          actorId: authorId,
          postId: post.id,
          commentId: c?.id ?? null,
          data: { postTitle: post.title },
          readAt: n % 3 === 0 ? new Date() : null,
        });
      }
      for (const actorId of fans.slice(0, 2)) {
        await db.insert(notifications).values({
          userId: post.authorId,
          type: 'like',
          actorId,
          postId: post.id,
          data: { postTitle: post.title },
        });
      }
    }
    // A system notification for the test user (same shape the app writes on a role change).
    await db.insert(notifications).values({
      userId: ids[0] ?? 0,
      type: 'system',
      data: { event: 'role_changed', role: 'user' },
    });
  }

  const count = async (
    t: typeof posts | typeof comments | typeof likes | typeof notifications | typeof users,
  ) => (await db.select({ c: sql<number>`count(*)::int` }).from(t))[0]?.c ?? 0;
  logger.info(
    {
      newDevs: created,
      users: await count(users),
      posts: await count(posts),
      comments: await count(comments),
      likes: await count(likes),
      notifications: await count(notifications),
    },
    'demo data ready',
  );
} finally {
  await database.close();
}

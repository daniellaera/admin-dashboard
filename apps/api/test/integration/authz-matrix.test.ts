import { describe, expect, it } from 'vitest';
import { createComment, createPost, createUser, type TestUser } from '../factories.ts';
import { buildApp, json } from '../helpers.ts';

/**
 * Authorization matrix (ADR-013 + PRIV-01): every sensitive endpoint × every actor, including the
 * negative cases required by the user: an ADMIN promoting someone, an ADMIN acting on another
 * ADMIN or on the OWNER, and any attempt to demote, disable or delete the OWNER.
 */
type Actor =
  'anonymous' | 'user' | 'owner-of-content' | 'admin' | 'admin2' | 'owner' | 'owner-no-sudo';
const ACTORS: Actor[] = [
  'anonymous',
  'user',
  'owner-of-content',
  'admin',
  'admin2',
  'owner',
  'owner-no-sudo',
];

interface Fixture {
  author: TestUser; // owns the post/comment/experience ("owner-of-content")
  user: TestUser; // an unrelated regular user
  admin: TestUser;
  admin2: TestUser;
  owner: TestUser; // the single OWNER, in sudo mode
  ownerNoSudo: string; // another session of the owner, without sudo
  postId: number;
  draftId: number;
  commentId: number;
  experienceId: number;
}

async function fixture(): Promise<Fixture> {
  const author = await createUser({ username: 'author', email: 'author@secret.example' });
  const user = await createUser({ username: 'user', email: 'user@secret.example' });
  const admin = await createUser({
    role: 'admin',
    username: 'admin',
    email: 'admin@secret.example',
  });
  const admin2 = await createUser({
    role: 'admin',
    username: 'admin2',
    email: 'admin2@secret.example',
  });
  const owner = await createUser({
    role: 'owner',
    username: 'owner',
    email: 'owner@secret.example',
    sudo: true,
  });
  const postId = await createPost(author.id);
  const draftId = await createPost(author.id, { published: false });
  const commentId = await createComment(postId, author.id);
  const app = await buildApp();
  const exp = await json(
    app,
    'POST',
    '/me/experiences',
    {
      title: 'T',
      description: 'D',
      company: 'C',
      location: 'L',
      startedOn: '2020-01-01',
      endedOn: null,
      isCurrent: true,
    },
    { cookie: author.cookie },
  );
  const experienceId = ((await exp.json()) as { id: number }).id;
  // A second session for the owner without the sudo window.
  const { generateToken, hashToken } = await import('../../src/lib/tokens.ts');
  const { testDatabase } = await import('../db.ts');
  const { sessions } = await import('../../src/db/schema.ts');
  const token = generateToken();
  await (await testDatabase()).db.insert(sessions).values({
    id: hashToken(token),
    userId: owner.id,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  return {
    author,
    user,
    admin,
    admin2,
    owner,
    ownerNoSudo: `dc_session=${token}`,
    postId,
    draftId,
    commentId,
    experienceId,
  };
}

function cookieOf(f: Fixture, actor: Actor): string | undefined {
  switch (actor) {
    case 'anonymous':
      return undefined;
    case 'user':
      return f.user.cookie;
    case 'owner-of-content':
      return f.author.cookie;
    case 'admin':
      return f.admin.cookie;
    case 'admin2':
      return f.admin2.cookie;
    case 'owner':
      return f.owner.cookie;
    case 'owner-no-sudo':
      return f.ownerNoSudo;
  }
}

interface Case {
  name: string;
  method: string;
  path: (f: Fixture) => string;
  body?: unknown;
  expect: Record<Actor, number>;
}

const CASES: Case[] = [
  // ── content ──────────────────────────────────────────────────────────────
  {
    name: 'edit a post',
    method: 'PATCH',
    path: (f) => `/posts/${f.postId}`,
    body: { title: 'changed' },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 200,
      admin: 200,
      admin2: 200,
      owner: 200,
      'owner-no-sudo': 200,
    },
  },
  {
    name: 'delete a post',
    method: 'DELETE',
    path: (f) => `/posts/${f.postId}`,
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 204,
      admin: 204,
      admin2: 204,
      owner: 204,
      'owner-no-sudo': 204,
    },
  },
  {
    name: 'read a draft',
    method: 'GET',
    path: (f) => `/posts/${f.draftId}`,
    expect: {
      anonymous: 404,
      user: 404,
      'owner-of-content': 200,
      admin: 200,
      admin2: 200,
      owner: 200,
      'owner-no-sudo': 200,
    },
  },
  {
    name: 'comment on a post',
    method: 'POST',
    path: (f) => `/posts/${f.postId}/comments`,
    body: { body: 'hi' },
    expect: {
      anonymous: 401,
      user: 201,
      'owner-of-content': 201,
      admin: 201,
      admin2: 201,
      owner: 201,
      'owner-no-sudo': 201,
    },
  },
  {
    name: 'delete a comment',
    method: 'DELETE',
    path: (f) => `/comments/${f.commentId}`,
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 204,
      admin: 204,
      admin2: 204,
      owner: 204,
      'owner-no-sudo': 204,
    },
  },
  {
    name: "delete the author's experience through /me",
    method: 'DELETE',
    path: (f) => `/me/experiences/${f.experienceId}`,
    expect: {
      anonymous: 401,
      user: 404,
      'owner-of-content': 204,
      admin: 404,
      admin2: 404,
      owner: 404,
      'owner-no-sudo': 404,
    },
  },
  // ── admin area ───────────────────────────────────────────────────────────
  {
    name: 'list users (e-mails)',
    method: 'GET',
    path: () => `/admin/users`,
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 200,
      admin2: 200,
      owner: 200,
      'owner-no-sudo': 200,
    },
  },
  {
    name: 'disable a regular user',
    method: 'PATCH',
    path: (f) => `/admin/users/${f.user.id}`,
    body: { disabled: true },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 200,
      admin2: 200,
      owner: 200,
      'owner-no-sudo': 200,
    },
  },
  {
    name: 'delete a regular user',
    method: 'DELETE',
    path: (f) => `/admin/users/${f.user.id}`,
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 204,
      admin2: 204,
      owner: 204,
      'owner-no-sudo': 204,
    },
  },
  {
    name: 'promote a user to admin (role change)',
    method: 'PATCH',
    path: (f) => `/admin/users/${f.user.id}`,
    body: { role: 'admin' },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 403,
      admin2: 403,
      owner: 200,
      'owner-no-sudo': 403,
    },
  },
  {
    name: 'demote an admin to user (role change)',
    method: 'PATCH',
    path: (f) => `/admin/users/${f.admin2.id}`,
    body: { role: 'user' },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 403,
      admin2: 403,
      owner: 200,
      'owner-no-sudo': 403,
    },
  },
  {
    name: 'disable another admin',
    method: 'PATCH',
    path: (f) => `/admin/users/${f.admin2.id}`,
    body: { disabled: true },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 403,
      admin2: 403,
      owner: 200,
      'owner-no-sudo': 200,
    },
  },
  {
    name: 'delete another admin',
    method: 'DELETE',
    path: (f) => `/admin/users/${f.admin2.id}`,
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 403,
      admin2: 403,
      owner: 204,
      'owner-no-sudo': 204,
    },
  },
  {
    name: 'demote the OWNER',
    method: 'PATCH',
    path: (f) => `/admin/users/${f.owner.id}`,
    body: { role: 'user' },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 403,
      admin2: 403,
      owner: 403,
      'owner-no-sudo': 403,
    },
  },
  {
    name: 'disable the OWNER',
    method: 'PATCH',
    path: (f) => `/admin/users/${f.owner.id}`,
    body: { disabled: true },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 403,
      admin2: 403,
      owner: 403,
      'owner-no-sudo': 403,
    },
  },
  {
    name: 'delete the OWNER',
    method: 'DELETE',
    path: (f) => `/admin/users/${f.owner.id}`,
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 403,
      admin2: 403,
      owner: 403,
      'owner-no-sudo': 403,
    },
  },
  {
    name: 'invite a user',
    method: 'POST',
    path: () => `/admin/invitations`,
    body: { email: 'invitee@dev.io', role: 'user' },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 201,
      admin2: 201,
      owner: 201,
      'owner-no-sudo': 201,
    },
  },
  {
    name: 'invite an admin',
    method: 'POST',
    path: () => `/admin/invitations`,
    body: { email: 'invitee@dev.io', role: 'admin' },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 403,
      admin2: 403,
      owner: 201,
      'owner-no-sudo': 403,
    },
  },
  {
    name: 'change the registration mode',
    method: 'PUT',
    path: () => `/admin/settings`,
    body: { registrationMode: 'invite_only' },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 200,
      admin2: 200,
      owner: 200,
      'owner-no-sudo': 200,
    },
  },
  {
    name: 'read the audit log',
    method: 'GET',
    path: () => `/admin/audit`,
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 200,
      admin2: 200,
      owner: 200,
      'owner-no-sudo': 200,
    },
  },
  {
    name: 'add a catalog entry',
    method: 'POST',
    path: () => `/admin/catalog/tags`,
    body: { value: 'newtag', label: 'New tag' },
    expect: {
      anonymous: 401,
      user: 403,
      'owner-of-content': 403,
      admin: 201,
      admin2: 201,
      owner: 201,
      'owner-no-sudo': 201,
    },
  },
];

describe('authorization matrix', () => {
  for (const testCase of CASES) {
    for (const actor of ACTORS) {
      it(`${testCase.name} as ${actor} → ${testCase.expect[actor]}`, async () => {
        const f = await fixture();
        const app = await buildApp();
        const cookie = cookieOf(f, actor);
        const res = await json(
          app,
          testCase.method,
          testCase.path(f),
          testCase.body as never,
          cookie ? { cookie } : {},
        );
        expect(res.status).toBe(testCase.expect[actor]);
      });
    }
  }

  it('the owner cannot delete its own account through the API', async () => {
    const f = await fixture();
    const app = await buildApp();
    const res = await json(
      app,
      'DELETE',
      '/auth/account',
      { password: 'whatever' },
      { cookie: f.owner.cookie },
    );
    expect(res.status).toBe(403);
  });

  it('an admin cannot act on itself through the admin API either', async () => {
    const f = await fixture();
    const app = await buildApp();
    expect(
      (
        await json(
          app,
          'PATCH',
          `/admin/users/${f.admin.id}`,
          { disabled: true },
          { cookie: f.admin.cookie },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await json(app, 'DELETE', `/admin/users/${f.admin.id}`, undefined, {
          cookie: f.admin.cookie,
        })
      ).status,
    ).toBe(403);
  });
});

describe('PRIV-01: e-mail visibility', () => {
  const PUBLIC_READS = (f: { ownerId: number; postId: number }) => [
    '/profiles',
    `/profiles/${f.ownerId}`,
    '/posts',
    `/posts/${f.postId}`,
    `/posts/${f.postId}/comments`,
    '/catalog',
  ];

  it('never leaks any e-mail through public endpoints, to anyone', async () => {
    const author = await createUser({ username: 'author', email: 'author@secret.example' });
    const other = await createUser({ username: 'other', email: 'other@secret.example' });
    const admin = await createUser({ role: 'admin', email: 'admin@secret.example' });
    const owner = await createUser({ role: 'owner', email: 'owner@secret.example' });
    const postId = await createPost(author.id);
    await createComment(postId, other.id);
    const app = await buildApp();
    for (const path of PUBLIC_READS({ ownerId: author.id, postId })) {
      for (const cookie of [undefined, other.cookie, author.cookie, admin.cookie, owner.cookie]) {
        const res = await json(app, 'GET', path, undefined, cookie ? { cookie } : {});
        expect(res.status, path).toBe(200);
        const text = await res.text();
        expect(text, `${path} with ${cookie ? 'session' : 'no session'}`).not.toMatch(
          /@secret\.example/,
        );
        expect(text).not.toMatch(/"email"/);
      }
    }
  });

  it('exposes the e-mail only to its owner and to staff', async () => {
    const author = await createUser({ email: 'author@secret.example' });
    const other = await createUser({ email: 'other@secret.example' });
    const admin = await createUser({ role: 'admin', email: 'admin@secret.example' });
    const app = await buildApp();

    const me = await (
      await json(app, 'GET', '/auth/me', undefined, { cookie: author.cookie })
    ).text();
    expect(me).toContain('author@secret.example');
    expect(me).not.toContain('other@secret.example');

    const mine = await (
      await json(app, 'GET', '/me/profile', undefined, { cookie: author.cookie })
    ).text();
    expect(mine).not.toMatch(/@secret\.example/); // profile DTO carries no e-mail even for the owner

    const asAdmin = await (
      await json(app, 'GET', `/admin/users/${author.id}`, undefined, { cookie: admin.cookie })
    ).text();
    expect(asAdmin).toContain('author@secret.example');
    expect(
      (await json(app, 'GET', `/admin/users/${author.id}`, undefined, { cookie: other.cookie }))
        .status,
    ).toBe(403);
  });
});

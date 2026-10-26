import type { CommentDto, CursorPage, Paginated, PostDetail } from '@devconnector/shared';
import { describe, expect, it } from 'vitest';
import { createComment, createPost, createUser } from '../factories.ts';
import { buildApp, json, problem } from '../helpers.ts';

describe('posts feed and detail', () => {
  it('lists only published posts of active authors, newest first, with counts and likedByMe', async () => {
    const app = await buildApp();
    const alice = await createUser({ username: 'alice' });
    const bob = await createUser({ username: 'bob' });
    const ghost = await createUser({ disabled: true });
    const p1 = await createPost(alice.id, { title: 'first', tags: ['devops'] });
    await createPost(alice.id, { title: 'draft', published: false });
    await createPost(ghost.id, { title: 'from a disabled user' });
    const p2 = await createPost(bob.id, { title: 'second', type: 'FUNNY' });
    await createComment(p1, bob.id);
    await json(app, 'PUT', `/posts/${p1}/like`, undefined, { cookie: bob.cookie });

    const anon = (await (await json(app, 'GET', '/posts')).json()) as Paginated<PostDetail>;
    expect(anon.total).toBe(2);
    expect(anon.items.map((p) => p.title)).toEqual(['second', 'first']);
    const first = anon.items[1]!;
    expect(first).toMatchObject({
      likeCount: 1,
      commentCount: 1,
      likedByMe: false,
      tags: ['devops'],
    });
    expect(first.author).toEqual({ id: alice.id, displayName: 'alice', avatarUrl: null });

    const asBob = (await (
      await json(app, 'GET', '/posts', undefined, { cookie: bob.cookie })
    ).json()) as Paginated<PostDetail>;
    expect(asBob.items.find((p) => p.id === p1)?.likedByMe).toBe(true);

    const byTag = (await (
      await json(app, 'GET', '/posts?tag=devops')
    ).json()) as Paginated<PostDetail>;
    expect(byTag.items.map((p) => p.id)).toEqual([p1]);
    const byType = (await (
      await json(app, 'GET', '/posts?type=FUNNY')
    ).json()) as Paginated<PostDetail>;
    expect(byType.items.map((p) => p.id)).toEqual([p2]);
    const paged = (await (
      await json(app, 'GET', '/posts?page=2&limit=1')
    ).json()) as Paginated<PostDetail>;
    expect(paged).toMatchObject({ page: 2, limit: 1, total: 2 });
    expect(paged.items.map((p) => p.id)).toEqual([p1]);
  });

  it('hides drafts from everyone but the author and admins', async () => {
    const app = await buildApp();
    const alice = await createUser();
    const bob = await createUser();
    const admin = await createUser({ role: 'admin' });
    const draft = await createPost(alice.id, { published: false });
    expect((await json(app, 'GET', `/posts/${draft}`)).status).toBe(404);
    expect(
      (await json(app, 'GET', `/posts/${draft}`, undefined, { cookie: bob.cookie })).status,
    ).toBe(404);
    expect(
      (await json(app, 'GET', `/posts/${draft}`, undefined, { cookie: alice.cookie })).status,
    ).toBe(200);
    expect(
      (await json(app, 'GET', `/posts/${draft}`, undefined, { cookie: admin.cookie })).status,
    ).toBe(200);
    expect((await json(app, 'GET', `/posts/abc`)).status).toBe(400);
    expect((await json(app, 'GET', `/posts/999999`)).status).toBe(404);
  });
});

describe('post mutations', () => {
  const body = { title: 'Hello', content: 'World', type: 'TECH', published: true, tags: ['tech'] };

  it('creates, updates and deletes own posts; others are refused; admins may moderate', async () => {
    const app = await buildApp();
    const alice = await createUser();
    const bob = await createUser();
    const admin = await createUser({ role: 'admin' });

    expect((await json(app, 'POST', '/posts', body)).status).toBe(401);
    const created = await json(app, 'POST', '/posts', body, { cookie: alice.cookie });
    expect(created.status).toBe(201);
    const post = (await created.json()) as PostDetail;
    expect(post).toMatchObject({
      ...body,
      author: { id: alice.id },
      likeCount: 0,
      commentCount: 0,
    });

    const invalid = await json(
      app,
      'POST',
      '/posts',
      { ...body, type: 'MEME', authorId: bob.id },
      { cookie: alice.cookie },
    );
    expect(invalid.status).toBe(400);
    expect((await problem(invalid)).errors?.map((e) => e.path)).toEqual(
      expect.arrayContaining(['type', '']),
    );

    expect(
      (await json(app, 'PATCH', `/posts/${post.id}`, { title: 'Hacked' }, { cookie: bob.cookie }))
        .status,
    ).toBe(403);
    expect((await json(app, 'PATCH', `/posts/${post.id}`, { title: 'Hacked' })).status).toBe(401);
    const updated = await json(
      app,
      'PATCH',
      `/posts/${post.id}`,
      { title: 'Edited', published: false },
      { cookie: alice.cookie },
    );
    expect(updated.status).toBe(200);
    expect(((await updated.json()) as PostDetail).title).toBe('Edited');
    const byAdmin = await json(
      app,
      'PATCH',
      `/posts/${post.id}`,
      { published: true },
      { cookie: admin.cookie },
    );
    expect(byAdmin.status).toBe(200);

    expect(
      (await json(app, 'DELETE', `/posts/${post.id}`, undefined, { cookie: bob.cookie })).status,
    ).toBe(403);
    expect(
      (await json(app, 'DELETE', `/posts/${post.id}`, undefined, { cookie: admin.cookie })).status,
    ).toBe(204);
    expect((await json(app, 'GET', `/posts/${post.id}`)).status).toBe(404);
  });

  it('likes once (idempotent), unlikes, and refuses drafts', async () => {
    const app = await buildApp();
    const alice = await createUser();
    const bob = await createUser();
    const post = await createPost(alice.id);
    const draft = await createPost(alice.id, { published: false });
    expect((await json(app, 'PUT', `/posts/${post}/like`)).status).toBe(401);
    const once = await json(app, 'PUT', `/posts/${post}/like`, undefined, { cookie: bob.cookie });
    expect(await once.json()).toEqual({ likeCount: 1, likedByMe: true });
    const twice = await json(app, 'PUT', `/posts/${post}/like`, undefined, { cookie: bob.cookie });
    expect(await twice.json()).toEqual({ likeCount: 1, likedByMe: true });
    const un = await json(app, 'DELETE', `/posts/${post}/like`, undefined, { cookie: bob.cookie });
    expect(await un.json()).toEqual({ likeCount: 0, likedByMe: false });
    expect(
      (await json(app, 'PUT', `/posts/${draft}/like`, undefined, { cookie: bob.cookie })).status,
    ).toBe(404);
  });

  it('comments with keyset pagination and author-or-admin deletion', async () => {
    const app = await buildApp();
    const alice = await createUser({ username: 'alice' });
    const bob = await createUser({ username: 'bob' });
    const admin = await createUser({ role: 'admin' });
    const post = await createPost(alice.id);
    expect((await json(app, 'POST', `/posts/${post}/comments`, { body: 'x' })).status).toBe(401);
    expect(
      (await json(app, 'POST', `/posts/${post}/comments`, { body: '' }, { cookie: bob.cookie }))
        .status,
    ).toBe(400);
    for (let i = 1; i <= 3; i++) {
      const res = await json(
        app,
        'POST',
        `/posts/${post}/comments`,
        { body: `c${i}` },
        { cookie: bob.cookie },
      );
      expect(res.status).toBe(201);
    }
    const page1 = (await (
      await json(app, 'GET', `/posts/${post}/comments?limit=2`, undefined, { cookie: alice.cookie })
    ).json()) as CursorPage<CommentDto>;
    expect(page1.items.map((c) => c.body)).toEqual(['c3', 'c2']);
    expect(page1.items[0]).toMatchObject({ author: { displayName: 'bob' }, canDelete: true }); // alice owns the post → may moderate
    expect(page1.nextCursor).toBe(page1.items[1]!.id);
    const page2 = (await (
      await json(app, 'GET', `/posts/${post}/comments?limit=2&cursor=${page1.nextCursor}`)
    ).json()) as CursorPage<CommentDto>;
    expect(page2.items.map((c) => c.body)).toEqual(['c1']);
    expect(page2.nextCursor).toBeNull();
    expect(page2.items[0]!.canDelete).toBe(false); // anonymous viewer

    const target = page2.items[0]!.id;
    const other = await createUser();
    expect(
      (await json(app, 'DELETE', `/comments/${target}`, undefined, { cookie: other.cookie }))
        .status,
    ).toBe(403);
    expect(
      (await json(app, 'DELETE', `/comments/${target}`, undefined, { cookie: bob.cookie })).status,
    ).toBe(204);
    expect(
      (
        await json(app, 'DELETE', `/comments/${page1.items[0]!.id}`, undefined, {
          cookie: admin.cookie,
        })
      ).status,
    ).toBe(204);
    const left = (await (
      await json(app, 'GET', `/posts/${post}/comments`)
    ).json()) as CursorPage<CommentDto>;
    expect(left.items.map((c) => c.body)).toEqual(['c2']);
  });
});

import type {
  CursorPage,
  NotificationDto,
  NotificationPreferenceDto,
  PostDetail,
} from '@devconnector/shared';
import { eq } from 'drizzle-orm';
import nodemailer, { type Transporter } from 'nodemailer';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { emailOutbox } from '../../src/db/schema.ts';
import { createPgEventBus } from '../../src/lib/pg-events.ts';
import { enqueueMail } from '../../src/mail/outbox.ts';
import { createOutboxWorker } from '../../src/mail/worker.ts';
import { testDatabase } from '../db.ts';
import { createPost, createUser } from '../factories.ts';
import { buildApp, json, lastMailTo, mailCountTo, ORIGIN } from '../helpers.ts';

const silent = pino({ level: 'silent' });

describe('notifications (ADR-006)', () => {
  it('notifies the post author about comments and likes, never about their own actions', async () => {
    const app = await buildApp();
    const author = await createUser({ username: 'author' });
    const reader = await createUser({ username: 'reader' });
    const post = await createPost(author.id, { title: 'Hello' });

    await json(app, 'POST', `/posts/${post}/comments`, { body: 'self' }, { cookie: author.cookie });
    await json(app, 'PUT', `/posts/${post}/like`, undefined, { cookie: author.cookie });
    expect(
      await (
        await json(app, 'GET', '/notifications/unread-count', undefined, { cookie: author.cookie })
      ).json(),
    ).toEqual({ unread: 0 });

    await json(
      app,
      'POST',
      `/posts/${post}/comments`,
      { body: 'nice one' },
      { cookie: reader.cookie },
    );
    await json(app, 'PUT', `/posts/${post}/like`, undefined, { cookie: reader.cookie });
    await json(app, 'PUT', `/posts/${post}/like`, undefined, { cookie: reader.cookie }); // idempotent: no second notification

    expect(
      await (
        await json(app, 'GET', '/notifications/unread-count', undefined, { cookie: author.cookie })
      ).json(),
    ).toEqual({ unread: 2 });
    const list = (await (
      await json(app, 'GET', '/notifications', undefined, { cookie: author.cookie })
    ).json()) as CursorPage<NotificationDto>;
    expect(list.items.map((n) => n.type)).toEqual(['like', 'comment']);
    expect(list.items[1]).toMatchObject({
      actor: { displayName: 'reader' },
      postId: post,
      data: { postTitle: 'Hello' },
      readAt: null,
    });
    expect(list.items[1]!.commentId).toBeTypeOf('number');
    expect(await mailCountTo(author.email)).toBe(0); // e-mail is opt-in

    // Mark one read, then all, then delete.
    expect(
      (
        await json(app, 'POST', `/notifications/${list.items[1]!.id}/read`, undefined, {
          cookie: author.cookie,
        })
      ).status,
    ).toBe(204);
    expect(
      await (
        await json(app, 'GET', '/notifications/unread-count', undefined, { cookie: author.cookie })
      ).json(),
    ).toEqual({ unread: 1 });
    const unreadOnly = (await (
      await json(app, 'GET', '/notifications?unreadOnly=true', undefined, { cookie: author.cookie })
    ).json()) as CursorPage<NotificationDto>;
    expect(unreadOnly.items.map((n) => n.type)).toEqual(['like']);
    expect(
      (await json(app, 'POST', '/notifications/read-all', undefined, { cookie: author.cookie }))
        .status,
    ).toBe(204);
    expect(
      await (
        await json(app, 'GET', '/notifications/unread-count', undefined, { cookie: author.cookie })
      ).json(),
    ).toEqual({ unread: 0 });
    expect(
      (
        await json(app, 'DELETE', `/notifications/${list.items[0]!.id}`, undefined, {
          cookie: author.cookie,
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await json(app, 'DELETE', `/notifications/${list.items[0]!.id}`, undefined, {
          cookie: reader.cookie,
        })
      ).status,
    ).toBe(404);
    expect((await json(app, 'GET', '/notifications')).status).toBe(401);
  });

  it('honours preferences: e-mail opt-in sends a mail, in-app opt-out suppresses the notification, new_post is opt-in', async () => {
    const app = await buildApp();
    const author = await createUser({ username: 'author' });
    const reader = await createUser({ username: 'reader' });
    const fan = await createUser({ username: 'fan' });

    const defaults = (await (
      await json(app, 'GET', '/notifications/preferences', undefined, { cookie: author.cookie })
    ).json()) as NotificationPreferenceDto[];
    expect(defaults).toEqual([
      { type: 'comment', inApp: true, email: false },
      { type: 'like', inApp: true, email: false },
      { type: 'new_post', inApp: false, email: false },
    ]);
    const updated = await json(
      app,
      'PUT',
      '/notifications/preferences',
      {
        preferences: [
          { type: 'comment', inApp: true, email: true },
          { type: 'like', inApp: false, email: false },
        ],
      },
      { cookie: author.cookie },
    );
    expect(updated.status).toBe(200);
    await json(
      app,
      'PUT',
      '/notifications/preferences',
      { preferences: [{ type: 'new_post', inApp: true, email: true }] },
      { cookie: fan.cookie },
    );
    expect(
      (
        await json(
          app,
          'PUT',
          '/notifications/preferences',
          { preferences: [{ type: 'system', inApp: false, email: false }] },
          { cookie: fan.cookie },
        )
      ).status,
    ).toBe(400);

    const created = await json(
      app,
      'POST',
      '/posts',
      { title: 'Fresh', content: 'c', type: 'TECH', published: true, tags: [] },
      { cookie: author.cookie },
    );
    const post = ((await created.json()) as PostDetail).id;
    await json(app, 'POST', `/posts/${post}/comments`, { body: 'hey' }, { cookie: reader.cookie });
    await json(app, 'PUT', `/posts/${post}/like`, undefined, { cookie: reader.cookie });

    const authorList = (await (
      await json(app, 'GET', '/notifications', undefined, { cookie: author.cookie })
    ).json()) as CursorPage<NotificationDto>;
    expect(authorList.items.map((n) => n.type)).toEqual(['comment']); // like suppressed in-app
    const mail = await lastMailTo(author.email);
    expect(mail?.subject).toContain('New comment on your post');
    expect(mail?.text).toContain('reader commented on "Fresh"');
    expect(mail?.text).toContain(`/posts/${post}`);

    const fanList = (await (
      await json(app, 'GET', '/notifications', undefined, { cookie: fan.cookie })
    ).json()) as CursorPage<NotificationDto>;
    expect(fanList.items.map((n) => n.type)).toEqual(['new_post']);
    expect((await lastMailTo(fan.email))?.subject).toContain('New post published');
    expect(await mailCountTo(reader.email)).toBe(0);
  });

  it('streams events over SSE to the right audiences', async () => {
    const app = await buildApp({}, undefined);
    const author = await createUser({ username: 'author' });
    const reader = await createUser({ username: 'reader' });
    const post = await createPost(author.id);

    const controller = new AbortController();
    const res = await app.request(`/api/v1/events?post=${post}`, {
      headers: { cookie: author.cookie, origin: ORIGIN },
      signal: controller.signal,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(res.headers.get('x-accel-buffering')).toBe('no');
    const reader$ = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let received = '';
    const readUntil = async (needle: string) => {
      const deadline = Date.now() + 5_000;
      while (!received.includes(needle) && Date.now() < deadline) {
        const { value, done } = await reader$.read();
        if (done) break;
        received += decoder.decode(value, { stream: true });
      }
      expect(received).toContain(needle);
    };
    await readUntil('event: ready');
    expect(received).toContain(`"user:${author.id}"`);
    expect(received).toContain(`"post:${post}"`);

    await json(app, 'POST', `/posts/${post}/comments`, { body: 'live' }, { cookie: reader.cookie });
    await readUntil('event: comment.created');
    await readUntil('event: notification.created');
    expect(received).toContain('"unread":1');

    await json(
      app,
      'POST',
      '/posts',
      { title: 'n', content: 'c', type: 'TECH', published: true, tags: [] },
      { cookie: reader.cookie },
    );
    await readUntil('event: post.published');
    controller.abort();
  });
});

describe('postgres event bus', () => {
  it('delivers published events to subscribers through LISTEN/NOTIFY', async () => {
    const { pool } = await testDatabase();
    const bus = createPgEventBus({
      connectionString: pool.options.connectionString!,
      pool,
      logger: silent,
    });
    await bus.start();
    try {
      const received = new Promise<unknown>((resolve) => {
        bus.subscribe((event) => {
          resolve(event);
        });
      });
      await bus.publish({ channel: 'posts', event: { type: 'post.published', postId: 42 } });
      expect(await received).toEqual({
        channel: 'posts',
        event: { type: 'post.published', postId: 42 },
      });
    } finally {
      await bus.stop();
    }
  });
});

describe('outbox worker', () => {
  it('sends queued mails and retries failures with backoff', async () => {
    const { db } = await testDatabase();
    await enqueueMail(db, 'a@x.io', { subject: 's', html: '<p>h</p>', text: 't' });
    const okTransport = nodemailer.createTransport({ jsonTransport: true });
    const worker = createOutboxWorker({
      db,
      transport: okTransport,
      from: 'DevConnector <no-reply@test>',
      logger: silent,
    });
    expect(await worker.runOnce()).toBe(1);
    const [sentRow] = await db.select().from(emailOutbox).where(eq(emailOutbox.toEmail, 'a@x.io'));
    expect(sentRow?.sentAt).toBeInstanceOf(Date);
    expect(await worker.runOnce()).toBe(0);

    await enqueueMail(db, 'b@x.io', { subject: 's', html: '<p>h</p>', text: 't' });
    const failing = {
      sendMail: () => Promise.reject(new Error('smtp down')),
    } as unknown as Transporter;
    const failingWorker = createOutboxWorker({
      db,
      transport: failing,
      from: 'x <x@test>',
      logger: silent,
    });
    expect(await failingWorker.runOnce()).toBe(0);
    const [failedRow] = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.toEmail, 'b@x.io'));
    expect(failedRow).toMatchObject({ attempts: 1, lastError: 'smtp down', sentAt: null });
    expect(failedRow!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 30_000);
    // Not retried before next_attempt_at.
    expect(await worker.runOnce()).toBe(0);
  });
});

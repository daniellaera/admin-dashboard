import type {
  AdminStats,
  AdminUser,
  AuditEntryDto,
  Catalog,
  CatalogItem,
  Paginated,
} from '@devconnector/shared';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { notifications, sessions } from '../../src/db/schema.ts';
import { hashPassword } from '../../src/lib/password.ts';
import { testDatabase } from '../db.ts';
import { createComment, createPost, createUser } from '../factories.ts';
import { buildApp, json, lastMailTo, problem } from '../helpers.ts';

describe('admin area access', () => {
  it('is reachable by the owner and admins only', async () => {
    const app = await buildApp();
    const user = await createUser();
    const admin = await createUser({ role: 'admin' });
    const owner = await createUser({ role: 'owner' });
    expect((await json(app, 'GET', '/admin/stats')).status).toBe(401);
    expect(
      (await json(app, 'GET', '/admin/stats', undefined, { cookie: user.cookie })).status,
    ).toBe(403);
    expect(
      (await json(app, 'GET', '/admin/stats', undefined, { cookie: admin.cookie })).status,
    ).toBe(200);
    expect(
      (await json(app, 'GET', '/admin/stats', undefined, { cookie: owner.cookie })).status,
    ).toBe(200);
  });

  it('computes dashboard statistics', async () => {
    const app = await buildApp();
    const owner = await createUser({ role: 'owner' });
    const a = await createUser();
    await createUser({ disabled: true });
    await createUser({ verified: false });
    const post = await createPost(a.id);
    await createPost(a.id, { published: false });
    await createComment(post, owner.id);
    await json(app, 'PUT', `/posts/${post}/like`, undefined, { cookie: owner.cookie });

    const stats = (await (
      await json(app, 'GET', '/admin/stats', undefined, { cookie: owner.cookie })
    ).json()) as AdminStats;
    expect(stats.users).toEqual({ total: 4, active: 3, disabled: 1, admins: 1, verified: 3 });
    expect(stats.posts).toEqual({ total: 2, published: 1 });
    expect(stats.comments).toBe(1);
    expect(stats.likes).toBe(1);
    expect(stats.pendingInvitations).toBe(0);
    expect(stats.recentUsers).toHaveLength(4);
    expect(stats.recentUsers[0]?.email).toBeTruthy();
  });
});

describe('users administration (ADR-013)', () => {
  it('lists and searches users, disables with immediate session revocation, deletes users', async () => {
    const app = await buildApp();
    const admin = await createUser({ role: 'admin', username: 'mod' });
    const alice = await createUser({ username: 'alice', email: 'alice@wonder.land' });
    const bob = await createUser({ username: 'bob' });

    const list = (await (
      await json(app, 'GET', '/admin/users?q=wonder', undefined, { cookie: admin.cookie })
    ).json()) as Paginated<AdminUser>;
    expect(list.items.map((u) => u.email)).toEqual(['alice@wonder.land']);

    const disabled = await json(
      app,
      'PATCH',
      `/admin/users/${bob.id}`,
      { disabled: true },
      { cookie: admin.cookie },
    );
    expect(disabled.status).toBe(200);
    expect(((await disabled.json()) as AdminUser).disabled).toBe(true);
    expect((await json(app, 'GET', '/auth/me', undefined, { cookie: bob.cookie })).status).toBe(
      401,
    );
    const { db } = await testDatabase();
    expect(await db.select().from(sessions).where(eq(sessions.userId, bob.id))).toHaveLength(0);
    const disabledList = (await (
      await json(app, 'GET', '/admin/users?status=disabled', undefined, { cookie: admin.cookie })
    ).json()) as Paginated<AdminUser>;
    expect(disabledList.items.map((u) => u.id)).toEqual([bob.id]);

    expect(
      (
        await json(
          app,
          'PATCH',
          `/admin/users/${bob.id}`,
          { disabled: false },
          { cookie: admin.cookie },
        )
      ).status,
    ).toBe(200);
    expect(
      (await json(app, 'PATCH', `/admin/users/${alice.id}`, {}, { cookie: admin.cookie })).status,
    ).toBe(400);
    expect(
      (await json(app, 'DELETE', `/admin/users/${bob.id}`, undefined, { cookie: admin.cookie }))
        .status,
    ).toBe(204);
    expect(
      (await json(app, 'GET', `/admin/users/${bob.id}`, undefined, { cookie: admin.cookie }))
        .status,
    ).toBe(404);

    const audit = (await (
      await json(app, 'GET', '/admin/audit', undefined, { cookie: admin.cookie })
    ).json()) as Paginated<AuditEntryDto>;
    expect(audit.items.map((e) => e.action)).toEqual([
      'user.delete',
      'user.enable',
      'user.disable',
    ]);
    expect(audit.items[0]).toMatchObject({ targetEmail: bob.email, actor: { id: admin.id } });
  });

  it('only the owner changes roles, with sudo, for verified users; the user is notified and signed out', async () => {
    const app = await buildApp();
    const owner = await createUser({
      role: 'owner',
      passwordHash: await hashPassword('Owner-Secret-1'),
    });
    // The single-owner index refuses a second owner.
    await expect(createUser({ role: 'owner' })).rejects.toThrow();
    const alice = await createUser({ username: 'alice' });
    const unverified = await createUser({ verified: false });

    // Without sudo → 403 sudo-required, nothing changes.
    const noSudo = await json(
      app,
      'PATCH',
      `/admin/users/${alice.id}`,
      { role: 'admin' },
      { cookie: owner.cookie },
    );
    expect(noSudo.status).toBe(403);
    expect((await problem(noSudo)).type).toMatch(/sudo-required$/);

    // Enter sudo mode by re-entering the password (wrong password → 400, right one → window).
    expect(
      (
        await json(
          app,
          'POST',
          '/auth/sudo',
          { password: 'nope-nope-nope' },
          { cookie: owner.cookie },
        )
      ).status,
    ).toBe(400);
    const sudo = await json(
      app,
      'POST',
      '/auth/sudo',
      { password: 'Owner-Secret-1' },
      { cookie: owner.cookie },
    );
    expect(sudo.status).toBe(200);
    expect(
      (
        (await (
          await json(app, 'GET', '/auth/me', undefined, { cookie: owner.cookie })
        ).json()) as { sudoUntil: string | null }
      ).sudoUntil,
    ).toBeTruthy();
    const { db } = await testDatabase();

    expect(
      (
        await json(
          app,
          'PATCH',
          `/admin/users/${unverified.id}`,
          { role: 'admin' },
          { cookie: owner.cookie },
        )
      ).status,
    ).toBe(400);

    const promoted = await json(
      app,
      'PATCH',
      `/admin/users/${alice.id}`,
      { role: 'admin' },
      { cookie: owner.cookie },
    );
    expect(promoted.status).toBe(200);
    expect(((await promoted.json()) as AdminUser).role).toBe('admin');
    // Alice's sessions are revoked and she is notified in-app and by mail.
    expect((await json(app, 'GET', '/auth/me', undefined, { cookie: alice.cookie })).status).toBe(
      401,
    );
    const notes = await db.select().from(notifications).where(eq(notifications.userId, alice.id));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      type: 'system',
      data: { event: 'role_changed', role: 'admin' },
    });
    expect((await lastMailTo(alice.email))?.subject).toContain('role is now');

    const demoted = await json(
      app,
      'PATCH',
      `/admin/users/${alice.id}`,
      { role: 'user' },
      { cookie: owner.cookie },
    );
    expect(((await demoted.json()) as AdminUser).role).toBe('user');

    const audit = (await (
      await json(app, 'GET', '/admin/audit?action=role.change', undefined, { cookie: owner.cookie })
    ).json()) as Paginated<AuditEntryDto>;
    expect(audit.items.map((e) => e.data)).toEqual([
      { from: 'admin', to: 'user' },
      { from: 'user', to: 'admin' },
    ]);
  });

  it('exposes catalog management to admins and scrubs removed values from profiles and posts', async () => {
    const app = await buildApp();
    const admin = await createUser({ role: 'admin' });
    const user = await createUser();

    const before = (await (await json(app, 'GET', '/catalog')).json()) as Catalog;
    expect(before.skills).toHaveLength(15);
    expect(before.tags).toHaveLength(14);

    expect(
      (
        await json(
          app,
          'POST',
          '/admin/catalog/skills',
          { value: 'zig', label: 'Zig' },
          { cookie: user.cookie },
        )
      ).status,
    ).toBe(403);
    const created = await json(
      app,
      'POST',
      '/admin/catalog/skills',
      { value: 'Zig', label: ' Zig ' },
      { cookie: admin.cookie },
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ value: 'zig', label: 'Zig' });
    expect(
      (
        await json(
          app,
          'POST',
          '/admin/catalog/skills',
          { value: 'zig', label: 'Zig' },
          { cookie: admin.cookie },
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await json(
          app,
          'PATCH',
          '/admin/catalog/skills/zig',
          { label: 'Zig ⚡' },
          { cookie: admin.cookie },
        )
      ).status,
    ).toBe(200);

    // Users can only pick catalog values.
    expect(
      (
        await json(
          app,
          'PATCH',
          '/me/profile',
          { skills: ['zig', 'rust'] },
          { cookie: user.cookie },
        )
      ).status,
    ).toBe(200);
    const unknown = await json(
      app,
      'PATCH',
      '/me/profile',
      { skills: ['brainfuck'] },
      { cookie: user.cookie },
    );
    expect(unknown.status).toBe(400);
    expect((await problem(unknown)).errors?.[0]).toEqual({
      path: 'skills.0',
      message: 'Unknown skill "brainfuck"',
    });
    const postRes = await json(
      app,
      'POST',
      '/posts',
      { title: 't', content: 'c', type: 'TECH', published: true, tags: ['devops', 'nope'] },
      { cookie: user.cookie },
    );
    expect(postRes.status).toBe(400);

    expect(
      (await json(app, 'DELETE', '/admin/catalog/skills/zig', undefined, { cookie: admin.cookie }))
        .status,
    ).toBe(204);
    const profile = (await (
      await json(app, 'GET', '/me/profile', undefined, { cookie: user.cookie })
    ).json()) as { skills: string[] };
    expect(profile.skills).toEqual(['rust']);
    const after = (await (await json(app, 'GET', '/catalog')).json()) as Catalog;
    expect(after.skills.find((s: CatalogItem) => s.value === 'zig')).toBeUndefined();
  });

  it('publishes the public runtime configuration', async () => {
    const app = await buildApp();
    expect(await (await json(app, 'GET', '/config')).json()).toEqual({
      appName: 'DevConnector',
      github: false,
      requireEmailVerification: true,
      registrationMode: 'open',
      maxUploadMb: 2,
    });
  });

  it('lets admins and the owner switch the registration mode (audited)', async () => {
    const app = await buildApp();
    const admin = await createUser({ role: 'admin' });
    const user = await createUser();
    expect(
      (await json(app, 'GET', '/admin/settings', undefined, { cookie: user.cookie })).status,
    ).toBe(403);
    expect(
      await (await json(app, 'GET', '/admin/settings', undefined, { cookie: admin.cookie })).json(),
    ).toEqual({ registrationMode: 'open' });
    const updated = await json(
      app,
      'PUT',
      '/admin/settings',
      { registrationMode: 'invite_only' },
      { cookie: admin.cookie },
    );
    expect(await updated.json()).toEqual({ registrationMode: 'invite_only' });
    expect(
      ((await (await json(app, 'GET', '/config')).json()) as { registrationMode: string })
        .registrationMode,
    ).toBe('invite_only');
    const audit = (await (
      await json(app, 'GET', '/admin/audit?action=settings.update', undefined, {
        cookie: admin.cookie,
      })
    ).json()) as Paginated<AuditEntryDto>;
    expect(audit.items[0]?.data).toEqual({
      key: 'registration_mode',
      from: 'open',
      to: 'invite_only',
    });
  });
});

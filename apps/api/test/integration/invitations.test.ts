import type { InvitationDto, InvitationPreview, Me } from '@devconnector/shared';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { sessions } from '../../src/db/schema.ts';
import { testDatabase } from '../db.ts';
import { createUser } from '../factories.ts';
import {
  buildApp,
  json,
  lastMailTo,
  mailCountTo,
  problem,
  sessionCookie,
  tokenFromMail,
} from '../helpers.ts';

describe('invitations (ADR-013)', () => {
  it('an admin invites a user; accepting creates a verified account and signs in', async () => {
    const app = await buildApp();
    const admin = await createUser({ role: 'admin', username: 'mod' });

    const res = await json(
      app,
      'POST',
      '/admin/invitations',
      { email: 'New@Dev.io', role: 'user' },
      { cookie: admin.cookie },
    );
    expect(res.status).toBe(201);
    const invitation = (await res.json()) as InvitationDto;
    expect(invitation).toMatchObject({
      email: 'new@dev.io',
      role: 'user',
      invitedBy: { displayName: 'mod' },
    });
    const mail = await lastMailTo('new@dev.io');
    expect(mail?.subject).toContain('mod invited you to join');
    const token = tokenFromMail(mail!.text);

    const preview = (await (
      await json(app, 'GET', `/auth/invitations/${token}`)
    ).json()) as InvitationPreview;
    expect(preview).toMatchObject({ email: 'new@dev.io', role: 'user', existingAccount: false });

    const pending = (await (
      await json(app, 'GET', '/admin/invitations', undefined, { cookie: admin.cookie })
    ).json()) as InvitationDto[];
    expect(pending.map((i) => i.id)).toEqual([invitation.id]);

    const missingPassword = await json(app, 'POST', '/auth/invitations/accept', { token });
    expect(missingPassword.status).toBe(400);
    const accept = await json(app, 'POST', '/auth/invitations/accept', {
      token,
      password: 'Welcome-123',
    });
    expect(accept.status).toBe(200);
    const me = ((await accept.json()) as { me: Me }).me;
    expect(me).toMatchObject({
      email: 'new@dev.io',
      role: 'user',
      emailVerified: true,
      hasPassword: true,
    });
    expect(sessionCookie(accept)).not.toBeNull();
    // single use
    expect(
      (await json(app, 'POST', '/auth/invitations/accept', { token, password: 'Welcome-123' }))
        .status,
    ).toBe(400);
    expect((await json(app, 'GET', `/auth/invitations/${token}`)).status).toBe(400);
    expect(
      await (
        await json(app, 'GET', '/admin/invitations', undefined, { cookie: admin.cookie })
      ).json(),
    ).toEqual([]);
  });

  it('only the owner (in sudo mode) invites admins; accepting with an existing account grants admin', async () => {
    const fresh = await buildApp();
    const admin = await createUser({ role: 'admin' });
    const owner = await createUser({ role: 'owner', sudo: true });
    const alice = await createUser({ email: 'alice@dev.io', username: 'alice' });

    expect(
      (
        await json(
          fresh,
          'POST',
          '/admin/invitations',
          { email: 'x@dev.io', role: 'admin' },
          { cookie: admin.cookie },
        )
      ).status,
    ).toBe(403);
    // Owner without an active sudo window → sudo-required.
    const { db } = await testDatabase();
    await db.update(sessions).set({ sudoUntil: null }).where(eq(sessions.userId, owner.id));
    const noSudo = await json(
      fresh,
      'POST',
      '/admin/invitations',
      { email: alice.email, role: 'admin' },
      { cookie: owner.cookie },
    );
    expect(noSudo.status).toBe(403);
    expect((await problem(noSudo)).type).toMatch(/sudo-required$/);
    await db
      .update(sessions)
      .set({ sudoUntil: new Date(Date.now() + 600_000) })
      .where(eq(sessions.userId, owner.id));

    const invite = await json(
      fresh,
      'POST',
      '/admin/invitations',
      { email: alice.email, role: 'admin' },
      { cookie: owner.cookie },
    );
    expect(invite.status).toBe(201);
    const token = tokenFromMail((await lastMailTo(alice.email))!.text);
    const preview = (await (
      await json(fresh, 'GET', `/auth/invitations/${token}`)
    ).json()) as InvitationPreview;
    expect(preview.existingAccount).toBe(true);

    const accept = await json(fresh, 'POST', '/auth/invitations/accept', { token });
    expect(accept.status).toBe(200);
    const me = ((await accept.json()) as { me: Me }).me;
    expect(me.role).toBe('admin');
    expect(me.id).toBe(alice.id);
    // Previous sessions of alice were revoked by the role change; the new one works.
    expect((await json(fresh, 'GET', '/auth/me', undefined, { cookie: alice.cookie })).status).toBe(
      401,
    );
    expect(
      (await json(fresh, 'GET', '/admin/stats', undefined, { cookie: sessionCookie(accept)! }))
        .status,
    ).toBe(200);
  });

  it('refuses user invitations for existing accounts, revokes, and respects invite-only registration', async () => {
    const app = await buildApp();
    const admin = await createUser({ role: 'admin' });
    await createUser({ email: 'taken@dev.io' });
    expect(
      (
        await json(
          app,
          'POST',
          '/admin/invitations',
          { email: 'taken@dev.io', role: 'user' },
          { cookie: admin.cookie },
        )
      ).status,
    ).toBe(409);

    await json(
      app,
      'PUT',
      '/admin/settings',
      { registrationMode: 'invite_only' },
      { cookie: admin.cookie },
    );
    const closed = await json(app, 'POST', '/auth/register', {
      email: 'walkin@dev.io',
      password: 'Password123!',
    });
    expect(closed.status).toBe(403);
    expect((await problem(closed)).type).toMatch(/registration-closed$/);

    const inv = (await (
      await json(
        app,
        'POST',
        '/admin/invitations',
        { email: 'guest@dev.io', role: 'user' },
        { cookie: admin.cookie },
      )
    ).json()) as InvitationDto;
    const token = tokenFromMail((await lastMailTo('guest@dev.io'))!.text);
    // Registering with the token for another address fails; for the right address succeeds without verification.
    expect(
      (
        await json(app, 'POST', '/auth/register', {
          email: 'other@dev.io',
          password: 'Password123!',
          inviteToken: token,
        })
      ).status,
    ).toBe(400);
    const reg = await json(app, 'POST', '/auth/register', {
      email: 'guest@dev.io',
      password: 'Password123!',
      inviteToken: token,
    });
    expect(reg.status).toBe(201);
    expect((await reg.json()) as { me: Me; needsVerification: boolean }).toMatchObject({
      needsVerification: false,
      me: { email: 'guest@dev.io', emailVerified: true },
    });
    expect(await mailCountTo('guest@dev.io')).toBe(1); // only the invitation, no verification mail

    // Revocation of a second invitation.
    const inv2 = (await (
      await json(
        app,
        'POST',
        '/admin/invitations',
        { email: 'later@dev.io', role: 'user' },
        { cookie: admin.cookie },
      )
    ).json()) as InvitationDto;
    expect(
      (
        await json(app, 'DELETE', `/admin/invitations/${inv2.id}`, undefined, {
          cookie: admin.cookie,
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await json(
          app,
          'GET',
          `/auth/invitations/${tokenFromMail((await lastMailTo('later@dev.io'))!.text)}`,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await json(app, 'DELETE', `/admin/invitations/${inv.id}`, undefined, {
          cookie: admin.cookie,
        })
      ).status,
    ).toBe(404); // already accepted
  });
});

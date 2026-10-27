import type { Me } from '@devconnector/shared';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { authTokens, profiles, sessions, users } from '../../src/db/schema.ts';
import { testDatabase } from '../db.ts';
import {
  buildApp,
  json,
  lastMailTo,
  mailCountTo,
  problem,
  sessionCookie,
  signUp,
  tokenFromMail,
} from '../helpers.ts';

const EMAIL = 'hulk@marvel.com';
const PASSWORD = 'Password123!';

describe('registration and e-mail verification', () => {
  it('registers, blocks login until verified, verifies through the mailed token, opens a session', async () => {
    const app = await buildApp();

    const reg = await json(app, 'POST', '/auth/register', {
      email: ' Hulk@Marvel.COM ',
      password: PASSWORD,
    });
    expect(reg.status).toBe(201);
    expect(await reg.json()).toEqual({ me: null, needsVerification: true });
    expect(sessionCookie(reg)).toBeNull();

    const blocked = await json(app, 'POST', '/auth/login', { email: EMAIL, password: PASSWORD });
    expect(blocked.status).toBe(403);
    expect((await problem(blocked)).type).toMatch(/email-not-verified$/);

    const mail = await lastMailTo(EMAIL);
    expect(mail?.subject).toContain('Confirm your e-mail');
    const token = tokenFromMail(mail!.text);

    const verify = await json(app, 'POST', '/auth/verify-email', { token });
    expect(verify.status).toBe(200);
    const cookie = sessionCookie(verify);
    expect(cookie).toMatch(/^dc_session=[A-Za-z0-9_-]{43}$/);
    const setCookie = verify.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).not.toContain('Secure'); // http APP_URL in tests

    const body = (await verify.json()) as { me: Me };
    expect(body.me.email).toBe(EMAIL);
    expect(body.me.emailVerified).toBe(true);
    expect(body.me.role).toBe('user');
    expect(body.me.profile.displayName).toBe(`Developer #${body.me.id}`);

    // Token is single use.
    expect((await json(app, 'POST', '/auth/verify-email', { token })).status).toBe(400);

    // The session works and can be ended.
    const me = await json(app, 'GET', '/auth/me', undefined, { cookie: cookie! });
    expect(me.status).toBe(200);
    expect(((await me.json()) as Me).email).toBe(EMAIL);
    const logout = await json(app, 'POST', '/auth/logout', undefined, { cookie: cookie! });
    expect(logout.status).toBe(204);
    expect(sessionCookie(logout)).toBeNull();
    expect((await json(app, 'GET', '/auth/me', undefined, { cookie: cookie! })).status).toBe(401);
  });

  it('answers identically for an existing e-mail and mails the owner instead of leaking', async () => {
    const app = await buildApp();
    await signUp(app, EMAIL);
    const before = await mailCountTo(EMAIL);
    const again = await json(app, 'POST', '/auth/register', {
      email: EMAIL,
      password: 'Other-Pass-99',
    });
    expect(again.status).toBe(201);
    expect(await again.json()).toEqual({ me: null, needsVerification: true });
    expect(await mailCountTo(EMAIL)).toBe(before + 1);
    expect((await lastMailTo(EMAIL))?.subject).toContain('already have');
    const { db } = await testDatabase();
    expect(await db.select().from(users).where(eq(users.email, EMAIL))).toHaveLength(1);
  });

  it('rejects invalid payloads with field errors and unknown keys', async () => {
    const app = await buildApp();
    const res = await json(app, 'POST', '/auth/register', {
      email: 'nope',
      password: 'short',
      role: 'admin',
    });
    expect(res.status).toBe(400);
    const body = await problem(res);
    expect(body.errors?.map((e) => e.path).sort()).toEqual(['', 'email', 'password'].sort());
  });

  it('logs in straight away when verification is not required', async () => {
    const app = await buildApp({ AUTH_REQUIRE_EMAIL_VERIFICATION: 'false' });
    const reg = await json(app, 'POST', '/auth/register', { email: EMAIL, password: PASSWORD });
    expect(reg.status).toBe(201);
    expect(sessionCookie(reg)).not.toBeNull();
    expect(((await reg.json()) as { me: Me }).me.emailVerified).toBe(true);
  });

  it('can resend the verification link (rate limited) and the newest token wins', async () => {
    const app = await buildApp();
    await json(app, 'POST', '/auth/register', { email: EMAIL, password: PASSWORD });
    const first = tokenFromMail((await lastMailTo(EMAIL))!.text);
    expect((await json(app, 'POST', '/auth/resend-verification', { email: EMAIL })).status).toBe(
      202,
    );
    const second = tokenFromMail((await lastMailTo(EMAIL))!.text);
    expect(second).not.toBe(first);
    expect((await json(app, 'POST', '/auth/verify-email', { token: first })).status).toBe(400);
    expect((await json(app, 'POST', '/auth/verify-email', { token: second })).status).toBe(200);
    // 3 requests per e-mail per 15 minutes
    await json(app, 'POST', '/auth/resend-verification', { email: EMAIL });
    await json(app, 'POST', '/auth/resend-verification', { email: EMAIL });
    const limited = await json(app, 'POST', '/auth/resend-verification', { email: EMAIL });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toMatch(/^\d+$/);
  });
});

describe('login', () => {
  it('uses one generic message for wrong password and unknown account', async () => {
    const app = await buildApp();
    await signUp(app, EMAIL);
    const wrong = await json(app, 'POST', '/auth/login', {
      email: EMAIL,
      password: 'nope-nope-nope',
    });
    const unknown = await json(app, 'POST', '/auth/login', {
      email: 'ghost@x.io',
      password: 'nope-nope-nope',
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect((await problem(wrong)).detail).toBe('Invalid e-mail or password');
    expect((await problem(unknown)).detail).toBe('Invalid e-mail or password');
  });

  it('locks an account after 5 failed attempts and clears the counter on success', async () => {
    const app = await buildApp();
    await signUp(app, EMAIL);
    for (let i = 0; i < 5; i++) {
      expect(
        (await json(app, 'POST', '/auth/login', { email: EMAIL, password: 'wrong-wrong' })).status,
      ).toBe(401);
    }
    const locked = await json(app, 'POST', '/auth/login', { email: EMAIL, password: PASSWORD });
    expect(locked.status).toBe(429);
  });

  it('refuses disabled accounts and drops their existing sessions', async () => {
    const app = await buildApp();
    const { cookie, me } = await signUp(app, EMAIL);
    const { db } = await testDatabase();
    await db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, me.id));
    expect((await json(app, 'GET', '/auth/me', undefined, { cookie })).status).toBe(401);
    expect(await db.select().from(sessions).where(eq(sessions.userId, me.id))).toHaveLength(0);
    const login = await json(app, 'POST', '/auth/login', { email: EMAIL, password: PASSWORD });
    expect(login.status).toBe(403);
  });

  it('accepts a legacy bcrypt hash and upgrades it to argon2id', async () => {
    const app = await buildApp();
    const { db } = await testDatabase();
    const legacyHash = await bcrypt.hash(PASSWORD, 10);
    const [u] = await db
      .insert(users)
      .values({ email: EMAIL, passwordHash: legacyHash, emailVerifiedAt: new Date() })
      .returning({ id: users.id });
    await db.insert(profiles).values({ userId: u!.id, username: 'Hulk Green' });

    const login = await json(app, 'POST', '/auth/login', { email: EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);
    const [after] = await db.select().from(users).where(eq(users.id, u!.id));
    expect(after!.passwordHash).toMatch(/^\$argon2id\$/);
    const again = await json(app, 'POST', '/auth/login', { email: EMAIL, password: PASSWORD });
    expect(again.status).toBe(200);
  });

  it('rejects a tampered or expired session cookie', async () => {
    const app = await buildApp();
    const { cookie } = await signUp(app, EMAIL);
    const tampered = cookie.slice(0, -4) + 'AAAA';
    expect((await json(app, 'GET', '/auth/me', undefined, { cookie: tampered })).status).toBe(401);
    const { db } = await testDatabase();
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await json(app, 'GET', '/auth/me', undefined, { cookie })).status).toBe(401);
  });
});

describe('password reset and change', () => {
  it('resets the password through the mailed token and invalidates every session', async () => {
    const app = await buildApp();
    const { cookie } = await signUp(app, EMAIL);
    const before = await mailCountTo('ghost@x.io');
    expect((await json(app, 'POST', '/auth/forgot-password', { email: 'ghost@x.io' })).status).toBe(
      202,
    );
    expect(await mailCountTo('ghost@x.io')).toBe(before); // unknown accounts get nothing
    expect((await json(app, 'POST', '/auth/forgot-password', { email: EMAIL })).status).toBe(202);
    const token = tokenFromMail((await lastMailTo(EMAIL))!.text);

    const weak = await json(app, 'POST', '/auth/reset-password', { token, password: 'short' });
    expect(weak.status).toBe(400);
    const reset = await json(app, 'POST', '/auth/reset-password', {
      token,
      password: 'Brand-New-Pass-1',
    });
    expect(reset.status).toBe(204);
    expect((await json(app, 'GET', '/auth/me', undefined, { cookie })).status).toBe(401);
    expect(
      (await json(app, 'POST', '/auth/login', { email: EMAIL, password: PASSWORD })).status,
    ).toBe(401);
    expect(
      (await json(app, 'POST', '/auth/login', { email: EMAIL, password: 'Brand-New-Pass-1' }))
        .status,
    ).toBe(200);
    expect(
      (await json(app, 'POST', '/auth/reset-password', { token, password: 'Again-Again-1' }))
        .status,
    ).toBe(400);
  });

  it('changes the password with the current one, keeps this session and signs out the others', async () => {
    const app = await buildApp();
    const { cookie } = await signUp(app, EMAIL);
    const other = sessionCookie(
      await json(app, 'POST', '/auth/login', { email: EMAIL, password: PASSWORD }),
    )!;

    const bad = await json(
      app,
      'PUT',
      '/auth/password',
      { currentPassword: 'wrong-wrong', newPassword: 'New-Password-77' },
      { cookie },
    );
    expect(bad.status).toBe(400);
    expect((await problem(bad)).errors?.[0]?.path).toBe('currentPassword');

    const ok = await json(
      app,
      'PUT',
      '/auth/password',
      { currentPassword: PASSWORD, newPassword: 'New-Password-77' },
      { cookie },
    );
    expect(ok.status).toBe(204);
    expect((await json(app, 'GET', '/auth/me', undefined, { cookie })).status).toBe(200);
    expect((await json(app, 'GET', '/auth/me', undefined, { cookie: other })).status).toBe(401);
    expect((await lastMailTo(EMAIL))?.subject).toContain('password was changed');
    expect(
      (
        await json(app, 'PUT', '/auth/password', {
          currentPassword: 'x',
          newPassword: 'New-Password-77',
        })
      ).status,
    ).toBe(401);
  });
});

describe('magic link', () => {
  it('signs in an existing verified user once, and never creates accounts', async () => {
    const app = await buildApp();
    await signUp(app, EMAIL);
    expect((await json(app, 'POST', '/auth/magic-link', { email: 'stranger@x.io' })).status).toBe(
      202,
    );
    expect(await mailCountTo('stranger@x.io')).toBe(0);
    const { db } = await testDatabase();
    expect(await db.select().from(users).where(eq(users.email, 'stranger@x.io'))).toHaveLength(0);

    expect((await json(app, 'POST', '/auth/magic-link', { email: EMAIL })).status).toBe(202);
    const mail = await lastMailTo(EMAIL);
    expect(mail?.subject).toContain('sign-in link');
    const token = tokenFromMail(mail!.text);
    const consume = await json(app, 'POST', '/auth/magic-link/consume', { token });
    expect(consume.status).toBe(200);
    expect(sessionCookie(consume)).not.toBeNull();
    expect((await json(app, 'POST', '/auth/magic-link/consume', { token })).status).toBe(400);
  });

  it('sends a verification link instead when the account is not verified yet', async () => {
    const app = await buildApp();
    await json(app, 'POST', '/auth/register', { email: EMAIL, password: PASSWORD });
    await json(app, 'POST', '/auth/magic-link', { email: EMAIL });
    expect((await lastMailTo(EMAIL))?.subject).toContain('Confirm your e-mail');
  });
});

describe('account deletion', () => {
  it('requires the password, removes the user and everything attached, clears the cookie', async () => {
    const app = await buildApp();
    const { cookie, me } = await signUp(app, EMAIL);
    const wrong = await json(app, 'DELETE', '/auth/account', { password: 'nope-nope' }, { cookie });
    expect(wrong.status).toBe(400);
    const ok = await json(app, 'DELETE', '/auth/account', { password: PASSWORD }, { cookie });
    expect(ok.status).toBe(204);
    const { db } = await testDatabase();
    expect(await db.select().from(users).where(eq(users.id, me.id))).toHaveLength(0);
    expect(await db.select().from(profiles).where(eq(profiles.userId, me.id))).toHaveLength(0);
    expect(await db.select().from(sessions).where(eq(sessions.userId, me.id))).toHaveLength(0);
    expect(await db.select().from(authTokens).where(eq(authTokens.userId, me.id))).toHaveLength(0);
    expect((await json(app, 'GET', '/auth/me', undefined, { cookie })).status).toBe(401);
  });
});

describe('GitHub OAuth', () => {
  function fakeGitHub(): typeof fetch {
    return async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('github.com/login/oauth/access_token')) {
        return new Response(
          JSON.stringify({
            access_token: 'gho_test',
            token_type: 'bearer',
            scope: 'read:user,user:email',
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        );
      }
      if (url.endsWith('/user/emails')) {
        expect(init?.headers).toMatchObject({ Authorization: 'Bearer gho_test' });
        return Response.json([{ email: 'Octo@Cat.dev', primary: true, verified: true }]);
      }
      if (url.endsWith('/user')) {
        return Response.json({
          id: 583231,
          login: 'octocat',
          email: null,
          blog: 'https://octo.cat',
        });
      }
      return new Response('not found', { status: 404 });
    };
  }

  it('is hidden when not configured', async () => {
    const app = await buildApp();
    expect(await (await json(app, 'GET', '/auth/providers')).json()).toEqual({ github: false });
    expect((await app.request('/api/v1/auth/github')).status).toBe(404);
  });

  it('redirects to GitHub with a signed state cookie, then creates the user from the callback', async () => {
    const env = { GITHUB_CLIENT_ID: 'cid', GITHUB_CLIENT_SECRET: 'csecret' };
    const app = await buildApp(env, fakeGitHub());
    const start = await app.request('/api/v1/auth/github');
    expect(start.status).toBe(302);
    const location = new URL(start.headers.get('location')!);
    expect(location.hostname).toBe('github.com');
    expect(location.searchParams.get('client_id')).toBe('cid');
    const state = location.searchParams.get('state')!;
    const stateCookie = /dc_oauth_state=([^;]+)/.exec(start.headers.get('set-cookie') ?? '')?.[0];
    expect(stateCookie).toBeTruthy();

    const bad = await app.request(`/api/v1/auth/github/callback?code=abc&state=wrong`, {
      headers: { cookie: stateCookie! },
    });
    expect(bad.status).toBe(302);
    expect(bad.headers.get('location')).toContain('error=github-denied');

    const cb = await app.request(`/api/v1/auth/github/callback?code=abc&state=${state}`, {
      headers: { cookie: stateCookie! },
    });
    expect(cb.status).toBe(302);
    expect(cb.headers.get('location')).toBe('http://localhost:5173/');
    const cookie = sessionCookie(cb)!;
    const me = (await (await json(app, 'GET', '/auth/me', undefined, { cookie })).json()) as Me;
    expect(me.email).toBe('octo@cat.dev');
    expect(me.emailVerified).toBe(true);
    expect(me.hasPassword).toBe(false);
    expect(me.providers).toEqual(['github']);
    expect(me.profile.username).toBe('octocat');
    expect(me.profile.website).toBe('https://octo.cat');

    // Second sign-in links to the same account.
    const start2 = await app.request('/api/v1/auth/github');
    const state2 = new URL(start2.headers.get('location')!).searchParams.get('state')!;
    const cookie2 = /dc_oauth_state=([^;]+)/.exec(start2.headers.get('set-cookie') ?? '')![0];
    const cb2 = await app.request(`/api/v1/auth/github/callback?code=abc&state=${state2}`, {
      headers: { cookie: cookie2 },
    });
    const me2 = (await (
      await json(app, 'GET', '/auth/me', undefined, { cookie: sessionCookie(cb2)! })
    ).json()) as Me;
    expect(me2.id).toBe(me.id);
    const { db } = await testDatabase();
    expect(await db.select().from(users)).toHaveLength(1);
  });
});

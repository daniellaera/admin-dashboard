import type { Me } from '@devconnector/shared';
import { desc, eq } from 'drizzle-orm';
import pino from 'pino';
import { expect } from 'vitest';
import { type App, createApp } from '../src/app.ts';
import { emailOutbox, users } from '../src/db/schema.ts';
import { testEnv } from '../src/env.ts';
import { testDatabase } from './db.ts';

export const ORIGIN = 'http://localhost:5173';

/** Builds the real app against the test database; `envOverrides` tune behaviour per test. */
export async function buildApp(
  envOverrides: Partial<NodeJS.ProcessEnv> = {},
  fetchImpl?: typeof fetch,
): Promise<App> {
  const { db, ping } = await testDatabase();
  return createApp({
    env: testEnv(envOverrides),
    logger: pino({ level: 'silent' }),
    db,
    version: 'test',
    readiness: { database: ping },
    ...(fetchImpl ? { fetchImpl } : {}),
  });
}

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

/** JSON request helper with the headers a same-origin browser would send. */
export async function json(
  app: App,
  method: string,
  path: string,
  body?: Json,
  options: { cookie?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    origin: ORIGIN,
    'sec-fetch-site': 'same-origin',
    accept: 'application/json',
    ...options.headers,
  };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (options.cookie) headers.cookie = options.cookie;
  return app.request(`/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? null : JSON.stringify(body),
  });
}

/** Extracts `name=value` of the session cookie from a response, or null when cleared/absent. */
export function sessionCookie(res: Response): string | null {
  const header = res.headers.get('set-cookie');
  if (!header) return null;
  const match = /dc_session=([^;]*)/.exec(header);
  if (!match || match[1] === '') return null;
  return `dc_session=${match[1]}`;
}

export async function lastMailTo(email: string) {
  const { db } = await testDatabase();
  const [row] = await db
    .select()
    .from(emailOutbox)
    .where(eq(emailOutbox.toEmail, email))
    .orderBy(desc(emailOutbox.id))
    .limit(1);
  return row ?? null;
}

export async function mailCountTo(email: string): Promise<number> {
  const { db } = await testDatabase();
  return (await db.select().from(emailOutbox).where(eq(emailOutbox.toEmail, email))).length;
}

/** Pulls the one-time token out of an e-mail link such as `…/auth/verify?token=XYZ`. */
export function tokenFromMail(text: string): string {
  const match = /[?&]token=([A-Za-z0-9_-]+)/.exec(text);
  if (!match?.[1]) throw new Error(`no token link in mail: ${text.slice(0, 200)}`);
  return match[1];
}

/** Registers, verifies and logs in a user; returns its session cookie and `me`. */
export async function signUp(
  app: App,
  email: string,
  password = 'Password123!',
): Promise<{ cookie: string; me: Me }> {
  const reg = await json(app, 'POST', '/auth/register', { email, password });
  expect(reg.status).toBe(201);
  const mail = await lastMailTo(email);
  if (!mail) throw new Error('no verification mail');
  const verify = await json(app, 'POST', '/auth/verify-email', { token: tokenFromMail(mail.text) });
  expect(verify.status).toBe(200);
  const cookie = sessionCookie(verify);
  if (!cookie) throw new Error('no session cookie after verification');
  const body = (await verify.json()) as { me: Me };
  return { cookie, me: body.me };
}

export async function makeAdmin(email: string): Promise<void> {
  const { db } = await testDatabase();
  await db.update(users).set({ role: 'admin' }).where(eq(users.email, email));
}

export async function problem(res: Response): Promise<{
  status: number;
  title: string;
  detail?: string;
  type: string;
  errors?: { path: string; message: string }[];
}> {
  expect(res.headers.get('content-type')).toContain('application/problem+json');
  return (await res.json()) as never;
}

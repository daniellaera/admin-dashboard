import type { PublicProfile } from '@devconnector/shared';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { createUser } from '../factories.ts';
import { buildApp, json, ORIGIN, problem, TEST_UPLOADS_DIR } from '../helpers.ts';

async function png(
  width = 400,
  height = 300,
  background = { r: 30, g: 144, b: 255 },
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer();
}

async function upload(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string | undefined,
  bytes: Buffer,
  filename = 'avatar.png',
  type = 'image/png',
): Promise<Response> {
  const form = new FormData();
  form.append('file', new File([new Uint8Array(bytes)], filename, { type }));
  const headers: Record<string, string> = { origin: ORIGIN, 'sec-fetch-site': 'same-origin' };
  if (cookie) headers.cookie = cookie;
  return app.request('/api/v1/me/avatar', { method: 'POST', headers, body: form });
}

describe('avatars (ADR-005)', () => {
  it('re-encodes an upload to 256/64 px WebP, serves it immutably, replaces and deletes it', async () => {
    const app = await buildApp();
    const me = await createUser();
    expect((await upload(app, undefined, await png())).status).toBe(401);

    const first = await upload(app, me.cookie, await png());
    expect(first.status).toBe(200);
    const profile = (await first.json()) as PublicProfile;
    expect(profile.avatarUrl).toMatch(new RegExp(`^/files/avatars/${me.id}/[a-f0-9]{16}\\.webp$`));
    const dir = path.join(TEST_UPLOADS_DIR, 'avatars', String(me.id));
    expect(readdirSync(dir).sort()).toHaveLength(2);

    const served = await app.request(profile.avatarUrl!);
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/webp');
    expect(served.headers.get('cache-control')).toContain('immutable');
    const etag = served.headers.get('etag');
    expect(etag).toBeTruthy();
    const body = Buffer.from(await served.arrayBuffer());
    const meta = await sharp(body).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 256, height: 256 });
    const small = await app.request(profile.avatarUrl!.replace('.webp', '-64.webp'));
    expect((await sharp(Buffer.from(await small.arrayBuffer())).metadata()).width).toBe(64);
    expect(
      (await app.request(profile.avatarUrl!, { headers: { 'if-none-match': etag! } })).status,
    ).toBe(304);

    // A different image replaces the previous files.
    const second = await upload(app, me.cookie, await png(300, 300, { r: 220, g: 20, b: 60 }));
    const profile2 = (await second.json()) as PublicProfile;
    expect(profile2.avatarUrl).not.toBe(profile.avatarUrl);
    expect(readdirSync(dir)).toHaveLength(2);
    expect((await app.request(profile.avatarUrl!)).status).toBe(404);

    const removed = await json(app, 'DELETE', '/me/avatar', undefined, { cookie: me.cookie });
    expect(((await removed.json()) as PublicProfile).avatarUrl).toBeNull();
    expect(existsSync(dir)).toBe(false);
  });

  it('rejects oversized files, non-images and missing fields', async () => {
    const app = await buildApp({ MAX_UPLOAD_MB: '0.1' });
    const me = await createUser();
    const tooBig = await upload(app, me.cookie, Buffer.alloc(200 * 1024, 1), 'big.png');
    expect(tooBig.status).toBe(413);
    const notImage = await upload(
      app,
      me.cookie,
      Buffer.from('<svg onload="alert(1)"></svg>'),
      'evil.png',
    );
    expect(notImage.status).toBe(415);
    expect((await problem(notImage)).title).toBe('Unsupported media type');
    const noField = await app.request('/api/v1/me/avatar', {
      method: 'POST',
      headers: { origin: ORIGIN, 'sec-fetch-site': 'same-origin', cookie: me.cookie },
      body: new FormData(),
    });
    expect(noField.status).toBe(400);
  });

  it('never serves anything outside the avatar namespace', async () => {
    const app = await buildApp();
    for (const p of [
      '/files/../package.json',
      '/files/avatars/1/../../x.webp',
      '/files/avatars/x/abc.webp',
      '/files/.env',
    ]) {
      expect((await app.request(p)).status, p).toBe(404);
    }
    const ready = await (await app.request('/api/v1/ready')).json();
    expect(ready).toMatchObject({ status: 'ready', checks: { uploads: true } });
  });

  it('removes the files when the account is deleted', async () => {
    const app = await buildApp();
    const admin = await createUser({ role: 'admin' });
    const me = await createUser();
    await upload(app, me.cookie, await png());
    const dir = path.join(TEST_UPLOADS_DIR, 'avatars', String(me.id));
    expect(existsSync(dir)).toBe(true);
    expect(
      (await json(app, 'DELETE', `/admin/users/${me.id}`, undefined, { cookie: admin.cookie }))
        .status,
    ).toBe(204);
    expect(existsSync(dir)).toBe(false);
  });
});

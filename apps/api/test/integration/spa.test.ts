import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../helpers.ts';

const INDEX = '<!doctype html><html><body><div id="root"></div></body></html>';

/** A fake Vite build: index.html, one hashed asset, one plain public file. */
function fakeDist(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'devconnector-web-dist-'));
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(path.join(dir, 'index.html'), INDEX);
  writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log("app")');
  writeFileSync(path.join(dir, 'manifest.webmanifest'), '{"name":"DevConnector"}');
  return dir;
}

describe('serving the web app from the API (WEB_DIST)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => {
    app = await buildApp({ WEB_DIST: fakeDist() });
  });

  it('serves index.html at / with revalidation and the security headers', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('content-security-policy')).toContain("script-src 'self'");
    expect(await res.text()).toBe(INDEX);
  });

  it('serves hashed assets as immutable and other files with revalidation', async () => {
    const asset = await app.request('/assets/index-abc123.js');
    expect(asset.status).toBe(200);
    expect(asset.headers.get('content-type')).toContain('javascript');
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');

    const manifest = await app.request('/manifest.webmanifest');
    expect(manifest.status).toBe(200);
    expect(manifest.headers.get('cache-control')).toBe('no-cache');
  });

  it('falls back to index.html for client-side routes (deep links)', async () => {
    for (const route of ['/developers/42', '/admin/posts/new', '/signin?mode=register']) {
      const res = await app.request(route);
      expect(res.status, route).toBe(200);
      expect(await res.text(), route).toBe(INDEX);
    }
    const head = await app.request('/posts', { method: 'HEAD' });
    expect(head.status).toBe(200);
  });

  it('never shadows the API or the files routes: their 404s stay JSON', async () => {
    for (const route of ['/api/v1/does-not-exist', '/api/v1', '/files/missing.webp']) {
      const res = await app.request(route);
      expect(res.status, route).toBe(404);
      expect(res.headers.get('content-type'), route).toContain('application/problem+json');
    }
  });

  it('ignores non-GET methods and refuses path traversal', async () => {
    const post = await app.request('/developers', { method: 'POST' });
    expect(post.status).toBe(404);
    expect(post.headers.get('content-type')).toContain('application/problem+json');

    const traversal = await app.request('/assets/..%2F..%2Fpackage.json');
    expect([200, 404]).toContain(traversal.status);
    if (traversal.status === 200) expect(await traversal.text()).toBe(INDEX); // fell back, not leaked
  });

  it('is disabled without WEB_DIST: the root answers 404 JSON', async () => {
    const apiOnly = await buildApp();
    const res = await apiOnly.request('/');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
  });
});

import type { ProblemDetails } from '@devconnector/shared';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { testEnv } from './env.ts';

function build(readiness: Record<string, () => Promise<boolean>> = {}) {
  return createApp({
    env: testEnv(),
    logger: pino({ level: 'silent' }),
    // The skeleton routes under test never touch the database.
    db: {} as never,
    version: '2.0.0-test',
    readiness,
  });
}

describe('app skeleton', () => {
  it('answers the liveness probe with version and request id', async () => {
    const app = build();
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok', version: '2.0.0-test' });
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reports readiness from its probes', async () => {
    const ok = build({ db: () => Promise.resolve(true) });
    expect((await ok.request('/api/v1/ready')).status).toBe(200);

    const broken = build({ db: () => Promise.reject(new Error('down')) });
    const res = await broken.request('/api/v1/ready');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'not-ready', checks: { db: false } });
  });

  it('exposes the public runtime configuration', async () => {
    const res = await build().request('/api/v1/config');
    expect(await res.json()).toEqual({
      appName: 'DevConnector',
      github: false,
      requireEmailVerification: true,
      maxUploadMb: 2,
    });
  });

  it('renders unknown routes as RFC 9457 problem details without a stack trace', async () => {
    const res = await build().request('/api/v1/nope', { method: 'DELETE' });
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    const body = (await res.json()) as ProblemDetails;
    expect(body).toMatchObject({ status: 404, title: 'Not found' });
    expect(body.requestId).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain('at ');
  });

  it('sets security headers and honours a well-formed incoming request id', async () => {
    const res = await build().request('/api/v1/health', {
      headers: { 'x-request-id': 'abc-12345678' },
    });
    expect(res.headers.get('x-request-id')).toBe('abc-12345678');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  describe('CSRF guard', () => {
    const post = (headers: Record<string, string>) =>
      build().request('/api/v1/health', { method: 'POST', headers, body: 'a=1' });

    it('rejects browser requests from another site or origin', async () => {
      expect(
        (await post({ 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' })).status,
      ).toBe(403);
      expect(
        (await post({ 'sec-fetch-site': 'same-site', origin: 'https://sub.localhost' })).status,
      ).toBe(403);
      expect(
        (await post({ origin: 'https://evil.example', 'content-type': 'application/json' })).status,
      ).toBe(403);
      expect((await post({ 'content-type': 'application/x-www-form-urlencoded' })).status).toBe(
        403,
      );
    });

    it('lets same-origin browser requests and non-browser JSON clients through', async () => {
      // 404 = passed the guard and reached routing (health has no POST handler).
      expect(
        (await post({ 'sec-fetch-site': 'same-origin', origin: 'http://localhost:5173' })).status,
      ).toBe(404);
      expect((await post({ origin: 'http://localhost:5173' })).status).toBe(404);
      expect((await post({ 'content-type': 'application/json' })).status).toBe(404);
      expect((await build().request('/api/v1/health', { method: 'DELETE' })).status).toBe(404);
    });
  });
});

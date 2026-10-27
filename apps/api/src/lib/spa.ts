import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import path from 'node:path';
import type { AppEnv } from '../types.ts';

const IMMUTABLE = 'public, max-age=31536000, immutable';
const REVALIDATE = 'no-cache';

/**
 * Serves the built web app (Vite `dist/`) from the API process (ADR-010, one image):
 * hashed files under `/assets/` are immutable, everything else (index.html, manifest, icons)
 * is revalidated on every load, and unknown paths fall back to `index.html` so client-side
 * routes can be deep-linked. GET/HEAD only; `reserved` prefixes (the API, `/files`) are never
 * answered here so their 404s stay JSON.
 */
export function spaRoutes(distDir: string, reserved: readonly string[]) {
  // @hono/node-server resolves `root` against the working directory.
  const root = path.relative(process.cwd(), path.resolve(distDir)) || '.';
  const isReserved = (requestPath: string) =>
    reserved.some((prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`));

  return new Hono<AppEnv>()
    .use('*', async (c, next) => {
      // Not ours: hand over to the app-level 404 handler (JSON problem).
      if ((c.req.method !== 'GET' && c.req.method !== 'HEAD') || isReserved(c.req.path)) {
        return c.notFound();
      }
      await next();
      if (c.res.status !== 200) return undefined;
      // serveStatic runs `onFound` only after it has built the response, so cache headers are
      // applied here, once the static handlers have answered.
      c.res.headers.set(
        'Cache-Control',
        c.req.path.startsWith('/assets/') ? IMMUTABLE : REVALIDATE,
      );
      return undefined;
    })
    .use('*', serveStatic({ root }))
    .get('*', serveStatic({ root, path: 'index.html' }));
}

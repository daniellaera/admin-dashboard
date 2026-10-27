import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';
import type { AppEnv } from '../types.ts';

/**
 * Client IP for rate limiting and session metadata. Behind a trusted reverse proxy the
 * first `X-Forwarded-For` entry is used; otherwise the socket address.
 */
export function clientIp(c: Context<AppEnv>): string {
  if (c.get('trustProxy')) {
    const forwarded = c.req.header('x-forwarded-for');
    const first = forwarded?.split(',')[0]?.trim();
    if (first) return first;
    const real = c.req.header('x-real-ip');
    if (real) return real;
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export function userAgent(c: Context<AppEnv>): string | null {
  const ua = c.req.header('user-agent');
  return ua ? ua.slice(0, 255) : null;
}

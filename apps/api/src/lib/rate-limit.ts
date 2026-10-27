import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.ts';
import { RateLimitedError } from './errors.ts';
import { clientIp } from './request-meta.ts';

export interface RateLimiter {
  /** Records a hit and tells whether the key is over its limit. */
  hit(key: string): { allowed: boolean; retryAfterSeconds: number };
  /** Non-mutating check: has the key reached its limit within the window? */
  isLimited(key: string): { limited: boolean; retryAfterSeconds: number };
  /** Forgets a key (e.g. after a successful login). */
  reset(key: string): void;
}

/**
 * In-process sliding-window limiter keyed by an arbitrary string. Sufficient for the
 * single-node deployment (ADR-004/010); the interface allows a Postgres or Redis store later.
 */
export function createRateLimiter(options: { windowMs: number; max: number }): RateLimiter {
  const hits = new Map<string, number[]>();
  let lastSweep = Date.now();

  function sweep(now: number): void {
    if (now - lastSweep < options.windowMs) return;
    lastSweep = now;
    for (const [key, times] of hits) {
      const fresh = times.filter((t) => now - t < options.windowMs);
      if (fresh.length === 0) hits.delete(key);
      else hits.set(key, fresh);
    }
  }

  return {
    hit(key) {
      const now = Date.now();
      sweep(now);
      const fresh = (hits.get(key) ?? []).filter((t) => now - t < options.windowMs);
      fresh.push(now);
      hits.set(key, fresh);
      if (fresh.length <= options.max) return { allowed: true, retryAfterSeconds: 0 };
      const oldest = fresh[0] ?? now;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000)),
      };
    },
    isLimited(key) {
      const now = Date.now();
      const fresh = (hits.get(key) ?? []).filter((t) => now - t < options.windowMs);
      if (fresh.length < options.max) return { limited: false, retryAfterSeconds: 0 };
      const oldest = fresh[0] ?? now;
      return {
        limited: true,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000)),
      };
    },
    reset(key) {
      hits.delete(key);
    },
  };
}

/** Middleware: one hit per request, keyed by client IP (optionally prefixed). */
export function rateLimit(
  limiter: RateLimiter,
  keyOf: (c: Context<AppEnv>) => string = (c) => clientIp(c),
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const { allowed, retryAfterSeconds } = limiter.hit(keyOf(c));
    if (!allowed) throw new RateLimitedError(retryAfterSeconds);
    await next();
  };
}

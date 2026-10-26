import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import type { Logger } from 'pino';
import type { AppEnv } from '../types.ts';

/**
 * Assigns a request id (honouring an incoming `X-Request-Id`), attaches a child logger and logs
 * one line per request with method, path, status and duration. Health probes log at debug level.
 */
export function requestContext(logger: Logger): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const incoming = c.req.header('x-request-id');
    const requestId = incoming && /^[\w.-]{8,128}$/.test(incoming) ? incoming : randomUUID();
    const log = logger.child({ requestId });
    c.set('requestId', requestId);
    c.set('log', log);
    c.header('X-Request-Id', requestId);

    const started = performance.now();
    await next();
    const durationMs = Math.round(performance.now() - started);
    const entry = {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs,
    };
    const quiet = c.req.path.endsWith('/health') || c.req.path.endsWith('/ready');
    if (c.res.status >= 500) log.error(entry, 'request');
    else if (quiet) log.debug(entry, 'request');
    else log.info(entry, 'request');
  };
}

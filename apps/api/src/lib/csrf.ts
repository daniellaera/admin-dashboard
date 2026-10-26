import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.ts';
import { ForbiddenError } from './errors.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const FORM_CONTENT_TYPE =
  /^(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)\b/i;

/**
 * Cross-site request forgery guard for a cookie-authenticated, same-origin API.
 *
 * Browsers always send `Sec-Fetch-Site` and (for non-GET requests) `Origin`; both are checked
 * against the application origin. Requests from non-browser clients carry neither header and
 * cannot ride on the victim's cookies, so they are allowed unless they look like an HTML form
 * submission (the only kind of cross-site request a browser can send without a preflight).
 * Together with `SameSite=Lax` session cookies this is defence in depth (ADR-004).
 */
export function csrfProtection(appOrigin: string): MiddlewareHandler<AppEnv> {
  const allowed = new URL(appOrigin).origin;
  return async (c, next) => {
    if (!SAFE_METHODS.has(c.req.method)) {
      const site = c.req.header('sec-fetch-site');
      const origin = c.req.header('origin');
      if (site !== undefined && site !== 'same-origin' && site !== 'none') {
        throw new ForbiddenError('Cross-site request rejected');
      }
      if (origin !== undefined && origin !== 'null' && origin !== allowed) {
        throw new ForbiddenError('Cross-origin request rejected');
      }
      if (origin === undefined && site === undefined) {
        const contentType = c.req.header('content-type');
        if (contentType !== undefined && FORM_CONTENT_TYPE.test(contentType)) {
          throw new ForbiddenError('Form submissions must come from this site');
        }
      }
    }
    await next();
  };
}

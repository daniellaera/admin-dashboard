import type { AppConfig } from '@devconnector/shared';
import { Hono } from 'hono';
import type { Env } from '../../env.ts';
import type { AppEnv } from '../../types.ts';

/** Public, non-secret runtime configuration consumed by the web app on boot. */
export function configRoutes(env: Env) {
  return new Hono<AppEnv>().get('/config', (c) => {
    const config: AppConfig = {
      appName: env.APP_NAME,
      github: env.githubEnabled,
      requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
      maxUploadMb: env.MAX_UPLOAD_MB,
    };
    return c.json(config);
  });
}

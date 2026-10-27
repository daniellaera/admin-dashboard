import type { AppConfig } from '@devconnector/shared';
import { Hono } from 'hono';
import type { Env } from '../../env.ts';
import type { AppEnv } from '../../types.ts';
import type { SettingsService } from '../settings/service.ts';

/** Public, non-secret runtime configuration consumed by the web app on boot. */
export function configRoutes(env: Env, settings: SettingsService) {
  return new Hono<AppEnv>().get('/config', async (c) => {
    const config: AppConfig = {
      appName: env.APP_NAME,
      github: env.githubEnabled,
      requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
      registrationMode: await settings.registrationMode(),
      maxUploadMb: env.MAX_UPLOAD_MB,
    };
    return c.json(config);
  });
}

import { idParamSchema, profilesQuerySchema } from '@devconnector/shared';
import { Hono } from 'hono';
import { validate } from '../../lib/validate.ts';
import type { AppEnv } from '../../types.ts';
import type { ProfilesService } from './service.ts';

/** Public developers directory. Never returns e-mail addresses (PRIV-01). */
export function profilesRoutes(service: ProfilesService) {
  return new Hono<AppEnv>()
    .get('/', validate('query', profilesQuerySchema), async (c) =>
      c.json(await service.listPublic(c.req.valid('query'))),
    )
    .get('/:id', validate('param', idParamSchema), async (c) =>
      c.json(await service.getPublic(c.req.valid('param').id, c.get('user'))),
    );
}

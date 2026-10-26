import {
  idParamSchema,
  notificationPreferencesSchema,
  notificationsQuerySchema,
  type UnreadCount,
} from '@devconnector/shared';
import { Hono } from 'hono';
import { validate } from '../../lib/validate.ts';
import type { AppEnv } from '../../types.ts';
import { currentUser, requireAuth } from '../auth/middleware.ts';
import type { NotificationsService } from './service.ts';

export function notificationRoutes(service: NotificationsService) {
  return new Hono<AppEnv>()
    .use(requireAuth)
    .get('/', validate('query', notificationsQuerySchema), async (c) =>
      c.json(await service.list(currentUser(c).id, c.req.valid('query'))),
    )
    .get('/unread-count', async (c) => {
      const body: UnreadCount = { unread: await service.unreadCount(currentUser(c).id) };
      return c.json(body);
    })
    .post('/read-all', async (c) => {
      await service.markAllRead(currentUser(c).id);
      return c.body(null, 204);
    })
    .post('/:id/read', validate('param', idParamSchema), async (c) => {
      await service.markRead(currentUser(c).id, c.req.valid('param').id);
      return c.body(null, 204);
    })
    .delete('/:id', validate('param', idParamSchema), async (c) => {
      await service.remove(currentUser(c).id, c.req.valid('param').id);
      return c.body(null, 204);
    })
    .get('/preferences', async (c) => c.json(await service.getPreferences(currentUser(c).id)))
    .put('/preferences', validate('json', notificationPreferencesSchema), async (c) =>
      c.json(await service.setPreferences(currentUser(c).id, c.req.valid('json').preferences)),
    );
}

import {
  commentCreateSchema,
  commentsQuerySchema,
  idParamSchema,
  postCreateSchema,
  postsQuerySchema,
  postUpdateSchema,
} from '@devconnector/shared';
import { Hono } from 'hono';
import { validate } from '../../lib/validate.ts';
import type { AppEnv } from '../../types.ts';
import { currentUser, requireAuth } from '../auth/middleware.ts';
import type { PostsService } from './service.ts';

export function postsRoutes(service: PostsService) {
  return new Hono<AppEnv>()
    .get('/', validate('query', postsQuerySchema), async (c) =>
      c.json(await service.listFeed(c.req.valid('query'), c.get('user'))),
    )
    .post('/', requireAuth, validate('json', postCreateSchema), async (c) =>
      c.json(await service.create(currentUser(c), c.req.valid('json')), 201),
    )
    .get('/:id', validate('param', idParamSchema), async (c) =>
      c.json(await service.get(c.req.valid('param').id, c.get('user'))),
    )
    .patch(
      '/:id',
      requireAuth,
      validate('param', idParamSchema),
      validate('json', postUpdateSchema),
      async (c) =>
        c.json(await service.update(c.req.valid('param').id, currentUser(c), c.req.valid('json'))),
    )
    .delete('/:id', requireAuth, validate('param', idParamSchema), async (c) => {
      await service.remove(c.req.valid('param').id, currentUser(c));
      return c.body(null, 204);
    })
    .get(
      '/:id/comments',
      validate('param', idParamSchema),
      validate('query', commentsQuerySchema),
      async (c) =>
        c.json(
          await service.listComments(c.req.valid('param').id, c.req.valid('query'), c.get('user')),
        ),
    )
    .post(
      '/:id/comments',
      requireAuth,
      validate('param', idParamSchema),
      validate('json', commentCreateSchema),
      async (c) =>
        c.json(
          await service.addComment(
            c.req.valid('param').id,
            currentUser(c),
            c.req.valid('json').body,
          ),
          201,
        ),
    )
    .put('/:id/like', requireAuth, validate('param', idParamSchema), async (c) =>
      c.json(await service.like(c.req.valid('param').id, currentUser(c))),
    )
    .delete('/:id/like', requireAuth, validate('param', idParamSchema), async (c) =>
      c.json(await service.unlike(c.req.valid('param').id, currentUser(c))),
    );
}

export function commentsRoutes(service: PostsService) {
  return new Hono<AppEnv>().delete(
    '/:id',
    requireAuth,
    validate('param', idParamSchema),
    async (c) => {
      await service.removeComment(c.req.valid('param').id, currentUser(c));
      return c.body(null, 204);
    },
  );
}

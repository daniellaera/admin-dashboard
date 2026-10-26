import {
  educationInputSchema,
  experienceInputSchema,
  idParamSchema,
  postsQuerySchema,
  profileUpdateSchema,
} from '@devconnector/shared';
import { Hono } from 'hono';
import { validate } from '../../lib/validate.ts';
import type { AppEnv } from '../../types.ts';
import { currentUser, requireAuth } from '../auth/middleware.ts';
import type { CvService } from '../cv/service.ts';
import type { PostsService } from '../posts/service.ts';
import type { ProfilesService } from '../profiles/service.ts';

export interface MeDeps {
  profiles: ProfilesService;
  cv: CvService;
  posts: PostsService;
}

/** Everything about the signed-in user's own data (owner-only by construction). */
export function meRoutes({ profiles, cv, posts }: MeDeps) {
  return new Hono<AppEnv>()
    .use(requireAuth)
    .get('/profile', async (c) => c.json(await profiles.getMine(currentUser(c).id)))
    .patch('/profile', validate('json', profileUpdateSchema), async (c) =>
      c.json(await profiles.updateMine(currentUser(c).id, c.req.valid('json'))),
    )
    .get('/posts', validate('query', postsQuerySchema), async (c) => {
      const me = currentUser(c);
      return c.json(await posts.listByAuthor(me.id, c.req.valid('query'), me));
    })

    .get('/experiences', async (c) => c.json(await cv.experiences.list(currentUser(c).id)))
    .post('/experiences', validate('json', experienceInputSchema), async (c) =>
      c.json(await cv.experiences.create(currentUser(c).id, c.req.valid('json')), 201),
    )
    .put(
      '/experiences/:id',
      validate('param', idParamSchema),
      validate('json', experienceInputSchema),
      async (c) =>
        c.json(
          await cv.experiences.update(
            currentUser(c).id,
            c.req.valid('param').id,
            c.req.valid('json'),
          ),
        ),
    )
    .delete('/experiences/:id', validate('param', idParamSchema), async (c) => {
      await cv.experiences.remove(currentUser(c).id, c.req.valid('param').id);
      return c.body(null, 204);
    })

    .get('/educations', async (c) => c.json(await cv.educations.list(currentUser(c).id)))
    .post('/educations', validate('json', educationInputSchema), async (c) =>
      c.json(await cv.educations.create(currentUser(c).id, c.req.valid('json')), 201),
    )
    .put(
      '/educations/:id',
      validate('param', idParamSchema),
      validate('json', educationInputSchema),
      async (c) =>
        c.json(
          await cv.educations.update(
            currentUser(c).id,
            c.req.valid('param').id,
            c.req.valid('json'),
          ),
        ),
    )
    .delete('/educations/:id', validate('param', idParamSchema), async (c) => {
      await cv.educations.remove(currentUser(c).id, c.req.valid('param').id);
      return c.body(null, 204);
    });
}

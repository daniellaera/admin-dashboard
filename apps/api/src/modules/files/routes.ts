import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { PayloadTooLargeError, ValidationError } from '../../lib/errors.ts';
import type { AppEnv } from '../../types.ts';
import { currentUser, requireAuth } from '../auth/middleware.ts';
import type { FilesService } from './service.ts';

/** `POST /me/avatar` (multipart field `file`) and `DELETE /me/avatar`. */
export function avatarRoutes(files: FilesService, maxUploadBytes: number) {
  return new Hono<AppEnv>()
    .use(requireAuth)
    .post(
      '/',
      bodyLimit({
        maxSize: maxUploadBytes + 64 * 1024, // multipart framing overhead
        onError: () => {
          throw new PayloadTooLargeError();
        },
      }),
      async (c) => {
        const body = await c.req.parseBody();
        const file = body.file;
        if (!(file instanceof File)) {
          throw new ValidationError([
            { path: 'file', message: 'Send the image as the "file" field of a multipart form' },
          ]);
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        return c.json(await files.uploadAvatar(currentUser(c).id, buffer));
      },
    )
    .delete('/', async (c) => c.json(await files.removeAvatar(currentUser(c).id)));
}

/**
 * `GET /files/avatars/:userId/:name` — public, immutable (content-addressed names).
 * Mounted outside `/api/v1`.
 */
export function fileRoutes(files: FilesService) {
  return new Hono<AppEnv>().get('/*', async (c) => {
    const relativePath = decodeURIComponent(c.req.path.replace(/^\/files\//, ''));
    const found = await files.readAvatar(relativePath);
    if (!found) return c.notFound();
    if (c.req.header('if-none-match') === found.etag) {
      return new Response(null, { status: 304, headers: { ETag: found.etag } });
    }
    return new Response(new Uint8Array(found.body), {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(found.body.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: found.etag,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });
}

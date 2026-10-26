import type { PublicProfile } from '@devconnector/shared';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import type { Logger } from 'pino';
import sharp from 'sharp';
import type { Db } from '../../db/client.ts';
import { profiles, users } from '../../db/schema.ts';
import {
  NotFoundError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ValidationError,
} from '../../lib/errors.ts';
import type { Storage } from '../../lib/storage.ts';
import { toPublicProfile } from '../users/mappers.ts';

/** Avatar files: `avatars/<userId>/<hash>.webp` (256 px) and `<hash>-64.webp` (64 px). */
const AVATAR_PATH = /^avatars\/(\d{1,10})\/([a-f0-9]{16})(-64)?\.webp$/;
const ACCEPTED_INPUT = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff']);
const MAX_INPUT_PIXELS = 40_000_000; // 40 MP guards against decompression bombs

export interface FilesDeps {
  db: Db;
  storage: Storage;
  maxUploadBytes: number;
  log: Logger;
}

export function createFilesService({ db, storage, maxUploadBytes, log }: FilesDeps) {
  async function profileOf(userId: number): Promise<PublicProfile> {
    const [row] = await db
      .select({ user: users, profile: profiles })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new NotFoundError('Profile not found');
    return toPublicProfile(row.user, row.profile);
  }

  return {
    /**
     * Validates (size, real image format), re-encodes to WebP in two sizes, stores them under
     * the user's folder, deletes the previous files and updates the profile.
     */
    async uploadAvatar(userId: number, input: Buffer): Promise<PublicProfile> {
      if (input.byteLength === 0) {
        throw new ValidationError([{ path: 'file', message: 'Select an image to upload' }]);
      }
      if (input.byteLength > maxUploadBytes) {
        throw new PayloadTooLargeError(
          `Images must be smaller than ${Math.round(maxUploadBytes / 1_048_576)} MB`,
        );
      }
      let format: string | undefined;
      try {
        format = (await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata()).format;
      } catch {
        throw new UnsupportedMediaTypeError('The file is not an image we can read');
      }
      if (!format || !ACCEPTED_INPUT.has(format)) {
        throw new UnsupportedMediaTypeError('Use a JPEG, PNG, WebP, GIF or AVIF image');
      }

      const pipeline = () =>
        sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, animated: false }).rotate();
      const large = await pipeline()
        .resize(256, 256, { fit: 'cover' })
        .webp({ quality: 82 })
        .toBuffer();
      const small = await pipeline()
        .resize(64, 64, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();
      const hash = createHash('sha256').update(large).digest('hex').slice(0, 16);
      const dir = `avatars/${userId}`;
      const mainPath = `${dir}/${hash}.webp`;

      // Replace: write the new files, then drop everything else in the folder.
      await storage.put(mainPath, large);
      await storage.put(`${dir}/${hash}-64.webp`, small);
      for (const name of await storage.list(dir)) {
        if (name !== `${hash}.webp` && name !== `${hash}-64.webp`)
          await storage.delete(`${dir}/${name}`);
      }
      await db.update(profiles).set({ avatarPath: mainPath }).where(eq(profiles.userId, userId));
      log.info({ userId, bytes: input.byteLength, format }, 'avatar updated');
      return profileOf(userId);
    },

    async removeAvatar(userId: number): Promise<PublicProfile> {
      await storage.deleteDir(`avatars/${userId}`);
      await db.update(profiles).set({ avatarPath: null }).where(eq(profiles.userId, userId));
      return profileOf(userId);
    },

    /** Account deletion hook: the database row is already gone, only files remain. */
    async deleteAllFor(userId: number): Promise<void> {
      await storage.deleteDir(`avatars/${userId}`);
    },

    /** Serves a stored avatar; `null` when the path is not a valid avatar path or does not exist. */
    async readAvatar(relativePath: string): Promise<{ body: Buffer; etag: string } | null> {
      const match = AVATAR_PATH.exec(relativePath);
      if (!match) return null;
      const body = await storage.get(relativePath);
      if (!body) return null;
      return { body, etag: `"${match[2]}${match[3] ?? ''}"` };
    },
  };
}

export type FilesService = ReturnType<typeof createFilesService>;

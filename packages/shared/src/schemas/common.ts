import { z } from 'zod';
import { LIMITS } from '../constants.ts';

/** Positive integer id from a path parameter (`/posts/:id`). */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Offset pagination for tables (`?page=2&limit=10`). */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(LIMITS.pageSizeDefault),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

/** Keyset pagination for infinite lists (`?cursor=<last id>&limit=20`). */
export const cursorQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(20),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

/** ISO calendar date `YYYY-MM-DD` (from `<input type="date">`). */
export const isoDateSchema = z.iso.date({ error: 'Enter a date as YYYY-MM-DD' });

/** Normalised (trimmed, lower-cased) then validated e-mail address. */
export const emailSchema = z
  .string({ error: 'Enter a valid e-mail address' })
  .trim()
  .toLowerCase()
  .max(LIMITS.email, { error: 'E-mail address is too long' })
  .pipe(z.email({ error: 'Enter a valid e-mail address' }));

export const passwordSchema = z
  .string()
  .min(LIMITS.password.min, { error: `Use at least ${LIMITS.password.min} characters` })
  .max(LIMITS.password.max, { error: `Use at most ${LIMITS.password.max} characters` });

/** One-time token carried in e-mail links (base64url of 32 random bytes = 43 chars). */
export const tokenSchema = z
  .string()
  .min(20)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/, { error: 'Invalid token' });

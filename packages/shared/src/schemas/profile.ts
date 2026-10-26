import { z } from 'zod';
import { LIMITS, SKILL_VALUES } from '../constants.ts';
import { pageQuerySchema } from './common.ts';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

/** PATCH /me/profile — every field optional, unknown keys rejected (no mass assignment). */
export const profileUpdateSchema = z.strictObject({
  username: z
    .string()
    .trim()
    .min(LIMITS.username.min, { error: 'Username is required' })
    .max(LIMITS.username.max)
    .optional(),
  website: z
    .union([
      z.literal(''),
      z.url({ protocol: /^https?$/, hostname: z.regexes.domain, error: 'Enter a valid URL' }),
    ])
    .nullable()
    .optional(),
  company: optionalText(LIMITS.company),
  bio: optionalText(LIMITS.bio),
  isPublic: z.boolean().optional(),
  skills: z.array(z.enum(SKILL_VALUES)).max(LIMITS.skillsMax).optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** GET /profiles?page&limit&q — public directory. */
export const profilesQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(LIMITS.searchQuery).optional(),
});
export type ProfilesQuery = z.infer<typeof profilesQuerySchema>;

import { z } from 'zod';
import { LIMITS, ROLES } from '../constants.ts';
import { pageQuerySchema } from './common.ts';

/** PATCH /admin/users/:id */
export const adminUserUpdateSchema = z
  .strictObject({
    role: z.enum(ROLES).optional(),
    disabled: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.disabled !== undefined, {
    error: 'Nothing to update',
  });
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;

/** GET /admin/users?q&page&limit */
export const adminUsersQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(LIMITS.searchQuery).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'disabled']).optional(),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

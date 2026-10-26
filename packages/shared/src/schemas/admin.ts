import { z } from 'zod';
import {
  ASSIGNABLE_ROLES,
  AUDIT_ACTIONS,
  CATALOG_KINDS,
  INVITABLE_ROLES,
  LIMITS,
  REGISTRATION_MODES,
  ROLES,
} from '../constants.ts';
import { catalogValueSchema, emailSchema, pageQuerySchema } from './common.ts';

/** PATCH /admin/users/:id — role changes are owner-only and need sudo mode (ADR-013). */
export const adminUserUpdateSchema = z
  .strictObject({
    role: z.enum(ASSIGNABLE_ROLES).optional(),
    disabled: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.disabled !== undefined, {
    error: 'Nothing to update',
  });
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;

/** GET /admin/users?q&page&limit&role&status */
export const adminUsersQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(LIMITS.searchQuery).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'disabled']).optional(),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

/** POST /admin/invitations */
export const invitationCreateSchema = z.strictObject({
  email: emailSchema,
  role: z.enum(INVITABLE_ROLES),
});
export type InvitationCreateInput = z.infer<typeof invitationCreateSchema>;

/** PUT /admin/settings */
export const settingsUpdateSchema = z.strictObject({
  registrationMode: z.enum(REGISTRATION_MODES),
});
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

/** GET /admin/audit?page&limit&action&userId */
export const auditQuerySchema = pageQuerySchema.extend({
  action: z.enum(AUDIT_ACTIONS).optional(),
  userId: z.coerce.number().int().positive().optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const catalogKindParamSchema = z.object({ kind: z.enum(CATALOG_KINDS) });
export const catalogValueParamSchema = z.object({
  kind: z.enum(CATALOG_KINDS),
  value: catalogValueSchema,
});

/** POST /admin/catalog/:kind */
export const catalogItemSchema = z.strictObject({
  value: catalogValueSchema,
  label: z.string().trim().min(1, { error: 'Label is required' }).max(LIMITS.catalogLabel),
});
export type CatalogItemInput = z.infer<typeof catalogItemSchema>;

/** PATCH /admin/catalog/:kind/:value */
export const catalogItemUpdateSchema = z.strictObject({
  label: z.string().trim().min(1, { error: 'Label is required' }).max(LIMITS.catalogLabel),
});
export type CatalogItemUpdateInput = z.infer<typeof catalogItemUpdateSchema>;

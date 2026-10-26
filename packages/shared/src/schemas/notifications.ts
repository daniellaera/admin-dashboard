import { z } from 'zod';
import { CONFIGURABLE_NOTIFICATION_TYPES } from '../constants.ts';
import { cursorQuerySchema } from './common.ts';

const configurableType = z.enum(
  CONFIGURABLE_NOTIFICATION_TYPES as [string, ...string[]] as unknown as [
    'comment',
    'like',
    'new_post',
  ],
);

export const notificationPreferenceSchema = z.strictObject({
  type: configurableType,
  inApp: z.boolean(),
  email: z.boolean(),
});
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;

/** PUT /notifications/preferences — the full set of configurable types. */
export const notificationPreferencesSchema = z.strictObject({
  preferences: z.array(notificationPreferenceSchema).max(CONFIGURABLE_NOTIFICATION_TYPES.length),
});
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

export const notificationsQuerySchema = cursorQuerySchema.extend({
  unreadOnly: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
});
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

import { z } from 'zod';
import { emailSchema, passwordSchema, tokenSchema } from './common.ts';

export const registerSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, { error: 'Enter your password' }).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const emailOnlySchema = z.strictObject({ email: emailSchema });
export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;

export const tokenOnlySchema = z.strictObject({ token: tokenSchema });
export type TokenOnlyInput = z.infer<typeof tokenOnlySchema>;

export const resetPasswordSchema = z.strictObject({
  token: tokenSchema,
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1, { error: 'Enter your current password' }).max(128),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Account deletion confirmation: password holders confirm with their password,
 * OAuth-only accounts confirm by typing their e-mail address.
 */
export const deleteAccountSchema = z.strictObject({
  password: z.string().max(128).optional(),
  email: emailSchema.optional(),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

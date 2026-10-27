import { REGISTRATION_MODES, type RegistrationMode, type SettingsDto } from '@devconnector/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { settings } from '../../db/schema.ts';
import type { AuditService } from '../audit/service.ts';

const REGISTRATION_MODE_KEY = 'registration_mode';

/** Application settings stored as key/value rows; today only the registration mode (ADR-013). */
export function createSettingsService(db: Db, audit: AuditService) {
  async function registrationMode(): Promise<RegistrationMode> {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, REGISTRATION_MODE_KEY));
    const value = row?.value;
    return typeof value === 'string' && (REGISTRATION_MODES as readonly string[]).includes(value)
      ? (value as RegistrationMode)
      : 'open';
  }

  return {
    registrationMode,

    async get(): Promise<SettingsDto> {
      return { registrationMode: await registrationMode() };
    },

    async update(
      input: SettingsDto,
      actor: { id: number },
      ip: string | null,
    ): Promise<SettingsDto> {
      const before = await registrationMode();
      await db
        .insert(settings)
        .values({ key: REGISTRATION_MODE_KEY, value: input.registrationMode, updatedBy: actor.id })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: input.registrationMode, updatedAt: new Date(), updatedBy: actor.id },
        });
      if (before !== input.registrationMode) {
        await audit.record({
          action: 'settings.update',
          actorId: actor.id,
          data: { key: REGISTRATION_MODE_KEY, from: before, to: input.registrationMode },
          ip,
        });
      }
      return { registrationMode: input.registrationMode };
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;

import { zValidator } from '@hono/zod-validator';
import type { ZodError, ZodType } from 'zod';
import { ValidationError } from './errors.ts';

type Target = 'json' | 'query' | 'param' | 'form';

/**
 * Zod validation for a request part. Failures become 400 problem+json with field errors
 * (see errors.ts) instead of Hono's default plain-text 400.
 */
export function validate<T extends ZodType, Tg extends Target>(target: Tg, schema: T) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      throw ValidationError.fromZod(result.error as unknown as ZodError);
    }
  });
}

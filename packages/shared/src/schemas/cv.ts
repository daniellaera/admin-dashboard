import { z } from 'zod';
import { LIMITS } from '../constants.ts';
import { isoDateSchema } from './common.ts';

const short = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required` })
    .max(LIMITS.cvShort);
const long = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required` })
    .max(LIMITS.cvText);

const period = {
  startedOn: isoDateSchema,
  endedOn: isoDateSchema.nullable(),
  isCurrent: z.boolean(),
};

function checkPeriod(
  value: { startedOn: string; endedOn: string | null; isCurrent: boolean },
  ctx: z.RefinementCtx,
): void {
  if (!value.isCurrent && value.endedOn === null) {
    ctx.addIssue({
      code: 'custom',
      path: ['endedOn'],
      message: 'End date is required unless this is your current position',
    });
  }
  if (value.endedOn !== null && value.endedOn < value.startedOn) {
    ctx.addIssue({
      code: 'custom',
      path: ['endedOn'],
      message: 'End date must be on or after the start date',
    });
  }
}

/** POST/PUT /me/experiences — full replace semantics. */
export const experienceInputSchema = z
  .strictObject({
    title: short('Title'),
    description: long('Description'),
    company: short('Company'),
    location: short('Location'),
    ...period,
  })
  .superRefine(checkPeriod);
export type ExperienceInput = z.infer<typeof experienceInputSchema>;

/** POST/PUT /me/educations — full replace semantics. */
export const educationInputSchema = z
  .strictObject({
    school: short('School'),
    description: long('Description'),
    degree: short('Degree'),
    fieldOfStudy: short('Field of study'),
    ...period,
  })
  .superRefine(checkPeriod);
export type EducationInput = z.infer<typeof educationInputSchema>;

import type {
  EducationDto,
  EducationInput,
  ExperienceDto,
  ExperienceInput,
} from '@devconnector/shared';
import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { educations, experiences } from '../../db/schema.ts';
import { NotFoundError } from '../../lib/errors.ts';

type ExperienceRow = typeof experiences.$inferSelect;
type EducationRow = typeof educations.$inferSelect;

export const toCvDtos = {
  experience(row: ExperienceRow): ExperienceDto {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      company: row.company,
      location: row.location,
      startedOn: row.startedOn,
      endedOn: row.isCurrent ? null : row.endedOn,
      isCurrent: row.isCurrent,
    };
  },
  experiences(rows: ExperienceRow[]): ExperienceDto[] {
    return rows.map((r) => toCvDtos.experience(r));
  },
  education(row: EducationRow): EducationDto {
    return {
      id: row.id,
      school: row.school,
      description: row.description,
      degree: row.degree,
      fieldOfStudy: row.fieldOfStudy,
      startedOn: row.startedOn,
      endedOn: row.isCurrent ? null : row.endedOn,
      isCurrent: row.isCurrent,
    };
  },
  educations(rows: EducationRow[]): EducationDto[] {
    return rows.map((r) => toCvDtos.education(r));
  },
};

/** Experiences and educations of the signed-in user (owner-only, enforced by `userId` in every query). */
export function createCvService(db: Db) {
  const normalisePeriod = <T extends { endedOn: string | null; isCurrent: boolean }>(
    input: T,
  ): T => ({
    ...input,
    endedOn: input.isCurrent ? null : input.endedOn,
  });

  return {
    experiences: {
      list: async (userId: number) =>
        toCvDtos.experiences(
          await db
            .select()
            .from(experiences)
            .where(eq(experiences.userId, userId))
            .orderBy(desc(experiences.startedOn), desc(experiences.id)),
        ),
      async create(userId: number, input: ExperienceInput) {
        const [row] = await db
          .insert(experiences)
          .values({ userId, ...normalisePeriod(input) })
          .returning();
        if (!row) throw new Error('insert experiences returned nothing');
        return toCvDtos.experience(row);
      },
      async update(userId: number, id: number, input: ExperienceInput) {
        const [row] = await db
          .update(experiences)
          .set(normalisePeriod(input))
          .where(and(eq(experiences.id, id), eq(experiences.userId, userId)))
          .returning();
        if (!row) throw new NotFoundError('Experience not found');
        return toCvDtos.experience(row);
      },
      async remove(userId: number, id: number) {
        const deleted = await db
          .delete(experiences)
          .where(and(eq(experiences.id, id), eq(experiences.userId, userId)))
          .returning({ id: experiences.id });
        if (deleted.length === 0) throw new NotFoundError('Experience not found');
      },
    },
    educations: {
      list: async (userId: number) =>
        toCvDtos.educations(
          await db
            .select()
            .from(educations)
            .where(eq(educations.userId, userId))
            .orderBy(desc(educations.startedOn), desc(educations.id)),
        ),
      async create(userId: number, input: EducationInput) {
        const [row] = await db
          .insert(educations)
          .values({ userId, ...normalisePeriod(input) })
          .returning();
        if (!row) throw new Error('insert educations returned nothing');
        return toCvDtos.education(row);
      },
      async update(userId: number, id: number, input: EducationInput) {
        const [row] = await db
          .update(educations)
          .set(normalisePeriod(input))
          .where(and(eq(educations.id, id), eq(educations.userId, userId)))
          .returning();
        if (!row) throw new NotFoundError('Education not found');
        return toCvDtos.education(row);
      },
      async remove(userId: number, id: number) {
        const deleted = await db
          .delete(educations)
          .where(and(eq(educations.id, id), eq(educations.userId, userId)))
          .returning({ id: educations.id });
        if (deleted.length === 0) throw new NotFoundError('Education not found');
      },
    },
  };
}

export type CvService = ReturnType<typeof createCvService>;

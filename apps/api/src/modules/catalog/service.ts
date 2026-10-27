import {
  type Catalog,
  type CatalogItem,
  type CatalogItemInput,
  type CatalogKind,
  DEFAULT_SKILLS,
  DEFAULT_TAGS,
} from '@devconnector/shared';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { catalogSkills, catalogTags, posts, profiles } from '../../db/schema.ts';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.ts';

const tableOf = (kind: CatalogKind) => (kind === 'skills' ? catalogSkills : catalogTags);

/**
 * Skills and tags catalog (ADR-013: managed by admins). Profile skills and post tags are
 * validated against it at write time; removing an entry scrubs it from every array.
 */
export function createCatalogService(db: Db) {
  async function list(kind: CatalogKind): Promise<CatalogItem[]> {
    const table = tableOf(kind);
    return db
      .select({ value: table.value, label: table.label })
      .from(table)
      .orderBy(asc(table.label));
  }

  return {
    async all(): Promise<Catalog> {
      const [skills, tags] = await Promise.all([list('skills'), list('tags')]);
      return { skills, tags };
    },

    list,

    /** Inserts the default entries that are missing (idempotent; run at boot and by the seed). */
    async ensureDefaults(): Promise<void> {
      await db
        .insert(catalogSkills)
        .values(DEFAULT_SKILLS.map((s) => ({ value: s.value, label: s.label })))
        .onConflictDoNothing();
      await db
        .insert(catalogTags)
        .values(DEFAULT_TAGS.map((t) => ({ value: t.value, label: t.label })))
        .onConflictDoNothing();
    },

    /** Throws a 400 with one field error per unknown value. */
    async assertKnown(kind: CatalogKind, field: string, values: string[]): Promise<void> {
      if (values.length === 0) return;
      const table = tableOf(kind);
      const known = new Set(
        (
          await db.select({ value: table.value }).from(table).where(inArray(table.value, values))
        ).map((r) => r.value),
      );
      const errors = values
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => !known.has(v))
        .map(({ v, i }) => ({
          path: `${field}.${i}`,
          message: `Unknown ${kind === 'skills' ? 'skill' : 'tag'} "${v}"`,
        }));
      if (errors.length > 0) throw new ValidationError(errors);
    },

    async create(kind: CatalogKind, input: CatalogItemInput): Promise<CatalogItem> {
      const table = tableOf(kind);
      const inserted = await db
        .insert(table)
        .values({ value: input.value, label: input.label })
        .onConflictDoNothing()
        .returning({ value: table.value, label: table.label });
      const item = inserted[0];
      if (!item) throw new ConflictError(`"${input.value}" already exists in the ${kind} catalog`);
      return item;
    },

    async update(kind: CatalogKind, value: string, label: string): Promise<CatalogItem> {
      const table = tableOf(kind);
      const [item] = await db
        .update(table)
        .set({ label })
        .where(eq(table.value, value))
        .returning({ value: table.value, label: table.label });
      if (!item) throw new NotFoundError(`"${value}" is not in the ${kind} catalog`);
      return item;
    },

    /** Removes the entry and scrubs it from every profile or post that used it. */
    async remove(kind: CatalogKind, value: string): Promise<void> {
      const table = tableOf(kind);
      const deleted = await db
        .delete(table)
        .where(eq(table.value, value))
        .returning({ value: table.value });
      if (deleted.length === 0) throw new NotFoundError(`"${value}" is not in the ${kind} catalog`);
      if (kind === 'skills') {
        await db
          .update(profiles)
          .set({ skills: sql`array_remove(${profiles.skills}, ${value})` })
          .where(sql`${value} = any(${profiles.skills})`);
      } else {
        await db
          .update(posts)
          .set({ tags: sql`array_remove(${posts.tags}, ${value})` })
          .where(sql`${value} = any(${posts.tags})`);
      }
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;

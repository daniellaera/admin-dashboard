import type {
  PageQuery,
  ProfileDetail,
  ProfileUpdateInput,
  PublicProfile,
} from '@devconnector/shared';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { educations, experiences, posts, profiles, users } from '../../db/schema.ts';
import { NotFoundError } from '../../lib/errors.ts';
import { offsetOf, paginated } from '../../lib/pagination.ts';
import { isModerator } from '../auth/middleware.ts';
import type { CurrentUser } from '../auth/session.ts';
import type { CatalogService } from '../catalog/service.ts';
import { toCvDtos } from '../cv/service.ts';
import { toPublicProfile } from '../users/mappers.ts';

export function createProfilesService(db: Db, catalog: CatalogService) {
  const visibleAuthor = and(isNull(users.disabledAt));

  async function detail(userId: number): Promise<ProfileDetail> {
    const [row] = await db
      .select({ user: users, profile: profiles })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new NotFoundError('Profile not found');
    const [exp, edu, postCountRow] = await Promise.all([
      db
        .select()
        .from(experiences)
        .where(eq(experiences.userId, userId))
        .orderBy(desc(experiences.startedOn), desc(experiences.id)),
      db
        .select()
        .from(educations)
        .where(eq(educations.userId, userId))
        .orderBy(desc(educations.startedOn), desc(educations.id)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(posts)
        .where(and(eq(posts.authorId, userId), eq(posts.published, true))),
    ]);
    return {
      ...toPublicProfile(row.user, row.profile),
      experiences: toCvDtos.experiences(exp),
      educations: toCvDtos.educations(edu),
      postCount: postCountRow[0]?.count ?? 0,
    };
  }

  return {
    /** Public directory: public profiles of active users; e-mail never included. */
    async listPublic(query: PageQuery & { q?: string | undefined }) {
      const search = query.q
        ? or(ilike(profiles.username, `%${query.q}%`), ilike(profiles.company, `%${query.q}%`))
        : undefined;
      const where = and(eq(profiles.isPublic, true), visibleAuthor, search);
      const [rows, totalRow] = await Promise.all([
        db
          .select({ user: users, profile: profiles })
          .from(profiles)
          .innerJoin(users, eq(users.id, profiles.userId))
          .where(where)
          .orderBy(desc(profiles.createdAt), desc(profiles.userId))
          .limit(query.limit)
          .offset(offsetOf(query)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(profiles)
          .innerJoin(users, eq(users.id, profiles.userId))
          .where(where),
      ]);
      return paginated(
        rows.map((r) => toPublicProfile(r.user, r.profile)),
        query,
        totalRow[0]?.count ?? 0,
      );
    },

    /** One profile. Private profiles are visible to their owner and to admins only. */
    async getPublic(userId: number, viewer: CurrentUser | undefined): Promise<ProfileDetail> {
      const profile = await detail(userId);
      const privileged = viewer !== undefined && (viewer.id === userId || isModerator(viewer));
      if (!profile.isPublic && !privileged) throw new NotFoundError('Profile not found');
      const [owner] = await db
        .select({ disabledAt: users.disabledAt })
        .from(users)
        .where(eq(users.id, userId));
      if (owner?.disabledAt && !privileged) throw new NotFoundError('Profile not found');
      return profile;
    },

    getMine: detail,

    async updateMine(userId: number, input: ProfileUpdateInput): Promise<PublicProfile> {
      const patch: Partial<typeof profiles.$inferInsert> = {};
      if (input.username !== undefined) patch.username = input.username;
      if (input.website !== undefined) patch.website = input.website === '' ? null : input.website;
      if (input.company !== undefined) patch.company = input.company === '' ? null : input.company;
      if (input.bio !== undefined) patch.bio = input.bio === '' ? null : input.bio;
      if (input.isPublic !== undefined) patch.isPublic = input.isPublic;
      if (input.skills !== undefined) {
        const skills = [...new Set(input.skills)];
        await catalog.assertKnown('skills', 'skills', skills);
        patch.skills = skills;
      }
      if (Object.keys(patch).length > 0) {
        await db.update(profiles).set(patch).where(eq(profiles.userId, userId));
      }
      const [row] = await db
        .select({ user: users, profile: profiles })
        .from(users)
        .innerJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1);
      if (!row) throw new NotFoundError('Profile not found');
      return toPublicProfile(row.user, row.profile);
    },
  };
}

export type ProfilesService = ReturnType<typeof createProfilesService>;

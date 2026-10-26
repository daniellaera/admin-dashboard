import {
  type AuthorCard,
  type AuthProvider,
  displayNameOf,
  type Me,
  type PublicProfile,
} from '@devconnector/shared';
import type { profiles, users } from '../../db/schema.ts';

export type UserRow = typeof users.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;

/** Public URL of a stored avatar (served by the files module), or null. */
export function avatarUrlFor(avatarPath: string | null): string | null {
  return avatarPath ? `/files/${avatarPath}` : null;
}

export function toAuthorCard(
  user: { id: number },
  profile: Pick<ProfileRow, 'username' | 'avatarPath'> | null,
): AuthorCard {
  return {
    id: user.id,
    displayName: displayNameOf({ id: user.id, username: profile?.username ?? null }),
    avatarUrl: avatarUrlFor(profile?.avatarPath ?? null),
  };
}

/** Never includes the e-mail address (PRIV-01). */
export function toPublicProfile(user: Pick<UserRow, 'id'>, profile: ProfileRow): PublicProfile {
  return {
    ...toAuthorCard(user, profile),
    username: profile.username,
    website: profile.website,
    company: profile.company,
    bio: profile.bio,
    isPublic: profile.isPublic,
    skills: profile.skills,
    createdAt: profile.createdAt.toISOString(),
  };
}

export function toMe(user: UserRow, profile: ProfileRow, providers: AuthProvider[]): Me {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    hasPassword: user.passwordHash !== null,
    providers,
    createdAt: user.createdAt.toISOString(),
    profile: toPublicProfile(user, profile),
  };
}

/**
 * Domain constants shared by the API and the web app.
 * Values are stable identifiers (stored in the database); labels are for display.
 */

export const POST_TYPES = ['FUNNY', 'TECH', 'RANDOM', 'NEWS', 'SERIOUS'] as const;
export type PostType = (typeof POST_TYPES)[number];

/** Display order of the post-type select, as in the original UI. */
export const POST_TYPE_OPTIONS: readonly { value: PostType; label: string }[] = [
  { value: 'FUNNY', label: 'Funny' },
  { value: 'SERIOUS', label: 'Serious' },
  { value: 'NEWS', label: 'News' },
  { value: 'RANDOM', label: 'Random' },
  { value: 'TECH', label: 'Tech' },
];

/** Default skills catalog (the 15 languages of the original app). Admins can extend it. */
export const DEFAULT_SKILLS = [
  { value: 'python', label: 'Python' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'java', label: 'Java' },
  { value: 'php', label: 'PHP' },
  { value: 'golang', label: 'GoLang' },
  { value: 'c++', label: 'C++' },
  { value: 'c#', label: 'C#' },
  { value: 'clojure', label: 'Clojure' },
  { value: 'scala', label: 'Scala' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'solidity', label: 'Solidity' },
  { value: 'rust', label: 'Rust' },
  { value: '.net', label: '.NET' },
] as const;

/** Default tags catalog (the 14 tags of the original app). Admins can extend it. */
export const DEFAULT_TAGS = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'computerscience', label: 'Computer Science' },
  { value: 'product', label: 'Product' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'algorithms', label: 'Algorithms' },
  { value: 'joblife', label: 'Job Life' },
  { value: 'tech', label: 'Tech' },
  { value: 'security', label: 'Security' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'it', label: 'IT' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'programming', label: 'Programming' },
  { value: 'devops', label: 'DevOps' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
] as const;

/** Allowed shape of a catalog value: lower-case, short, URL-safe-ish (`c++`, `c#`, `.net` included). */
export const CATALOG_VALUE_PATTERN = /^[a-z0-9.][a-z0-9+#._-]{0,39}$/;
export const CATALOG_KINDS = ['skills', 'tags'] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const ROLES = ['owner', 'admin', 'user'] as const;
export type Role = (typeof ROLES)[number];
/** Roles the owner can assign through the API (never `owner`). */
export const ASSIGNABLE_ROLES = ['admin', 'user'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
/** Roles an invitation can carry. */
export const INVITABLE_ROLES = ['user', 'admin'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const REGISTRATION_MODES = ['open', 'invite_only'] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];

export const AUDIT_ACTIONS = [
  'role.change',
  'user.disable',
  'user.enable',
  'user.delete',
  'invitation.create',
  'invitation.revoke',
  'invitation.accept',
  'settings.update',
  'catalog.create',
  'catalog.update',
  'catalog.delete',
  'sudo.enter',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const NOTIFICATION_TYPES = ['comment', 'like', 'new_post', 'system'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Notification types a user may configure (system notifications are always on in-app). */
export const CONFIGURABLE_NOTIFICATION_TYPES = ['comment', 'like', 'new_post'] as const;
export type ConfigurableNotificationType = (typeof CONFIGURABLE_NOTIFICATION_TYPES)[number];

export const AUTH_PROVIDERS = ['github'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const LIMITS = {
  email: 254,
  password: { min: 8, max: 128 },
  username: { min: 1, max: 50 },
  website: 200,
  company: 100,
  bio: 500,
  skillsMax: 20,
  postTitle: 200,
  postContent: 10_000,
  tagsMax: 5,
  comment: 2_000,
  cvText: 1_000,
  cvShort: 100,
  catalogLabel: 40,
  pageSizeDefault: 10,
  pageSizeMax: 50,
  searchQuery: 100,
  invitationHours: 72,
  sudoMinutes: 10,
} as const;

/**
 * Public display name of a user. Never the e-mail address (privacy rule PRIV-01):
 * the username when set, otherwise a neutral placeholder.
 */
export function displayNameOf(user: { id: number; username: string | null | undefined }): string {
  const name = user.username?.trim();
  return name && name.length > 0 ? name : `Developer #${user.id}`;
}

export function labelOf(list: readonly { value: string; label: string }[], value: string): string {
  return list.find((item) => item.value === value)?.label ?? value;
}

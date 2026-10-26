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

export const PROGRAMMING_LANGUAGES = [
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
export const SKILL_VALUES = PROGRAMMING_LANGUAGES.map((l) => l.value) as [
  (typeof PROGRAMMING_LANGUAGES)[number]['value'],
  ...(typeof PROGRAMMING_LANGUAGES)[number]['value'][],
];
export type Skill = (typeof SKILL_VALUES)[number];

export const POST_TAGS = [
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
export const TAG_VALUES = POST_TAGS.map((t) => t.value) as [
  (typeof POST_TAGS)[number]['value'],
  ...(typeof POST_TAGS)[number]['value'][],
];
export type Tag = (typeof TAG_VALUES)[number];

export const ROLES = ['admin', 'user'] as const;
export type Role = (typeof ROLES)[number];

export const NOTIFICATION_TYPES = ['comment', 'like', 'new_post', 'system'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Notification types a user may configure (system notifications are always on in-app). */
export const CONFIGURABLE_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'comment',
  'like',
  'new_post',
];

export const AUTH_PROVIDERS = ['github'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const LIMITS = {
  email: 254,
  password: { min: 8, max: 128 },
  username: { min: 1, max: 50 },
  website: 200,
  company: 100,
  bio: 500,
  skillsMax: PROGRAMMING_LANGUAGES.length,
  postTitle: 200,
  postContent: 10_000,
  tagsMax: 5,
  comment: 2_000,
  cvText: 1_000,
  cvShort: 100,
  pageSizeDefault: 10,
  pageSizeMax: 50,
  searchQuery: 100,
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

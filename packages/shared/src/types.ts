/**
 * DTOs returned by the API. The API types its handlers against these; the web app consumes them.
 * Dates are ISO-8601 strings. No DTO outside `Me` and the admin DTOs carries an e-mail (PRIV-01).
 */
import type {
  AuditAction,
  AuthProvider,
  CatalogKind,
  InvitableRole,
  NotificationType,
  PostType,
  RegistrationMode,
  Role,
} from './constants.ts';

export interface AuthorCard {
  id: number;
  displayName: string;
  avatarUrl: string | null;
}

export interface PublicProfile extends AuthorCard {
  username: string | null;
  website: string | null;
  company: string | null;
  bio: string | null;
  isPublic: boolean;
  skills: string[];
  createdAt: string;
}

export interface ProfileDetail extends PublicProfile {
  experiences: ExperienceDto[];
  educations: EducationDto[];
  postCount: number;
}

export interface Me {
  id: number;
  email: string;
  role: Role;
  emailVerified: boolean;
  hasPassword: boolean;
  providers: AuthProvider[];
  createdAt: string;
  /** End of the current sudo window for this session, when active (ADR-013). */
  sudoUntil: string | null;
  profile: PublicProfile;
}

export interface PostSummary {
  id: number;
  title: string;
  content: string;
  type: PostType;
  published: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: AuthorCard;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export type PostDetail = PostSummary;

export interface CommentDto {
  id: number;
  postId: number;
  body: string;
  createdAt: string;
  author: AuthorCard;
  /** True when the current viewer may delete this comment (author, post author, moderators). */
  canDelete: boolean;
}

export interface ExperienceDto {
  id: number;
  title: string;
  description: string;
  company: string;
  location: string;
  startedOn: string;
  endedOn: string | null;
  isCurrent: boolean;
}

export interface EducationDto {
  id: number;
  school: string;
  description: string;
  degree: string;
  fieldOfStudy: string;
  startedOn: string;
  endedOn: string | null;
  isCurrent: boolean;
}

export interface NotificationDto {
  id: number;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  actor: AuthorCard | null;
  postId: number | null;
  commentId: number | null;
  /** Small, type-specific payload (e.g. post title excerpt, new role). */
  data: Record<string, string | number | boolean | null>;
}

export interface NotificationPreferenceDto {
  type: NotificationType;
  inApp: boolean;
  email: boolean;
}

export interface UnreadCount {
  unread: number;
}

export interface AdminUser {
  id: number;
  email: string;
  role: Role;
  disabled: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  displayName: string;
  avatarUrl: string | null;
  postCount: number;
}

export interface AdminStats {
  users: { total: number; active: number; disabled: number; admins: number; verified: number };
  posts: { total: number; published: number };
  comments: number;
  likes: number;
  pendingInvitations: number;
  recentUsers: AdminUser[];
}

export interface InvitationDto {
  id: number;
  email: string;
  role: InvitableRole;
  invitedBy: AuthorCard | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

/** What the accept page shows before the visitor commits. */
export interface InvitationPreview {
  email: string;
  role: InvitableRole;
  /** The invitee already has an account: accepting signs them in instead of registering. */
  existingAccount: boolean;
  expiresAt: string;
}

export interface AuditEntryDto {
  id: number;
  action: AuditAction;
  actor: AuthorCard | null;
  targetUserId: number | null;
  targetEmail: string | null;
  data: Record<string, string | number | boolean | null>;
  ip: string | null;
  createdAt: string;
}

export interface CatalogItem {
  value: string;
  label: string;
}

export type Catalog = Record<CatalogKind, CatalogItem[]>;

export interface SettingsDto {
  registrationMode: RegistrationMode;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: number | null;
}

/** RFC 9457 problem details, as produced by the API error handler. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
  errors?: { path: string; message: string }[];
}

export interface AppConfig {
  appName: string;
  github: boolean;
  requireEmailVerification: boolean;
  registrationMode: RegistrationMode;
  maxUploadMb: number;
}

export interface AuthResult {
  /** Present after login/register when the account can be used right away. */
  me: Me | null;
  /** Set when registration succeeded but the e-mail must be verified first. */
  needsVerification: boolean;
}

/** Server-sent event names and payloads (ids only; clients refetch). */
export type SseEvent =
  | { type: 'post.published'; postId: number }
  | { type: 'post.deleted'; postId: number }
  | { type: 'comment.created'; postId: number; commentId: number }
  | { type: 'notification.created'; notificationId: number; unread: number }
  | { type: 'notification.read'; unread: number }
  | { type: 'ping' };

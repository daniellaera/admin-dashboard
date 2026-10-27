import {
  type AuthorCard,
  displayNameOf,
  type InvitationCreateInput,
  type InvitationDto,
  type InvitationPreview,
  LIMITS,
} from '@devconnector/shared';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db } from '../../db/client.ts';
import { invitations, profiles, users } from '../../db/schema.ts';
import type { Env } from '../../env.ts';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.ts';
import { generateToken, hashToken } from '../../lib/tokens.ts';
import { enqueueMail } from '../../mail/outbox.ts';
import { invitationMail } from '../../mail/templates.ts';
import type { AuditService } from '../audit/service.ts';
import type { CurrentUser } from '../auth/session.ts';
import { toAuthorCard } from '../users/mappers.ts';

type InvitationRow = typeof invitations.$inferSelect;

export interface InvitationsDeps {
  db: Db;
  env: Env;
  audit: AuditService;
}

/** E-mail invitations (ADR-013): single use, 72 hours, role `user` or `admin`. */
export function createInvitationsService({ db, env, audit }: InvitationsDeps) {
  const ttlMs = LIMITS.invitationHours * 60 * 60 * 1000;
  const inviter = alias(users, 'inviter');
  const inviterProfile = alias(profiles, 'inviter_profile');

  const pending = (row: Pick<InvitationRow, 'acceptedAt' | 'revokedAt' | 'expiresAt'>) =>
    row.acceptedAt === null && row.revokedAt === null && row.expiresAt.getTime() > Date.now();

  function toDto(row: InvitationRow, invitedBy: AuthorCard | null): InvitationDto {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      invitedBy,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
    };
  }

  async function findValid(token: string): Promise<InvitationRow> {
    const [row] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tokenHash, hashToken(token)),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
          gt(invitations.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) {
      throw new ValidationError(
        [{ path: 'token', message: 'This invitation is invalid, expired or already used' }],
        'Invalid invitation',
      );
    }
    return row;
  }

  return {
    /**
     * Who may invite whom: OWNER invites users and admins (admin invitations need sudo, checked
     * by the route); ADMIN invites users only. An existing account can only receive an admin
     * invitation (a user invitation for an existing account is a conflict).
     */
    async create(
      actor: CurrentUser,
      input: InvitationCreateInput,
      ip: string | null,
    ): Promise<InvitationDto> {
      if (input.role === 'admin' && actor.role !== 'owner') {
        throw new ForbiddenError('Only the owner can invite administrators');
      }
      const [existing] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (existing) {
        if (input.role === 'user')
          throw new ConflictError('This e-mail address already has an account');
        if (existing.role !== 'user')
          throw new ConflictError('This account is already an administrator');
      }
      // One pending invitation per address: revoke older ones.
      await db
        .update(invitations)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(invitations.email, input.email),
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
          ),
        );

      const token = generateToken();
      const [row] = await db
        .insert(invitations)
        .values({
          email: input.email,
          role: input.role,
          tokenHash: hashToken(token),
          invitedBy: actor.id,
          expiresAt: new Date(Date.now() + ttlMs),
        })
        .returning();
      if (!row) throw new Error('insert invitations returned nothing');

      const [actorProfile] = await db
        .select({ username: profiles.username, avatarPath: profiles.avatarPath })
        .from(profiles)
        .where(eq(profiles.userId, actor.id));
      const invitedBy = displayNameOf({ id: actor.id, username: actorProfile?.username ?? null });
      await enqueueMail(
        db,
        input.email,
        invitationMail(
          { appName: env.APP_NAME, appUrl: env.APP_URL },
          {
            link: `${env.APP_URL}/invite?token=${token}`,
            role: input.role,
            invitedBy,
            hours: LIMITS.invitationHours,
          },
        ),
      );
      await audit.record({
        action: 'invitation.create',
        actorId: actor.id,
        targetUserId: existing?.id ?? null,
        targetEmail: input.email,
        data: { role: input.role, invitationId: row.id },
        ip,
      });
      return toDto(row, toAuthorCard({ id: actor.id }, actorProfile ?? null));
    },

    async listPending(): Promise<InvitationDto[]> {
      const rows = await db
        .select({
          invitation: invitations,
          inviterUsername: inviterProfile.username,
          inviterAvatar: inviterProfile.avatarPath,
        })
        .from(invitations)
        .leftJoin(inviter, eq(inviter.id, invitations.invitedBy))
        .leftJoin(inviterProfile, eq(inviterProfile.userId, inviter.id))
        .where(
          and(
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
            gt(invitations.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(invitations.id));
      return rows.map((r) =>
        toDto(
          r.invitation,
          r.invitation.invitedBy === null
            ? null
            : toAuthorCard(
                { id: r.invitation.invitedBy },
                { username: r.inviterUsername, avatarPath: r.inviterAvatar },
              ),
        ),
      );
    },

    async revoke(id: number, actor: CurrentUser, ip: string | null): Promise<void> {
      const [row] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
      if (!row || !pending(row)) throw new NotFoundError('Invitation not found');
      if (row.role === 'admin' && actor.role !== 'owner') {
        throw new ForbiddenError('Only the owner can revoke administrator invitations');
      }
      await db.update(invitations).set({ revokedAt: new Date() }).where(eq(invitations.id, id));
      await audit.record({
        action: 'invitation.revoke',
        actorId: actor.id,
        targetEmail: row.email,
        data: { role: row.role, invitationId: row.id },
        ip,
      });
    },

    async preview(token: string): Promise<InvitationPreview> {
      const row = await findValid(token);
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, row.email))
        .limit(1);
      return {
        email: row.email,
        role: row.role,
        existingAccount: existing !== undefined,
        expiresAt: row.expiresAt.toISOString(),
      };
    },

    /** Validates and consumes the token; the caller creates/signs in the account and grants the role. */
    async consume(token: string, acceptedBy: number | null): Promise<InvitationRow> {
      const row = await findValid(token);
      await db
        .update(invitations)
        .set({ acceptedAt: new Date(), acceptedBy })
        .where(eq(invitations.id, row.id));
      return row;
    },

    findValid,

    async pendingCount(): Promise<number> {
      const rows = await db
        .select({ id: invitations.id })
        .from(invitations)
        .where(
          and(
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
            gt(invitations.expiresAt, new Date()),
          ),
        );
      return rows.length;
    },
  };
}

export type InvitationsService = ReturnType<typeof createInvitationsService>;

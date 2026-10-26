# ADR-013 — Roles, invitations and ownership (OWNER / ADMIN / USER)

Status: accepted (2026-10-26, `[USER]` amendment, D-017) · Supersedes the RBAC paragraph of ADR-004.

## Context

The brief asked for `admin`/`user`. During Phase 3 the user specified a three-tier model with an
immutable owner, invitations, a registration mode, sudo confirmation for role changes and an
audit log. The rules are reproduced in DECISIONS D-017; this ADR records how they are enforced.

## Model

| Role | Can | Cannot |
|---|---|---|
| **OWNER** (exactly one) | everything; grant/revoke ADMIN (promote a verified USER, or admin invitation); change the registration mode; invite users; moderate; manage the catalog; read the audit log | be demoted, disabled or deleted — by anyone, including itself (`DELETE /auth/account` → 403); be created/transferred from the UI |
| **ADMIN** | moderate posts/comments; manage the skills/tags catalog; disable/enable/delete **USER** accounts; invite **users**; change the registration mode; read the audit log | change any role; act on another ADMIN or on the OWNER; send admin invitations |
| **USER** | the dev area (own profile, CV, posts, comments, likes, notifications) | anything under `/admin` |

## Enforcement

- `users.role` is a Postgres enum `owner | admin | user`. A partial unique index guarantees **at most one owner** (`CREATE UNIQUE INDEX users_single_owner ON users ((role)) WHERE role = 'owner'`).
- Every admin operation goes through `assertCanActOn(actor, target)` in `modules/admin/service.ts`: targets with role `owner` are untouchable; an `admin` actor may only target `user` accounts; role changes are accepted only from the `owner` and only to `admin`/`user` (never `owner`); promotion requires `email_verified_at`.
- **Sudo mode**: `POST /auth/sudo {password}` re-verifies the password and stamps `sessions.sudo_until = now() + 10 min` on the current session. `requireSudo` guards role changes, admin invitations and registration-mode changes. `GET /auth/me` exposes `sudoUntil` so the UI can prompt.
- **Session revocation**: disabling an account or changing a role deletes every session of the target (`sessions` rows), and the session middleware already drops sessions of disabled users.
- **Notifications**: a role change inserts an in-app notification (`type = system`, `data.event = role_changed`) and enqueues an e-mail (always sent — security notice, not subject to preferences).
- **Audit log**: `audit_log(action, actor_id, target_user_id, target_email, data, ip, created_at)` written for `role.change`, `user.disable`, `user.enable`, `user.delete`, `invitation.create`, `invitation.revoke`, `invitation.accept`, `settings.update`, `catalog.*`, `sudo.enter`. Read-only `GET /admin/audit` for OWNER and ADMINs.
- **Registration mode**: `settings` key/value table (`registration_mode`: `open` | `invite_only`), exposed in `GET /config`. In `invite_only` mode `POST /auth/register` requires `inviteToken` (the invitation e-mail must match) and the account is created verified; in `open` mode the normal verification flow applies.
- **Invitations**: `invitations(email, role, token_hash, invited_by, expires_at, accepted_at, revoked_at)`; `POST /admin/invitations` (role `user`: OWNER/ADMIN; role `admin`: OWNER + sudo), `GET /admin/invitations` (pending), `DELETE /admin/invitations/:id` (revoke). Accepting via `POST /auth/invitations/accept {token, password?}`: an existing account with that e-mail is signed in (and granted ADMIN for admin invitations); otherwise the account is created (password required) already verified. Tokens are single use, 72 h, hashed at rest, previewable via `GET /auth/invitations/:token`.
- **Bootstrap**: `OWNER_EMAIL` + `OWNER_PASSWORD` create the owner on first boot when none exists (then the variables can be removed); `pnpm owner:create <email> <password>` does the same from the CLI and refuses when an owner exists. No API path can create an owner.
- **Catalog**: `catalog_skills` and `catalog_tags` (value, label), seeded with the original 15 languages and 14 tags; profile skills and post tags are validated against the catalog at write time; deleting an entry removes it from every profile/post array.

## Tests

`test/integration/authz-matrix.test.ts` enumerates each admin operation × actor (anonymous, user, admin, second admin, owner, owner-without-sudo) with the expected status, including the negative cases named by the user; `admin.test.ts` and `invitations.test.ts` cover the flows, revocation, notifications and audit entries.

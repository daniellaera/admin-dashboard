# ADR-012 — Data migration from a Supabase dump (optional import script)

Status: proposed (2026-10-26) · Brief: "an optional import script from a Supabase dump (pg_dump). The bcrypt hashes from auth.users must keep working, with a rehash to argon2id on next login."

## Context

Production data lives in a Supabase project: `auth.users` (bcrypt `encrypted_password`, `email_confirmed_at`, `raw_app_meta_data.provider(s)`), `auth.identities` (GitHub ids), the Prisma tables in `public` (FEATURES §2) and avatar objects in bucket `images`. This mission never touches that project; the user produces the dump (`pg_dump`) and runs the script.

## Decision

`apps/api/scripts/import-supabase.ts` (run with `pnpm import:supabase -- <flags>`):

1. **Input**: `--source <postgres-url>` pointing at a **scratch** Postgres into which the user restored the dump (`pg_restore`/`psql` into a `postgres:18` container; exact commands in MIGRATION.md; the Supabase roles/extensions in the dump are skipped with `--no-owner --no-privileges`). The script never connects to `*.supabase.co` for SQL — only, optionally, to the public storage URL for avatars (`--avatars --supabase-url https://<ref>.supabase.co`).
2. **Target**: `DATABASE_URL` (fresh schema, migrations applied). `--dry-run` prints counts and conflicts without writing. Idempotent re-runs: rows are upserted by legacy id/e-mail.
3. **Mapping** (one transaction, FK checks deferred, sequences reset at the end):
   - `public."Profile"` → `users` + `profiles`: `users.id = Profile.id` (preserves post/comment URLs and ownership), `email = authorEmail` (lower-cased, `citext`), `legacy_auth_id = auth.users.id` matched by e-mail, `email_verified_at = auth.users.email_confirmed_at`, `password_hash = auth.users.encrypted_password` when it is a bcrypt hash (`$2a$`/`$2b$`), else `null` (GitHub-only users), `role = 'user'` (promote admins afterwards), `created_at` from the profile; `profiles`: `username, website, company, bio, is_public` (see Q4 at the STOP: default **true** for migrated rows so the directory keeps showing today's profiles), `skills = array of ProgrammingLanguage.value` validated against the shared list (unknown values kept as-is and reported).
   - Profiles without an `auth.users` row (e.g. created by the magic-link bug) → imported as users with `password_hash = null`, `email_verified_at = null`, reported in the summary (they can use "forgot password" to claim the account).
   - `auth.users` without a profile → imported as users with an empty profile, reported.
   - `auth.identities` with `provider = 'github'` → `oauth_accounts('github', identity_data.sub or provider_id, user_id)`.
   - `"Post"` → `posts` (id, author_id = profileId, type, title, content, published, view_count, tags = `Tags.value[]`, timestamps); `"Comment"` → `comments`; `"Like"` → `likes` (duplicates collapsed by the new PK, count reported); `"Experiences"` → `experiences` (`started_on/ended_on`, `is_current`; `ended_on` set to `null` when `current` is true); `"Education"` → `educations`.
   - Avatars: with `--avatars`, for each `avatarUrl` download `${SUPABASE_URL}/storage/v1/object/public/images/${path}`, run through the ADR-005 pipeline (sniff, resize, WebP), store under the user's folder, set `avatar_path`; failures are reported and leave the fallback initials.
4. **Passwords**: nothing is converted at import. On login, `$2a$/$2b$` hashes are verified with `bcryptjs`; on success the password is rehashed with argon2id and `password_hash` replaced (ADR-004). Users who never log in keep bcrypt forever — acceptable; a report query lists them.
5. **Report**: counts per table, skipped rows with reasons, duplicates collapsed, unmatched e-mails, avatar failures — printed and written to `import-report.json`.
6. **Verification**: MIGRATION.md includes SQL to compare counts between source and target and a smoke login with a migrated user in a disposable environment before cut-over.

## Alternatives considered

- **Importing directly from the live Supabase database**: simpler, but the brief forbids touching the project from this mission and a dump gives a reproducible, retryable input.
- **Converting bcrypt → argon2id offline**: impossible without the plaintext; rehash-on-login is the standard approach the brief asks for.
- **Keeping Supabase UUIDs as primary keys**: would change every URL and complicate relations; legacy UUIDs are kept in `legacy_auth_id` for traceability only.

## Consequences

- Cut-over plan (MIGRATION.md): freeze writes on Fly → dump → restore to scratch → import → verify → point DNS/NPM at the new app → revoke Supabase/Fly (REPORT.md revocation list).
- The script is covered by an integration test that seeds a mini "Supabase-shaped" scratch schema in Testcontainers and asserts the mapping (incl. bcrypt login + rehash).

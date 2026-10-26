# MIGRATION — moving the data out of Supabase

Scope: the production data of the previous version (Supabase project `aetkrjbqdijselycidyg`: `auth.users`, the Prisma tables in `public`, avatars in the `images` bucket) into a fresh DevConnector 2.0 database. The procedure is **offline and repeatable**: you take a dump, restore it into a scratch PostgreSQL, run the import script against your new database, verify, then cut over. Nothing in this repository ever connects to the live Supabase project (ADR-012).

Passwords keep working: bcrypt hashes from `auth.users.encrypted_password` are copied verbatim and silently rehashed to argon2id the first time each user signs in.

## 0. What you need

- Access to the Supabase dashboard (database password — the one in `backend/README.md` is public and must be rotated anyway, see REPORT.md) and, for avatars, the project URL `https://aetkrjbqdijselycidyg.supabase.co`.
- Docker (for the scratch PostgreSQL) and this repository checked out with `pnpm install` done.
- The target database: either the compose stack (`docker compose up -d db`) or your production PostgreSQL. Migrations are applied automatically by the script.

## 1. Freeze and dump

Put the old app in read-only mode (or just announce the maintenance window), then dump from your machine:

```sh
# Connection string from Supabase → Project Settings → Database (use the direct 5432 connection, not the pooler)
export SUPABASE_DB="postgresql://postgres:<password>@db.aetkrjbqdijselycidyg.supabase.co:5432/postgres"

docker run --rm -e PGPASSWORD postgres:18-alpine \
  pg_dump "$SUPABASE_DB" --no-owner --no-privileges \
    --schema=public --schema=auth \
    --exclude-table='auth.audit_log_entries' --exclude-table='auth.refresh_tokens' --exclude-table='auth.sessions' \
    --exclude-table='auth.mfa_*' --exclude-table='auth.flow_state' --exclude-table='auth.one_time_tokens' \
    --exclude-table='auth.saml_*' --exclude-table='auth.sso_*' \
    -Fc -f /dev/stdout > supabase-$(date +%F).dump
```

Keep the dump somewhere safe; it contains password hashes and e-mail addresses.

## 2. Restore into a scratch PostgreSQL

```sh
docker run -d --name legacy-pg -e POSTGRES_PASSWORD=legacy -p 127.0.0.1:5433:5432 postgres:18-alpine
sleep 5
docker exec -i legacy-pg psql -U postgres -c 'create database legacy;'
docker exec -i legacy-pg pg_restore -U postgres -d legacy --no-owner --no-privileges --if-exists --clean \
  < supabase-$(date +%F).dump
```

`pg_restore` prints errors for Supabase-specific roles, extensions and triggers it cannot recreate (`supabase_auth_admin`, `auth.uid()` defaults, …). They are harmless for the import as long as the tables and rows are there — check:

```sh
docker exec -i legacy-pg psql -U postgres -d legacy -c \
  'select (select count(*) from "Profile") profiles, (select count(*) from auth.users) auth_users,
          (select count(*) from "Post") posts, (select count(*) from "Comment") comments, (select count(*) from "Like") likes;'
```

## 3. Dry run

```sh
# DATABASE_URL in .env points at the target (fresh database, no owner yet).
pnpm import:supabase -- --source postgresql://postgres:legacy@127.0.0.1:5433/legacy --dry-run
cat import-report.json
```

The report tells you, before anything is written:

| Field | Meaning | What to do |
|---|---|---|
| `counts` | rows that would be created per table | compare with the counts from step 2 |
| `profilesWithoutAuth` | profiles whose e-mail has no `auth.users` row (the magic-link bug of the old app) | imported unverified and without password; they claim the account via "Forgot password" |
| `authWithoutProfile` | Supabase accounts that never created a profile | imported with an empty profile |
| `mergedIntoExisting` | legacy e-mails that already exist in the target | their content attaches to the existing account (normally empty on a fresh database) |
| `unknownSkills` / `unknownTags` | values that are not in the seeded catalog | kept on the rows; add them in **Catalog** after the import or let users re-pick |
| `duplicateLikes` | collapsed by the new primary key | informational |
| `visibilityForcedPublic` | profiles that were `isPublic = false` and become public | default of the rebuild (D-013 Q4); pass `--keep-visibility` to keep the legacy flag |
| `skipped` | rows referencing a missing profile or post | orphans of the old schema; nothing to do |

## 4. Import

```sh
pnpm import:supabase -- --source postgresql://postgres:legacy@127.0.0.1:5433/legacy \
  --avatars --supabase-url https://aetkrjbqdijselycidyg.supabase.co
```

- Everything but the avatars happens in **one transaction**: either the whole import lands or nothing does.
- Avatars are downloaded from the public bucket after the commit, re-encoded to WebP (256 px) and stored under `UPLOADS_DIR`; failures are listed in `avatarFailures` and leave the initials fallback.
- Re-running the script is safe (upserts by id / e-mail; a hash already rehashed to argon2id is never downgraded).
- Running inside the production image: `docker compose -f compose.prod.yml exec app node dist/scripts/import-supabase.js --source … ` (the scratch database must be reachable from the container, e.g. `host.docker.internal:5433`).

## 5. Make yourself the owner

The import creates every account as `user`. Promote your own (imported) account — this is the only way to get an owner, and it works exactly once:

```sh
pnpm owner:create you@example.com 'a-new-strong-password'
```

The command promotes the existing e-mail, sets the password you give it and marks the e-mail verified. Then grant `admin` to colleagues from **Users** (role select, password confirmation).

## 6. Verify before cut-over

```sql
-- target database
select (select count(*) from users) users, (select count(*) from profiles) profiles,
       (select count(*) from posts) posts, (select count(*) from comments) comments,
       (select count(*) from likes) likes, (select count(*) from experiences) experiences,
       (select count(*) from educations) educations;
-- who still has a bcrypt hash (never logged in since the import)
select count(*) from users where password_hash like '$2%';
-- nobody but the owner should be staff
select email, role from users where role <> 'user';
```

Smoke test with a real migrated account on a disposable stack (`docker compose up`): sign in with the old password, check that the hash became `$argon2id$`, open `/developers` and a migrated profile, open an old post URL (`/posts/<id>` — ids are preserved).

## 7. Cut over

1. Deploy the new stack (DEPLOY.md) with the imported database.
2. Point the DNS / Nginx Proxy Manager host at the new app.
3. Keep the Fly apps stopped (not deleted) for a week, then delete them.
4. Revoke what the old deployment used — the list is in REPORT.md: Supabase database password (leaked in `backend/README.md`), Supabase project (pause, then delete after the retention period), Novu API key and account, Fly API token and the GitHub Actions secrets of the old deploy workflow.
5. Remove the scratch container: `docker rm -f legacy-pg` and delete the dump when the retention period is over.

## Mapping reference

| Legacy (Prisma / Supabase) | New | Notes |
|---|---|---|
| `Profile.id` | `users.id`, `profiles.user_id` | preserved; `authorEmail` lower-cased → `users.email` |
| `auth.users` (by e-mail) | `users.legacy_auth_id`, `email_verified_at`, `password_hash` | only `$2a$/$2b$/$2x$/$2y$` hashes are copied |
| `auth.identities` (`github`) | `oauth_accounts` | `provider_id` or `identity_data.sub` |
| `ProgrammingLanguage.value[]` | `profiles.skills` | de-duplicated, validated against `catalog_skills` |
| `Profile.isPublic` | `profiles.is_public` | `true` unless `--keep-visibility` |
| `Post` | `posts` | id, type, title, content, published (+ `published_at = createdAt`), view_count |
| `Tags.value[]` | `posts.tags` | validated against `catalog_tags` |
| `Comment.text` | `comments.body` | id preserved |
| `Like` | `likes (post_id, user_id)` | duplicates collapsed |
| `Experiences.from/to/current` | `started_on`, `ended_on` (null when current), `is_current` | id preserved |
| `Education` | `educations` | same |
| `Profile.avatarUrl` | `profiles.avatar_path` | downloaded and re-encoded with `--avatars` |

# ADR-003 — Data access and migrations: Drizzle ORM (over Kysely), Postgres 18

Status: proposed (2026-10-26) · Brief: "Prisma is removed, replaced by Drizzle or Kysely (compare them in an ADR), with versioned SQL migrations and a seed."

## Context

Prisma 4 is EOL, its singleton is misused (AUDIT CQ-03), `connectOrCreate` with array indexes corrupts data (CQ-01), FKs are unindexed (PERF-02), the like constraint lives in code (CQ-02), and migrations were run by hand from a laptop (INF-04). The new layer must give versioned SQL migrations committed to the repo, a seed, type-safe queries, and work with `LISTEN/NOTIFY` (ADR-006) and Testcontainers (ADR-009).

## Comparison

| Criterion | **Drizzle ORM 0.45 + drizzle-kit 0.31** | Kysely 0.29 |
|---|---|---|
| Schema source of truth | TypeScript schema (`pgTable`, enums, indexes, FKs) → `drizzle-kit generate` emits **versioned SQL migration files** (`drizzle/0001_*.sql` + journal) | Database is the source of truth; types via `kysely-codegen` from a live DB, or hand-written interfaces |
| Migrations | SQL files generated from schema diffs, hand-editable, applied by `migrate()` at startup or via CLI; brief requirement met directly | Migration files are TypeScript (`up`/`down` with the query builder) by default; raw SQL possible but not generated |
| Query style | SQL-like builder (`db.select().from().where()`) + relational query API; raw `sql` tag | SQL-like builder, excellent type inference, raw `sql` tag |
| Type safety | inferred `$inferSelect`/`$inferInsert` from schema; `drizzle-zod` can derive Zod schemas (we keep hand-written Zod in `packages/shared` as the contract, see ADR-008) | strong, but types must be kept in sync with the DB via codegen step |
| Drivers | `node-postgres` (`pg`), `postgres.js`, PGlite… | same |
| Transactions, `RETURNING`, arrays, enums, `citext`, GIN indexes | supported | supported |
| Tooling | `drizzle-kit studio` (local DB browser), `check`, `migrate`, `push` (dev only) | `kysely-ctl` for migrations |
| Maturity / activity | very active; 1.0 in beta; large adoption | very active; stable; smaller surface |
| Learning curve for a Prisma user | closest (declarative schema) | steeper (SQL-first) |

## Decision

**Drizzle ORM with the `pg` (node-postgres) driver on PostgreSQL 18.** It is the only one of the two that produces the *versioned SQL migrations* the brief asks for from a declarative schema, and its schema file doubles as living documentation of the model. Kysely is excellent but would require either a codegen step against a running database or hand-maintained types, and its migrations are TS files rather than SQL.

Driver: `pg` rather than `postgres.js` because it is the de-facto standard for Testcontainers/CI tooling and because a dedicated `pg.Client` with `LISTEN` + reconnect is a well-known 40-line pattern (ADR-006). `postgres.js` has a built-in `listen` and is faster, but Drizzle supports both and the switch is a one-file change.

PostgreSQL **18.x** (`postgres:18-alpine`): latest stable (18.6, released 2025-09-25, EOL 2030-11); no 19 exists yet. Extensions used: `citext` (case-insensitive unique e-mails).

## Schema principles (target model in TARGET.md §4)

- `users` is the identity and the author key: `users.id` = legacy `Profile.id` for imported rows (ADR-012), so posts/comments/likes reference `users.id` directly and ownership checks need no join.
- `profiles` is 1:1 with `users` (shared PK) and holds the public card (`username`, `website`, `company`, `bio`, `avatar_path`, `is_public`, `skills text[]`).
- Tags and skills are `text[]` columns with GIN indexes, validated against the shared option lists — eliminates the two junction tables that caused CQ-01.
- `likes` has `PRIMARY KEY (post_id, user_id)`; `comments`, `posts`, `experiences`, `educations` index every FK and `(created_at desc)` where listed.
- `ended_on` is nullable when `is_current` (removes impossible states, CQ-08).
- Timestamps are `timestamptz`; ids stay `serial`/`integer` to preserve existing URLs and imported ids.

## Operations

- `pnpm db:generate` (drizzle-kit, after editing `schema.ts`) → review the SQL → commit.
- `pnpm db:migrate` applies pending migrations; the API also runs the migrator on boot when `MIGRATE_ON_START=true` (default in compose) so `docker compose up` on a clean clone yields a ready schema. Concurrent starts are safe: Drizzle's migrator takes an advisory lock.
- `pnpm db:seed` (idempotent, dev only, refuses when `NODE_ENV=production` unless `SEED_FORCE=1`): the four legacy personas with posts, an admin user, and sample notifications.
- `pnpm db:reset` = drop + migrate + seed (dev only).
- Tests get a fresh Testcontainers Postgres per suite (ADR-009) with migrations applied by the same migrator — the migration path is therefore exercised on every CI run.

## Consequences

- No ORM-level "connectOrCreate" magic: multi-row updates are explicit transactions in services.
- `drizzle-kit push` is forbidden outside local experiments (documented); the repo's SQL files are the only path to production schemas.
- Relational query API is used for read models (feed with author + counts); hot paths use explicit joins and `count(*) over()` for pagination totals.

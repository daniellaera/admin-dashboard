# TARGET — architecture of the rebuilt DevConnector (2026)

Status: proposed at the end of Phase 2 (2026-10-26), awaiting the STOP decisions. Each choice is justified in an ADR under `adr/`; this document is the map. Parity contract: `FEATURES.md`. Problems being solved: `AUDIT.md`.

## 1. Goals and non-goals

**Goals.** Functional and visual parity with the current app (FEATURES §1–9) with every audit finding closed; zero SaaS (Supabase, Novu, Fly removed); fully self-hosted with `docker compose up`; secure by construction (server-side identity, validation at the edge, no tokens in the browser); tested (unit, integration on real Postgres, E2E on the compose stack); multi-arch images; CI that runs on GitHub and Gitea; one-command local setup; data import from the Supabase dump.

**Non-goals.** Horizontal scaling, SSR/SEO, mobile apps, federation/"follow" features, analytics. The design keeps these cheap to add (interfaces for storage and rate-limit stores, Postgres-backed event bus) but does not build them.

## 2. Stack

| Layer | Target | Replaces | ADR |
|---|---|---|---|
| Runtime | Node.js 26 (Active LTS 2026-10-28), ESM, native TS type-stripping in dev | Node 16/17 images, ts-node | 001 |
| Language | TypeScript 6.0 strict (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`) | TS 4.9, `any` at every boundary | 001 |
| Repo | pnpm 12 workspaces: `apps/api`, `apps/web`, `packages/shared`, `packages/config` | two unrelated npm projects | 001 |
| Lint/format | ESLint 10 flat + typescript-eslint (type-checked) + react-hooks + jsx-a11y; Prettier 3; knip | airbnb legacy config, CRA eslint | 001 |
| API | Hono 4 on `@hono/node-server`; `@hono/zod-validator`; `hono/client` RPC types | Express 4.18 | 002 |
| DB | PostgreSQL 18 (compose), Drizzle ORM + `pg`, versioned SQL migrations (`drizzle-kit generate`), migrator on boot, seed | Supabase Postgres + Prisma 4 | 003 |
| Auth | own: argon2id (`@node-rs/argon2`), DB sessions in `httpOnly; Secure; SameSite=Lax` cookie, `hono/csrf` + Origin checks, rate limits, e-mail verification, password reset, magic link, GitHub OAuth (`arctic`), RBAC admin/user, bcrypt→argon2id rehash | Supabase Auth, JWT in localStorage | 004 |
| Files | local volume `/data/uploads`, `sharp` re-encode to WebP 256/64 px, served by the API with immutable caching | Supabase Storage public bucket | 005 |
| Notifications / realtime | `notifications` + `notification_preferences` tables, SSE (`/api/v1/events`) fed by Postgres `LISTEN/NOTIFY`, `email_outbox` worker with nodemailer SMTP templates | Novu + Socket.IO | 006 |
| Web | Vite 8, React 19, TanStack Router (file-based, typed search params), TanStack Query 5, react-hook-form + Zod resolver, **Mantine 9** + Tabler icons, dayjs | CRA 5, Chakra 2, react-query 3, react-router 6, axios, moment+date-fns, framer-motion | 007 |
| Contract | Zod 4 schemas + constants in `packages/shared`, consumed by API validators, forms and the RPC client | hand-copied types | 008 |
| Tests | Vitest 5 (unit, component with Testing Library/MSW), Testcontainers Postgres + `app.request`/Supertest (integration), Playwright (E2E on compose) | 4 hello-route tests | 009 |
| Observability | pino JSON logs with request ids, `/health`, `/ready`, RFC 9457 errors, graceful shutdown | morgan dev + console.log | 002 |
| Delivery | one multi-arch image (API serves SPA) + Postgres, `compose.yml` (dev/demo with Mailpit) and `compose.prod.yml`, env-only config, behind Nginx Proxy Manager | two Fly apps, nginx 1.19 | 010 |
| CI | `.github/workflows/ci.yml` runnable by Gitea Actions: check → integration → e2e → security → multi-arch image to GHCR / Gitea registry | deploy-on-every-push to Fly | 011 |
| Migration | `import-supabase` script from a restored `pg_dump`, id-preserving, bcrypt kept, optional avatar download | — | 012 |

## 3. System view

```
                 ┌──────────────────────────── one origin (APP_URL) ───────────────────────────┐
 Browser ──TLS──▶│ Nginx Proxy Manager ──▶ app container (Hono, :8080)                          │
                 │        /            → SPA (Vite build, index.html fallback, immutable assets)│
                 │        /api/v1/*    → REST (Zod-validated, session cookie, problem+json)     │
                 │        /api/v1/events → SSE (posts feed, user:<id>, post:<id>)               │
                 │        /files/avatars/* → volume /data/uploads                                │
                 │   ┌─ pg.Pool (queries) ───────────────┐  ┌─ pg.Client LISTEN app_events ─┐    │
                 │   └──────────────▶ postgres:18 ◀───────┘  └────────── pg_notify ◀───────┘    │
                 │                     ▲ migrations on boot        email_outbox worker ──▶ SMTP │
                 └──────────────────────────────────────────────────────────────────────────────┘
```

Request lifecycle: `requestId` → `pino` logger → `secureHeaders` → `csrf` (Origin/Sec-Fetch-Site for non-GET) → body limit → `session` (cookie → `sessions` row → `c.var.user`) → rate limit (auth routes) → route (`zValidator`) → service (ownership/role checks, transactions, events) → DTO → JSON. Errors: `AppError` subclasses (`ValidationError 400`, `UnauthorizedError 401`, `ForbiddenError 403`, `NotFoundError 404`, `ConflictError 409`, `RateLimitedError 429`) → `application/problem+json`; unexpected errors → 500 with a correlation id, never a stack.

## 4. Data model (target)

```
users              id serial PK · email citext UNIQUE · email_verified_at · password_hash (null for OAuth-only)
                   role user_role('admin','user') · disabled_at · legacy_auth_id uuid · created_at · updated_at
profiles           user_id PK/FK users · username · website · company · bio · avatar_path · is_public bool
                   skills text[] (GIN) · created_at · updated_at
sessions           id text PK (sha256 of token) · user_id FK · created_at · expires_at · last_seen_at · ip · user_agent
oauth_accounts     provider · provider_user_id · user_id FK · created_at · PK(provider, provider_user_id)
auth_tokens        id · user_id FK · kind('verify_email','reset_password','magic_link') · token_hash UNIQUE
                   expires_at · used_at · created_at
posts              id serial PK · author_id FK users · type post_type · title · content · published · published_at
                   view_count · tags text[] (GIN) · created_at · updated_at · idx(author_id), idx(published, created_at desc)
comments           id · post_id FK · author_id FK · body · created_at · idx(post_id, created_at desc)
likes              post_id FK · user_id FK · created_at · PK(post_id, user_id)
experiences        id · user_id FK · title · description · company · location · started_on date · ended_on date null
                   is_current · created_at · updated_at · idx(user_id)
educations         id · user_id FK · school · description · degree · field_of_study · started_on · ended_on null
                   is_current · created_at · updated_at · idx(user_id)
notifications      id bigserial · user_id FK · type · actor_id · post_id · comment_id · data jsonb · read_at · created_at
                   idx(user_id, created_at desc) · partial idx(user_id) where read_at is null
notification_preferences  user_id FK · type · in_app · email · PK(user_id, type)
email_outbox       id · to_email · subject · html · text · created_at · sent_at · attempts · last_error
```

Mapping from today: `Profile.id` → `users.id` (= `profiles.user_id`); `profileId` columns → `author_id`/`user_id`; `ProgrammingLanguage` rows → `profiles.skills`; `Tags` rows → `posts.tags`; `Experiences.from/to` → `started_on/ended_on`; `Like` gets a composite PK; enum values unchanged (`FUNNY, TECH, RANDOM, NEWS, SERIOUS`). All FKs `ON DELETE CASCADE` as today, except `notifications.actor_id` → `SET NULL`.

## 5. API surface (target, base `/api/v1`)

| Area | Endpoints | Auth |
|---|---|---|
| Health | `GET /health`, `GET /ready` | public |
| Config | `GET /config` → `{appName, github: boolean, requireEmailVerification}` | public |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/magic-link`, `POST /auth/magic-link/consume`, `PUT /auth/password`, `GET /auth/github`, `GET /auth/github/callback` | per ADR-004 |
| Me | `GET /me/profile`, `PATCH /me/profile`, `DELETE /me`, `POST /me/avatar` (multipart), `DELETE /me/avatar`, `GET /me/posts?page` (incl. drafts), `GET|POST /me/experiences`, `PATCH|DELETE /me/experiences/:id`, `GET|POST /me/educations`, `PATCH|DELETE /me/educations/:id` | session |
| Profiles | `GET /profiles?page&q` (public profiles; e-mail omitted), `GET /profiles/:id` (public card + experiences/educations) | public |
| Posts | `GET /posts?page&limit&type&tag` (published, with author card, like/comment counts, `likedByMe`), `GET /posts/:id` (published, or owner/admin), `POST /posts`, `PATCH /posts/:id`, `DELETE /posts/:id`, `GET /posts/:id/comments?cursor`, `POST /posts/:id/comments`, `DELETE /comments/:id`, `PUT /posts/:id/like`, `DELETE /posts/:id/like` | mutations: session + owner/admin |
| Notifications | `GET /notifications?cursor&limit`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `DELETE /notifications/:id`, `GET|PUT /notifications/preferences` | session |
| Events | `GET /events?post=<id>` (SSE) | optional session |
| Admin | `GET /admin/stats`, `GET /admin/users?q&page`, `GET /admin/users/:id`, `PATCH /admin/users/:id` (role, disabled), `DELETE /admin/users/:id` | admin |
| Files | `GET /files/avatars/:userId/:file` (outside `/api/v1`) | public, immutable cache |

Conventions: integer ids in paths (parity with existing URLs), `page`/`limit` (max 50) with `{items, page, total}` for tables, cursor pagination for infinite lists (comments, notifications); `PATCH` with `.strict()` partial schemas; `204` on deletes; `Idempotency` not needed (no payments); `ETag` on avatar files.

## 6. Frontend structure (target)

```
apps/web/src
  routes/            __root.tsx (providers, shells by route group), index.tsx, signin.tsx, privacy.tsx, terms.tsx,
                     posts/index.tsx (feed, ?page), posts/$postId.tsx, developers.tsx,
                     auth/verify.tsx, auth/reset.tsx, auth/magic.tsx, auth/forgot.tsx,
                     admin/route.tsx (beforeLoad guard) → admin/index (dashboard), admin/profile, admin/posts/{index,new,$postId},
                     admin/users/{index,$userId} (admin role), notifications.tsx (full inbox), $.tsx (404)
  features/<domain>/ api.ts (queryOptions + mutations over the RPC client), components/, forms/ (RHF + shared Zod)
  components/shell/  LandingShell (PromoBanner, Nav, Footer, CookieBanner), AdminShell (Mantine AppShell: sidebar/drawer, UserSearch spotlight, ThemeToggle, ProfileMenu), NotificationBell
  lib/               api client (hc + problem+json), auth context (me query), sse hook, theme (semantic tokens), dayjs setup
```

Route guard: `admin/route.tsx` `beforeLoad` reads the `me` query; unauthenticated → `redirect({to:'/signin', search:{redirect}})`; non-admin on `/admin/users*` → 403 page. The SPA never stores tokens; `GET /auth/me` is the only source of truth.

## 7. Security baseline (closing AUDIT §2)

| Audit item | Target mechanism |
|---|---|
| SEC-01 secrets | no secrets in repo (`.env.example`), gitleaks in CI with Postgres-URI rule, revocation list in REPORT.md |
| SEC-02/06, ARC-01 authz | session → `c.var.user`; services take `actor` as first argument; ownership/role checks in services, tested by an authorization matrix per mutation (ADR-009) |
| SEC-03/13 Supabase exposure | no Supabase, no PostgREST, nothing in the bundle but public config |
| SEC-04 uploads | authenticated, size-capped, sniffed, re-encoded (ADR-005) |
| SEC-05 sessions | opaque DB sessions, httpOnly/Secure/SameSite=Lax cookie, hashed at rest, rotation on password change |
| SEC-07 CORS | same origin; `hono/cors` only in dev for `http://localhost:5173` via Vite proxy (so even dev is same-origin) |
| SEC-08, CQ-11 validation / mass assignment | Zod at the edge, `.strict()` updates, typed params, body limits (JSON 256 kB, multipart `MAX_UPLOAD_MB`) |
| SEC-09 exposure | DTOs: public profile without e-mail (own e-mail only in `/me`), drafts owner/admin only, comments carry author card not full profile |
| SEC-10 errors | problem+json, no stacks, correlation id |
| SEC-11 rate limiting | auth routes per IP/account, generic API limit, 429 + `Retry-After` |
| SEC-12 headers | `hono/secure-headers`: CSP (`default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'`), HSTS (behind TLS), `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy` |
| SEC-16, ARC-03 realtime | server-published events only; clients never broadcast |
| SEC-17, INF-02 images | non-root, minimal runtime, no source/docs in image, read-only FS |
| SEC-18 magic link | tokens only for existing, verified users |
| SEC-19 PII in logs | ids in URLs; pino redaction of `email`, `password`, cookies |
| DEP-01 | `pnpm audit --prod` gate: zero high/critical (brief) |

## 8. Environment variables (`.env.example`)

| Variable | Default (dev) | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | — |
| `PORT` | `3000` (dev) / `8080` (image) | listen port |
| `APP_URL` | `http://localhost:5173` (dev) / `http://localhost:8080` | public base URL for links in e-mails, OAuth callback, cookie `Secure` decision |
| `TRUST_PROXY` | `false` | honour `X-Forwarded-*` from NPM |
| `COOKIE_SECURE` | `auto` (true when `APP_URL` is https) | cookie flag |
| `DATABASE_URL` | `postgres://devconnector:devconnector@localhost:5432/devconnector` | Postgres |
| `MIGRATE_ON_START` | `true` | run migrations on boot |
| `AUTH_SECRET` | generated hint in `.env.example` | signs OAuth state cookies (≥ 32 bytes) |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `true` | block login until verified |
| `SESSION_TTL_DAYS` | `30` | absolute session lifetime |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | `localhost` / `1025` / `false` / — / — | nodemailer transport (Mailpit in dev) |
| `MAIL_FROM` | `DevConnector <no-reply@localhost>` | sender |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | unset → GitHub login hidden | OAuth App |
| `UPLOADS_DIR` | `./data/uploads` (dev) / `/data/uploads` | avatar storage |
| `MAX_UPLOAD_MB` | `2` | avatar size cap |
| `RATE_LIMIT_LOGIN_PER_MIN` etc. | sane defaults | tuning |
| `LOG_LEVEL` | `info` (`debug` in dev) | pino |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | unset | create the first admin on an empty DB |
| `VITE_*` | none required | the web build has no environment-specific values |

## 9. Repository layout (target)

```
.
├── apps/api               Hono API (+ serves apps/web/dist in the image)
├── apps/web               Vite + React SPA
├── packages/shared        Zod schemas, DTO types, constants
├── packages/config        tsconfig / eslint / prettier presets
├── docs/modernize         this folder (STATE, DECISIONS, FEATURES, AUDIT, TARGET, adr/, DEPLOY, MIGRATION, REPORT)
├── compose.yml            dev/demo stack (db, mailpit, app)
├── compose.prod.yml       production stack (db, app[, backup])
├── Dockerfile             multi-stage, multi-arch
├── .github/workflows/ci.yml
├── .env.example  .nvmrc  .gitattributes  .editorconfig  .gitleaks.toml  pnpm-workspace.yaml  package.json  README.md
└── (legacy backend/ and frontend/ are deleted in Phase 3 batch 1 after the tooling batch is green; they remain on `main`)
```

## 10. Delivery plan (Phase 3 batches → ADRs → FEATURES rows)

| Batch | Content | Closes |
|---|---|---|
| 1 Tooling | workspace, TS/ESLint/Prettier presets, `packages/shared` skeleton, `.env.example`, `.gitattributes`, CI `check` job skeleton, remove legacy apps | ADR-001, DX-01..05, REC-01 |
| 2 DB | Drizzle schema, first migration, migrator, seed, Testcontainers harness | ADR-003, DM-01..15, CQ-01/02/08, PERF-02 |
| 3 Auth & RBAC | sessions, register/login/logout, verification, reset, magic link, GitHub, password change, rate limits, admin role, `me` | ADR-004, AU-01..13, SEC-02/05/06/11/18 |
| 4 API parity | profiles, posts, comments, likes, experiences, educations, admin users/stats, problem+json, pino, health | API-01..25, SEC-08/09/10, ADR-002/008 |
| 5 Storage | avatar upload/serve/delete + import pipeline | ADR-005, ST-01..03, SEC-04 |
| 6 Notifications | tables, events bus, SSE, inbox API, outbox + templates, preferences | ADR-006, NT-01..05, RT-01/02/05 |
| 7 Web | shells, all screens, forms, bell, SSE hook, theme, a11y fixes | ADR-007, SH-*, UI-*, UX-*, MK-01/02/03/08, A11Y-* |
| 8 E2E | Playwright suite on compose | ADR-009 |
| 9 Docker & CI | Dockerfile, compose files, multi-arch build, full `ci.yml` | ADR-010/011, INF-*, CI-* |
| 10 Docs | README (3 commands), DEPLOY.md, MIGRATION.md + import script and its test | ADR-012 |

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Node 26 is 2 days from Active LTS; a late regression in 26.x | the code uses nothing 26-specific; `node:24-alpine` is a one-line fallback |
| Native modules (`sharp`, `@node-rs/argon2`) on `linux/arm64` + musl | both publish musl arm64 prebuilds; verified in batch 5/9 by building both platforms; fallback `node:26-bookworm-slim` |
| Mantine's look ≠ Chakra's look | theme tokens mapped at batch 7 start; screenshot comparison against the appendix spec |
| SSE through Nginx Proxy Manager buffering | `X-Accel-Buffering: no`, heartbeat 25 s, documented NPM advanced config |
| Gitea runner without Docker | job guards (ADR-011); `check` + `security` always run |
| TypeScript 6 deprecations surprising tooling | strict config written for TS 6 from the start; TS 7 adoption later is a bump |
| Import edge cases (profiles without users, duplicates) | dry-run + report + tests on a Supabase-shaped fixture (ADR-012) |

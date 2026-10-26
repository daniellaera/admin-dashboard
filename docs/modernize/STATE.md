# Modernization state — resume file

> Read this first after a `/compact` or in a new session. The full mission text is in [BRIEF.md](BRIEF.md); every judgement call is in [DECISIONS.md](DECISIONS.md).

## Current position

| Item | Value |
|---|---|
| Phase | **GO received 2026-10-26** (D-013: Q1/Q2/Q3/Q5 defaults, Q4 amended: e-mail never public). **Phase 3 in progress** — batches 1–8 done; batch 9 (Docker & CI) in progress. **Next action:** build the image locally (`docker compose up --build -d --wait`), smoke it (health, SPA, 404 JSON), run `E2E_BASE_URL=http://localhost:8080 pnpm test:e2e`, then commit Dockerfile/compose/CI (already written, uncommitted) and tick OPS-01/03. Then batch 10 (README, DEPLOY.md, MIGRATION.md + import script). **Commit at every green step** (user instruction 2026-10-26). Run batches 1→10 (TARGET.md §10) without stopping except for a blocking anomaly or an irreversible decision; then Phase 4 → `REPORT.md`. **Never push any branch** (user pushes after reviewing REPORT.md). |
| Dev toolchain | Node **26.12.1** installed via nvm (not the default alias; prefix every shell command with `export PATH="$HOME/.nvm/versions/node/v26.12.1/bin:$PATH"`); pnpm 12.15.0 installed into that prefix (`npm i -g pnpm@12.15.0`; Node 26 has no corepack). |
| Working branch | `modernize/2026` (started clean from `origin/main` @ `ccfe293`, no upstream tracking) |
| Baseline branch | `main` = `origin/main` @ `ccfe293` ("tags", 2023-03-12). Never touched. |
| Preserved WIP | `wip/local-uncommitted-2026-10-26` @ `f3bb4af` = the dirty working tree found at mission start (D-001). Never push. |
| Repo | https://github.com/daniellaera/admin-dashboard — **public** |
| Local clone | `/Users/daniellaera/dev/git_repos/test-dashboard` |

## Phase checklist

- [x] P0.1 `git fetch` + `git status`; HEAD == origin/main but 167 uncommitted changes → logged (D-001, AUDIT §0.1)
- [x] P0.2 inventory → AUDIT §0.2
- [x] P0.3 `FEATURES.md` (parity checklist with IDs and status column)
- [x] P0.4 secret scan → `appendix/secret-scan.md`; **1 critical leak** (DB password in `backend/README.md`, public repo) — user must revoke
- [x] P0.5 run as-is → `appendix/run-as-is.md` (committed state boots and is exploitable without any token; uncommitted state cannot be installed; Docker images no longer build)
- [x] P1 `AUDIT.md` (REC/ARC/SEC/DEP/CQ/TST/PERF/A11Y/DX/CI/INF + 46 FE findings; verdict: rewrite everything, keep the product spec and data-model shape)
- [x] P2 `TARGET.md` + `adr/ADR-001…012`
- [x] ⛔ STOP summary delivered (top 10, stack table, 5 questions)
- [x] GO received → decisions logged (D-013, D-014; amendments D-016, D-017)
- [x] P3.1 Tooling (pnpm 12 workspace, TS 6 strict presets, ESLint 10 flat + Prettier, Vitest 5 projects, `packages/shared` contract, API + web skeletons, legacy apps removed) · [x] P3.2 DB (Drizzle schema + migration 0000, migrator on boot, idempotent seed, Testcontainers harness) · [x] P3.3 Auth & RBAC (sessions/cookies, register+verify, login w/ lockout + bcrypt rehash, logout(-all), magic link, forgot/reset, change password, delete account, GitHub OAuth, requireAuth/requireRole, admin bootstrap; 17 integration tests) · [x] P3.4 API parity (profiles directory + detail, `/me` profile/CV/posts, posts/comments/likes, admin users/stats, **D-017 role model**: owner bootstrap, invitations, registration mode, sudo, audit log, catalog; 207 tests incl. the 7-actor authorization matrix and PRIV-01) · [x] P3.5 Storage (local volume adapter with traversal guard, sharp → WebP 256/64, upload/delete/serve with immutable caching, cleanup on account deletion, readiness probe) · [x] P3.6 Notifications (notifications + preferences + inbox API, hooks on comment/like/publish, SSE `/events` with heartbeat, Postgres LISTEN/NOTIFY bus, SMTP outbox worker with retries; 216 tests) · [x] P3.7 Web (Vite 8 + React 19 + TanStack Router/Query + Mantine 9 + react-hook-form/Zod: every legacy screen rebuilt incl. the ADR-013 staff pages — users, invitations, catalog, audit, settings, sudo modal, Spotlight user search; typed `createLink` wrappers; 13 web unit tests, FEATURES UI/SH/UX/MK/WIP rows ticked) · [x] P3.8 E2E (Playwright 1.64 against the real stack — API via `tsx` + Vite + compose db/mailpit, DB reset in global setup, Mailpit API for one-time links; 25 journeys: public/PRIV-01, account lifecycle incl. reset + magic link, posts CRUD + comment + like, profile + CV + password, ADR-013 admin flows with sudo/invitation/settings/catalog/negatives, live SSE notification; `E2E_BASE_URL` mode for the CI image) · [ ] P3.9 Docker & CI (also: re-enable knip `exports`/`types` rules to `error` in `knip.json`) · [ ] P3.10 Docs (README, DEPLOY.md, MIGRATION.md)

Batch gate used for every batch: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build && pnpm knip` (all with Node 26 on PATH); from batch 8 on also `pnpm test:e2e` (needs `docker compose up -d db mailpit`).
- [ ] P4 clean-clone verification → `REPORT.md`

## Facts established (verified 2026-10-26, do not re-derive)

- Toolchain on this Mac: Node v24.16.0 via nvm (also 23.11.1, 24.12.0, 25.2.1 — **26 not installed yet: `nvm install 26`**), npm 11.13.0, corepack 0.35.0 (pnpm via `corepack enable`), Docker Desktop 29.9.2 (linux/arm64), Compose v5.6.1, buildx v0.38.1 (`multiarch-builder` exists), gitleaks 8.30.1, gh 2.97.0 (**not logged in**), brew, jq, python3. No psql/pg_dump/flyctl/pnpm/yarn.
- Node release status: v24 "Krypton" in Maintenance LTS since 2026-10-20; **v26 Active LTS on 2026-10-28** (latest 26.12.1) → target Node 26 (D-006). PostgreSQL latest stable **18.6** → `postgres:18-alpine`.
- TypeScript 7.0.2 is `latest` but `typescript-eslint` peer is `<6.1.0` → **TypeScript 6.0.3** (D-007).
- Latest versions on npm (2026-10-26): react 19.3.1, vite 8.3.5, @vitejs/plugin-react 6.1.2, @tanstack/react-query 5.105.0, @tanstack/react-router 1.170.46, react-hook-form 7.91.0, @hookform/resolvers 6.0.0, zod 4.6.7, @mantine/core 9.7.4 (peer react ^19.2), hono 4.13.14, @hono/node-server 2.1.5, @hono/zod-validator 0.9.1, drizzle-orm 0.45.4, drizzle-kit 0.31.11, pg 8.23.1, @node-rs/argon2 2.2.2, bcryptjs 3.0.3, arctic 3.7.0, nodemailer 10.2.1, sharp 0.35.5, pino 10.4.0, vitest 5.0.5, @playwright/test 1.64.1, @testcontainers/postgresql 12.2.1, eslint 10.13.0, typescript-eslint 8.72.0, prettier 3.9.10, knip 6.43.0, pnpm 12.15.0, dayjs 1.11.23.
- The committed app: CRA 5 + React 18.2 + Chakra 2.5 + react-query 3 + react-router 6.8 + Supabase JS 2.8 (auth + storage) + socket.io 4.6 + Novu 0.12; Express 4.18 + Prisma 4.11 + Supabase service-role client + Novu SDK; Node 16/17 images; nginx 1.19; deploy-only GitHub workflow to Fly.
- Supabase usage: Auth (email+password, magic link, GitHub; `localStorage` sessions), Storage (bucket `images`, public read + anonymous insert), backend HS256 JWT check + `auth.admin.deleteUser`. **No Realtime, no RLS, no direct table access from the SPA.** Novu: comment notification via socket handler + bell in the landing navbar.
- Local `.env` files (git-ignored, untouched) point at a local Supabase stack (`supabase-demo` keys); the Novu key there should be rotated when Novu is dropped.

## Where things are

| Artifact | Path |
|---|---|
| Mission brief (verbatim) | `docs/modernize/BRIEF.md` |
| Decisions log (D-001…D-019) | `docs/modernize/DECISIONS.md` |
| Parity checklist | `docs/modernize/FEATURES.md` |
| Audit | `docs/modernize/AUDIT.md` |
| Target architecture | `docs/modernize/TARGET.md`, `docs/modernize/adr/ADR-001…012` |
| Evidence | `docs/modernize/appendix/` (secret-scan, npm-audit, outdated-deps, features-frontend, audit-frontend, run-as-is + probes) |
| Original Prisma migrations | `git show main:backend/prisma/migrations/...` |
| Session scratchpad (ephemeral) | `/private/tmp/claude-501/-Users-daniellaera-dev-git-repos-test-dashboard/<session>/scratchpad/` (contains `head-main/` worktree and `dirty-tree/` copies with installed `node_modules`; safe to delete; `git worktree prune` afterwards) |

## Rules recap (from BRIEF)

No questions except at the STOP. Never push `main`, never force-push, never deploy, never touch Fly or the existing Supabase project. No secrets in the repo. No new SaaS accounts (GitHub, self-hosted Gitea, user-provided SMTP are allowed). Every step verified locally (lint, typecheck, tests, build, compose smoke test). Atomic conventional commits on `modernize/2026`.

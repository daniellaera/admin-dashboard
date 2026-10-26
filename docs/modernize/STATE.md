# Modernization state — resume file

> Read this first after a `/compact` or in a new session. The full mission text is in [BRIEF.md](BRIEF.md); every judgement call is in [DECISIONS.md](DECISIONS.md).

## Current position

| Item | Value |
|---|---|
| Phase | **0 → 1 → 2 in progress** (recon done, audit + target being written). ⛔ STOP point = end of Phase 2; resume only on a message starting with `GO`. |
| Working branch | `modernize/2026` (started clean from `origin/main` @ `ccfe293`, no upstream tracking) |
| Baseline branch | `main` = `origin/main` @ `ccfe293` ("tags", 2023-03-12). Never touched. |
| Preserved WIP | `wip/local-uncommitted-2026-10-26` @ `f3bb4af` = the dirty working tree found at mission start (see D-001). Never push. |
| Repo | https://github.com/daniellaera/admin-dashboard — **public** |
| Local clone | `/Users/daniellaera/dev/git_repos/test-dashboard` |

## Phase checklist

- [x] P0.1 `git fetch` + `git status`; local HEAD == origin/main but the tree had 167 uncommitted changes → logged (D-001, AUDIT §0)
- [x] P0.2 inventory (structure, deps, scripts, Docker, CI, Fly, Prisma, Supabase usage, Novu) → AUDIT §1
- [ ] P0.3 `FEATURES.md` exhaustive functional inventory (backend done by hand; frontend screens from subagent inventory)
- [x] P0.4 secret scan (gitleaks 8.30.1 over all refs + manual grep) → `appendix/secret-scan.md`; 1 critical leak in `backend/README.md`
- [ ] P0.5 run the app as-is (subagent, isolated scratchpad copies) → `appendix/run-as-is.md`
- [ ] P1 `AUDIT.md`
- [ ] P2 `TARGET.md` + `adr/ADR-0xx-*.md`
- [ ] ⛔ STOP summary delivered
- [ ] P3 batches 1–10 (see BRIEF)
- [ ] P4 `REPORT.md`

## Facts established (verified 2026-10-26, do not re-derive)

- Toolchain on this Mac: Node v24.16.0 via nvm (also 23.11.1, 24.12.0, 25.2.1), npm 11.13.0, corepack 0.35.0, Docker Desktop 29.9.2 (linux/arm64), Compose v5.6.1, buildx v0.38.1 (a `multiarch-builder` docker-container builder already exists), gitleaks 8.30.1, gh 2.97.0 (**not logged in**), brew, jq, python3. No psql/pg_dump/flyctl/pnpm/yarn.
- Node release status: v24 "Krypton" entered Maintenance LTS on 2026-10-20; **v26 becomes Active LTS on 2026-10-28** (latest 26.12.1) → target Node 26 (D-006).
- PostgreSQL latest stable: **18.6** (`postgres:18-alpine` exists; no 19 yet). nginx stable 1.30.x.
- TypeScript: 7.0.2 is `latest` (native compiler) but `typescript-eslint` peer range is `<6.1.0` → target **TypeScript 6.0.3** (D-007).
- Other latest versions looked up on npm: react 19.3.1, vite 8.3.5, @tanstack/react-query 5.105.0, @tanstack/react-router 1.170.46, react-hook-form 7.91.0, zod 4.6.7, @mantine/core 9.7.4 (peer react ^19.2), hono 4.13.14, @hono/node-server 2.1.5, fastify 5.12.7, express 5.3.0, drizzle-orm 0.45.4, drizzle-kit 0.31.11, kysely 0.29.7, pg 8.23.1, @node-rs/argon2 2.2.2 (linux x64/arm64 gnu+musl prebuilds), bcryptjs 3.0.3, arctic 3.7.0, nodemailer 10.2.1, pino 10.4.0, vitest 5.0.5, @playwright/test 1.64.1, @testcontainers/postgresql 12.2.1, eslint 10.13.0, typescript-eslint 8.72.0, prettier 3.9.10, pnpm 12.15.0, sharp 0.35.5.
- The committed app: CRA 5 + React 18.2 + Chakra 2.5 + react-query 3 + react-router 6.8 + Supabase JS 2.8 (auth + storage) + socket.io 4.6 + Novu 0.12; Express 4.18 + Prisma 4.11 + Supabase service-role client + Novu node SDK; Node 16/17 Docker images; nginx 1.19; deploy-only GitHub workflow to Fly.
- Supabase usage: **Auth** (email+password, magic-link OTP, GitHub OAuth; session persisted by supabase-js in `localStorage`), **Storage** (bucket `images`, public read + anonymous upload policies), backend verifies Supabase JWTs with the legacy HS256 `SUPABASE_JWT_SECRET` and uses the service-role key to delete auth users. **No Realtime, no RLS policies, no direct table access from the frontend** (all data goes through the Express API). socket.io is used for realtime instead.
- Novu usage: backend `subscribers.identify/delete` + `trigger('comment-template')`; frontend `<NovuProvider applicationIdentifier='vTbMIBFNZdXt'>` bell in the navbar.
- Local `.env` files (git-ignored, left untouched) point at a **local** Supabase stack (`supabase-demo` keys, localhost DB); the Novu key in `backend/.env` is the only real-looking secret there.

## Where things are

| Artifact | Path |
|---|---|
| Mission brief (verbatim) | `docs/modernize/BRIEF.md` |
| Decisions log | `docs/modernize/DECISIONS.md` |
| Functional inventory / parity checklist | `docs/modernize/FEATURES.md` |
| Audit | `docs/modernize/AUDIT.md` |
| Target architecture + ADRs | `docs/modernize/TARGET.md`, `docs/modernize/adr/` |
| Raw evidence (scans, subagent reports) | `docs/modernize/appendix/` |
| Original Prisma migrations (deleted in the WIP tree, intact on `main`) | `git show main:backend/prisma/migrations/...` |
| Session scratchpad (ephemeral, not needed to resume) | `/private/tmp/claude-501/-Users-daniellaera-dev-git-repos-test-dashboard/<session>/scratchpad/` |

## Rules recap (from BRIEF)

No questions except at the STOP. Never push `main`, never force-push, never deploy, never touch Fly or the existing Supabase project. No secrets in the repo. No new SaaS accounts (GitHub, self-hosted Gitea, user-provided SMTP are allowed). Every step verified locally (lint, typecheck, tests, build, compose smoke test). Atomic conventional commits on `modernize/2026`.

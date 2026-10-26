# Decision log

Format: **ID — title** · date · context → options → choice → rationale · reversibility. Newest at the bottom. User decisions taken at the STOP point are tagged `[USER]`; everything else was decided autonomously per the brief ("pick the simplest reversible option").

---

## D-001 — Preserve the dirty working tree on a WIP branch, start `modernize/2026` clean
*2026-10-26*

**Context.** `HEAD` == `origin/main` (`ccfe293`) but the clone had 167 uncommitted changes: ~130 files rewritten with CRLF line endings, `package.json` major bumps in both apps that were never installed (lockfiles still pin Express 4.18 / Prisma 4.11 / Chakra 2.5), deletion of all 14 Prisma migrations, and a handful of real feature edits (Profile `isPublic` toggle, Developers card redesign, "Home" menu entry, like de-dup attempt, socket presence emit, PostForm props). Untracked: `WARP.md`, `.idea/`, `.vscode/settings.json`, an empty root `package-lock.json`, `.DS_Store` files.

**Options.** (a) `git stash` — hidden, fragile; (b) commit the snapshot on a dedicated branch — durable, visible, never pushed; (c) branch from the dirty tree — pollutes the rebuild with CRLF noise and broken manifests; (d) separate `git worktree` — leaves the user's directory on the dirty state, splits the work location.

**Choice.** (b): `wip/local-uncommitted-2026-10-26` @ `f3bb4af` holds the snapshot (tracked changes + `WARP.md`; IDE/OS junk excluded). `modernize/2026` was created from `origin/main` with `--no-track`.

**Rationale.** Nothing is lost, the baseline is unambiguous (what is on GitHub), and the user's directory ends up on the mission branch as the brief expects. **Reversible:** `git switch wip/local-uncommitted-2026-10-26` or `git branch -D` it.

**Follow-up.** The feature edits in the snapshot are treated as part of the parity baseline (see D-005).

## D-002 — Repo-local git identity set to the historical author e-mail
*2026-10-26*

**Context.** Global git config has `user.email = admin@example.com` (placeholder). All 21 historical commits are by `laera.daniel@hotmail.com`.
**Choice.** `git config user.email laera.daniel@hotmail.com` and `user.name daniellaera` **in `.git/config` only**; global config untouched. Commits carry `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` as instructed.
**Reversible:** `git config --unset user.email`.

## D-003 — Local-only excludes for IDE/OS junk
*2026-10-26*

`.git/info/exclude` (not committed) ignores `.idea/`, `.vscode/`, `.DS_Store`, `WARP.md`, `/package-lock.json` so the untracked junk in the clone does not show up in `git status` and cannot be committed by mistake. The committed root `.gitignore` written in Phase 3 covers the generic cases (`node_modules`, `.env*`, build outputs). The files themselves were not deleted (not mine).

## D-004 — Secrets never appear in `docs/modernize/`
*2026-10-26*

Leaked or local credentials are referenced only by location, fingerprint (commit, file:line, rule) and a masked prefix. gitleaks reports in the scratchpad were produced with `--redact=70`. The actual values are irrelevant to the fix (revoke/rotate) and copying them would widen the leak.

## D-005 — Functional baseline = `origin/main` + the uncommitted feature edits
*2026-10-26*

**Context.** The WIP snapshot contains small feature edits that never reached GitHub. **Choice.** `FEATURES.md` lists them as "uncommitted local additions" and the rebuild implements them (they are small and clearly intentional: public/private profile toggle, Developers card layout, Home menu link). The dependency bumps and the migration deletion in the snapshot are *not* carried over (they were never installed and are superseded by the rebuild). **Reversible:** drop the rows from FEATURES.md.

## D-006 — Runtime: Node.js 26 (Active LTS from 2026-10-28)
*2026-10-26*

Verified against `nodejs/Release/schedule.json` and endoflife.date: v24 "Krypton" moved to Maintenance LTS on 2026-10-20; v26 (latest 26.12.1) becomes Active LTS on 2026-10-28, two days after this decision, EOL 2029-04-30. Using v24 would mean shipping on a line already in maintenance. The brief's requirement was "check which Node version is the active LTS today"; the honest answer is "v24 until the 28th, v26 after" and the rebuild will ship after the 28th. Docker base: `node:26-alpine` (exists). Local dev: `.nvmrc` = `26`; nvm must install it (`nvm install 26`).

## D-007 — TypeScript 6.0.x, not 7.x
*2026-10-26*

`typescript@7.0.2` (native Go compiler) is the npm `latest`, but `typescript-eslint@8.72.0` declares peer `typescript >=4.8.4 <6.1.0`; type-aware linting is non-negotiable for the backend. TypeScript 6.0.3 is the last JS-based line and is supported by the whole toolchain (Vite 8, Vitest 5, drizzle-kit, tsx). Revisit when typescript-eslint supports 7.x — the switch is a one-line version bump.

## D-008 — "Run as-is" tests happen in isolated scratchpad copies with dummy env
*2026-10-26*

To honour "never touch the existing Supabase project", the as-is runs use (a) a `git worktree` of `origin/main` and (b) an rsync copy of the dirty tree, both under the session scratchpad, with every `.env` deleted and replaced by dummy local values, a throwaway `postgres:15-alpine` container per copy, and no network access to any `*.supabase.co` host. The real clone is never installed into or executed.

## D-009 — Subagents used for the parallel audit
*2026-10-26*

Three background agents: (1) exhaustive frontend functional inventory → `appendix/features-frontend.md`; (2) static frontend audit (security, quality, a11y, perf, deps) → `appendix/audit-frontend.md`; (3) empirical "run as-is" of both snapshots → `appendix/run-as-is.md`. Backend, DB, infra, CI, dependency and secret audits were done directly (small code base, ~600 lines). Agent outputs are evidence; conclusions in `AUDIT.md` are mine and were spot-checked against the code (all sampled claims held; one correction: the backend *does* delete the Supabase auth user on account deletion, `profile.ts:95`).

## D-010 — Target architecture (Phase 2), one decision per ADR
*2026-10-26 · all "proposed" until GO*

| ADR | Decision | Main alternative rejected | Reversibility |
|---|---|---|---|
| 001 | pnpm 12 workspaces (`apps/api`, `apps/web`, `packages/shared`, `packages/config`), Node 26, TypeScript 6.0 strict, ESLint 10 flat + typescript-eslint + Prettier 3, knip | npm workspaces; Biome; TS 7 | low cost to swap lint/format tools; runtime is a tag |
| 002 | **Hono 4** on `@hono/node-server` | Fastify 5 (runner-up), Express 5 | medium: routes are thin, services are framework-free |
| 003 | **Drizzle ORM** + `pg` driver, PostgreSQL 18, SQL migrations generated by drizzle-kit, migrator on boot, seed | Kysely (TS migrations, codegen types) | medium |
| 004 | hand-rolled auth: `@node-rs/argon2` (argon2id), `bcryptjs` for legacy verify + rehash, opaque DB sessions in `httpOnly/Secure/SameSite=Lax` cookie, `hono/csrf` + Origin checks, in-process rate limiter behind an interface, `arctic` for GitHub, one-time tokens table, RBAC admin/user, **e-mail verification required by default**, **magic link only for existing verified users** (no implicit sign-up) | better-auth / self-hosted GoTrue / JWTs | medium |
| 005 | local volume + `sharp` re-encode (WebP 256/64), served by the API with immutable caching; no S3 | MinIO | low (storage behind an interface) |
| 006 | `notifications` + `notification_preferences` + `email_outbox` tables, SSE via `streamSSE`, Postgres LISTEN/NOTIFY fan-out, nodemailer SMTP, TS mail templates; notification e-mails **off by default**, transactional mails always | WebSockets, polling, self-hosted Novu, Redis | low |
| 007 | Vite 8 + React 19, **TanStack Router** (file-based), TanStack Query 5, react-hook-form + Zod, **Mantine 9** + Tabler icons, dayjs; runtime config from `GET /config` | React Router 7; shadcn/ui + Tailwind 4 (STOP Q1) | router: medium; UI kit: high (every screen) — hence Q1 |
| 008 | Zod 4 schemas + constants in `packages/shared`; API validation with `@hono/zod-validator`; typed client via `hono/client` RPC; `.strict()` on updates | Valibot, tRPC, OpenAPI codegen | low |
| 009 | Vitest 5 (unit/component), Testcontainers Postgres + `app.request`/Supertest (integration, authorization matrix per mutation), Playwright on compose (E2E), `TEST_DATABASE_URL` override for CI | Jest, mocked DB, Cypress | low |
| 010 | **one multi-arch app image** (API serves SPA) + `postgres:18`, `compose.yml` (db, mailpit, app) and `compose.prod.yml`, env-only config, behind Nginx Proxy Manager | two images (nginx + api) (STOP Q2) | low |
| 011 | single `.github/workflows/ci.yml` also executed by Gitea Actions; jobs check / api-integration / e2e / security / image; registry chosen by `github.server_url`; Docker-dependent jobs guarded | separate `.gitea/` workflow | low |
| 012 | id-preserving import from a restored dump: `users.id = Profile.id`, bcrypt hashes kept, optional avatar download from the public bucket, dry-run + report | live import from Supabase | n/a (optional script) |

## D-011 — Features intentionally dropped (FEATURES ➖ rows)
*2026-10-26*

`GET /emojis` (starter leftover), global `GET /experience` and `GET /education` lists (unused), the WIP `fetchByDateArrow` mount, Google/Twitter sign-in buttons (never worked; new OAuth apps would be needed), the "Follow/Connect" button (no backend concept), admin "Help" cards without links, the "404 Page" sidebar demo link, the `/license` footer link (replaced by the real LICENSE), the service worker/PWA leftovers, the `createTask`/`new-user-add` socket events, all dead files listed in FEATURES §11. Everything else is kept or made real (users administration, dashboard stats, password change). Reversible: each is a small addition if wanted later.

## D-012 — Identifiers and URL shapes are preserved
*2026-10-26*

Integer serial ids stay (`/posts/:id`, `/admin/posts/:id`); `users.id` takes the legacy `Profile.id` so ownership checks need no join and imported URLs keep working; Supabase UUIDs are kept only in `users.legacy_auth_id`. Enum values (`FUNNY, TECH, RANDOM, NEWS, SERIOUS`) unchanged. Tags and skills become `text[]` validated against the shared option lists (removes the data-corrupting junction tables, AUDIT CQ-01).

## D-013 — Open questions submitted at the STOP (defaults apply if GO comes without answers)
*2026-10-26 · pending `[USER]`*

| # | Question | Default |
|---|---|---|
| Q1 | UI kit: Mantine 9 vs shadcn/ui + Tailwind 4 | **Mantine 9** (fastest 1:1 parity: AppShell, Table, MultiSelect, RingProgress, Spotlight, Dropzone, notifications) |
| Q2 | Deployment shape: one image (API serves the SPA) vs two images (nginx + API) | **one image** (single origin, one NPM upstream, no CORS) |
| Q3 | Users administration (today a mock): implement for real, admin-only, or drop | **implement**: list/search/paginate, change role, disable/enable, delete; dashboard with real counts |
| Q4 | Profile visibility: `is_public` default for new and migrated profiles | **public by default** (matches today's visible directory; users can opt out via the toggle; the API enforces it) |
| Q5 | E-mail scope: which mails are sent over the user's SMTP | **transactional always** (verification, reset, magic link, "account exists"); **notification e-mails opt-in per user** (default off); no digests |

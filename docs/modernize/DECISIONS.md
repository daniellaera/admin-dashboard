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
*2026-10-26 · `[USER]` GO received. Q1, Q2, Q3, Q5: **defaults accepted** (Mantine 9, one image, real admin-only users administration, transactional mails always + notification mails opt-in). **Q4 amended by the user:** profiles are public by default, **but a user's e-mail is never exposed by any public endpoint or page, regardless of `is_public`; only the owner (`/auth/me`, `/me/*`) and admins (`/admin/*`) can see it.** Consequences: author cards and public profiles carry `displayName` = `username` or `Developer #<id>` (never the e-mail, unlike today's UI), the SSE payloads carry ids only, and the authorization test matrix has an explicit "e-mail visibility" dimension (anonymous / other user / owner / admin) for every endpoint that returns user data. Three extra instructions were also given: (a) extract the real feature edits from the WIP snapshot into FEATURES.md (→ D-014); (b) the old deploy-on-push workflow is deleted in the very first Phase 3 commit (done: `191787f`); (c) **never push any branch** — the user pushes after reviewing REPORT.md.*

## D-014 — Feature edits extracted from `wip/local-uncommitted-2026-10-26` `[USER]`-requested
*2026-10-26 · `git diff origin/main wip/… -w` excluding lockfiles and the deleted migrations: 16 files, 126+/80−*

| WIP edit | Functional? | Disposition in the rebuild |
|---|---|---|
| `ProfileForm.tsx`: "Public" `Switch` + helper text; `profile.ts`: `isPublic` accepted on update | yes | **Parity** — FEATURES UI-10a, API-14 (`PATCH /me/profile {isPublic}`), enforced by `GET /profiles` (Q4: default public) |
| `Developers.tsx`: card header = bold username + green outline badge "Developer" + e-mail line; empty bio fallback; grid spacing 8; "Follow" → "Connect" with user-plus icon | yes (visual) | **Parity for the layout** (username + badge, spacing); **e-mail line dropped** (Q4 rule); Connect button dropped (MK-06) |
| `Nav.tsx`: "Home" entry in the signed-in menu | yes | **Parity** — SH-03 |
| `like.ts`: second lookup to refuse a duplicate like (`existingLike?.createdAt === null`, never true) | intent only | Intent kept structurally: `PRIMARY KEY (post_id, user_id)` + idempotent `PUT /posts/:id/like` |
| `seed.ts`: `create` → `upsert` | yes (ops) | Intent kept: the new seed is idempotent |
| `Signin.tsx`: `socket.emit('new-user-add')` / `socket.on('get-users')` | no server handler | Dropped (RT-03) |
| `PostForm.tsx`: six new optional props, never read | no | Dropped |
| `posts.ts`: `router.use('/fetchByDateArrow/:postId', auth)` | no handler | Dropped (API-25); the feed is already newest-first |
| `schema.prisma`: `directUrl`, `shadowDatabaseUrl`; `package.json` bumps; `PostTable`/`Blog`/`ProfileAvatar` type tweaks | no | Superseded by the rebuild |

## D-016 — `[USER]` amendments for batch 9 (CI) and batch 10 (DEPLOY.md)
*2026-10-26 · received during batch 1, applied in batches 9–10; supersedes the corresponding parts of ADR-010/ADR-011*

- **CI runs on GitHub-hosted runners only.** Never configure or document a self-hosted GitHub runner (public repo with forks).
- **Multi-arch image without QEMU:** build `linux/amd64` on `ubuntu-latest` and `linux/arm64` natively on `ubuntu-24.04-arm`, push each by digest, then merge with `docker buildx imagetools create` into one manifest list.
- **Registry:** `ghcr.io/daniellaera/admin-dashboard`, tags = commit `sha` and `main`. Images are pushed **only from `main`**, never from pull requests (PRs build without pushing).
- Keep the workflow Gitea-compatible as a secondary target; GHCR is the primary registry.
- **DEPLOY.md = pull-based CD** on a Proxmox **unprivileged** LXC (nesting + keyctl) running Docker: `compose.prod.yml` pulling the public GHCR image (no registry auth), a systemd service + timer running `docker compose pull && docker compose up -d` every 5 minutes, Postgres data and uploads on **bind mounts**, a `pg_dump` backup timer, the Nginx Proxy Manager upstream configuration, and rollback by pinning a `sha` tag in the compose file.

## D-017 — `[USER]` role model amendment (OWNER / ADMIN / USER), invitations, sudo mode, audit log
*2026-10-26 · received during batch 4; replaces the two-role RBAC of ADR-004 §"RBAC"; specified in ADR-013*

Rules as given by the user (binding):
- **OWNER**: exactly one (the user). Full access; the only role that can grant or revoke ADMIN. Can never be demoted, disabled or deleted through the app or the API (including its own account deletion). Bootstrapped once via `pnpm owner:create` or `OWNER_EMAIL`/`OWNER_PASSWORD` on first boot; never created or transferred from the UI.
- **ADMIN**: moderation (posts/comments), skills/tags catalog, disable or delete USER accounts, invite users. Can never change any role and can never act on another ADMIN or on the OWNER.
- **USER**: dev area only.
- **Getting a role**: USER by open self-signup with mandatory e-mail verification, or — when the admin setting *registration mode* is `invite_only` (default `open`) — through a single-use 72 h e-mail invitation sent by OWNER/ADMINs. ADMIN only by the OWNER: promote an existing verified USER, or send an admin invitation (single-use, 72 h; accepting creates the account or signs in an existing one, then grants ADMIN).
- **Safeguards**: every role change requires the OWNER to re-enter the password (sudo mode, 10 min); role changes notify the affected user in-app and by e-mail; every role change, invitation, disable and delete is written to the audit log; disabling a user or demoting an admin revokes all their sessions immediately.
- **Tests**: every rule in the authorization matrix including the negative cases (ADMIN promoting, ADMIN acting on ADMIN/OWNER, any demote/disable/delete of the OWNER).

Implementation notes: the skills/tags catalog becomes database-backed (seeded with the 15 languages and 14 tags) so admins can manage it; `SEED_ADMIN_*` is replaced by `OWNER_*`; the first migration is regenerated (nothing is deployed yet, D-001 baseline unaffected).

## D-015 — Dev runtime and API client
*2026-10-26*

- API dev server runs with `tsx watch` (handles workspace TypeScript imports and `.ts` extensions without a build step); production is a single `tsup`/esbuild bundle that inlines `@devconnector/shared` and externalises native/third-party deps. Node's native type stripping remains possible (`erasableSyntaxOnly`, `.ts` import extensions) but is not relied upon. Amends ADR-001's "native type stripping" note.
- The web app uses a thin typed `fetch` client built on the DTO types in `packages/shared` instead of `hono/client` RPC inference: cross-package inference of ~60 validated routes is a known compile-time cost and couples the SPA to the API's route object; the contract is still enforced because API handlers are typed against the same DTOs. `AppType` stays exported for anyone who wants `hc`. Amends ADR-002/ADR-008. Reversible (one file).

| # | Question | Default |
|---|---|---|
| Q1 | UI kit: Mantine 9 vs shadcn/ui + Tailwind 4 | **Mantine 9** (fastest 1:1 parity: AppShell, Table, MultiSelect, RingProgress, Spotlight, Dropzone, notifications) |
| Q2 | Deployment shape: one image (API serves the SPA) vs two images (nginx + API) | **one image** (single origin, one NPM upstream, no CORS) |
| Q3 | Users administration (today a mock): implement for real, admin-only, or drop | **implement**: list/search/paginate, change role, disable/enable, delete; dashboard with real counts |
| Q4 | Profile visibility: `is_public` default for new and migrated profiles | **public by default** (matches today's visible directory; users can opt out via the toggle; the API enforces it) |
| Q5 | E-mail scope: which mails are sent over the user's SMTP | **transactional always** (verification, reset, magic link, "account exists"); **notification e-mails opt-in per user** (default off); no digests |

# REPORT — DevConnector modernization (branch `modernize/2026`)

Date: 2026-10-26 · Repository: https://github.com/daniellaera/admin-dashboard (public) · Base: `main` @ `ccfe293` (2023-03-12)

**Nothing has been pushed.** Every change sits on the local branch `modernize/2026` (24 commits, conventional, atomic). Review this report, then push and open the pull request yourself (§7). The production Fly apps and the Supabase project were never touched; the dirty working tree found at the start is preserved on the local branch `wip/local-uncommitted-2026-10-26`.

## 1. Executive summary

The 2023 application (CRA + Chakra + React Query 3 on the front, Express + Prisma + Supabase Auth/Storage + Novu + Socket.IO on the back, deployed on Fly by a push-to-deploy workflow with no tests) was audited, then rebuilt from scratch as a **self-hosted, zero-SaaS** stack:

- **One container image** (`node:26-alpine`, multi-arch) runs the Hono API and serves the React SPA on the same origin; the only runtime dependencies are **PostgreSQL 18**, an **SMTP server** of your choice and a **local volume** for avatars.
- **Every functional behaviour of the old app is reproduced** (FEATURES.md: 124 rows ✅, 13 rows ➖ dropped with a logged decision, 0 open), and the mocked parts (users administration, dashboard statistics, password change) are now real.
- **Authentication is owned**: argon2id passwords, legacy bcrypt hashes verified and rehashed on login, server-side sessions in an httpOnly cookie, e-mail verification, magic links, password reset, GitHub OAuth, account lockout, CSRF protection, per-IP rate limits, RFC 9457 errors.
- **Your amendments are in**: the OWNER / ADMIN / USER model with invitations, registration mode, sudo confirmation, audit log and session revocation (ADR-013, D-017); e-mails never leave the server for anyone but owner/admins (PRIV-01, D-013); CI on GitHub-hosted runners only with native amd64 + arm64 builds merged into one manifest, published to `ghcr.io/daniellaera/admin-dashboard` from `main` only; pull-based deployment on an unprivileged Proxmox LXC (D-016).
- **Verified end to end** on a clean clone: lint, format, type-check, knip, 28 unit + 210 integration tests, production build, `pnpm audit --prod` (0 findings), gitleaks over the full history (0 findings), first boot of the image from empty volumes, and 25 Playwright journeys run twice — against the dev stack and against the production image exactly as CI will run them (§4).

## 2. What was delivered (by phase)

| Phase | Deliverable | Where |
|---|---|---|
| 0 Recon | mission state, verbatim brief, decision log, functional inventory with IDs, secret scan, run-as-is evidence | `docs/modernize/{STATE,BRIEF,DECISIONS,FEATURES}.md`, `appendix/` |
| 1 Audit | 60+ findings across architecture, security, dependencies, code quality, tests, performance, a11y, DX, CI, infra | `docs/modernize/AUDIT.md` |
| 2 Target | target architecture + 13 ADRs; STOP summary → GO with decisions D-013..D-017 | `docs/modernize/TARGET.md`, `adr/ADR-001…013` |
| 3.1 Tooling | pnpm 12 workspace, TypeScript 6 strict presets, ESLint 10 type-aware + Prettier, Vitest 5 projects, knip, `packages/shared` contract | root configs, `packages/*` |
| 3.2 Data | Drizzle schema (17 tables), SQL migration, migrator on boot, idempotent seed, Testcontainers harness | `apps/api/src/db`, `apps/api/drizzle` |
| 3.3 Auth | sessions, register + verify, login + lockout + bcrypt rehash, logout(-all), magic link, forgot/reset, change password, delete account, GitHub OAuth, RBAC | `apps/api/src/modules/auth` |
| 3.4 API | profiles, CV, posts/comments/likes, `/me`, admin users/stats, **roles amendment**: owner bootstrap, invitations, registration mode, sudo, audit log, skills/tags catalog; 7-actor authorization matrix incl. negative cases and PRIV-01 | `apps/api/src/modules/*`, `test/integration/authz-matrix.test.ts` |
| 3.5 Storage | local volume adapter, sharp → WebP 256/64 px, immutable serving, cleanup on deletion, readiness probe | `apps/api/src/lib/storage.ts`, `modules/files` |
| 3.6 Notifications | in-app notifications + preferences, SSE over Postgres LISTEN/NOTIFY, SMTP outbox worker with retries, TS mail templates | `modules/notifications`, `modules/events`, `mail/` |
| 3.7 Web | every screen on React 19 + Vite 8 + TanStack Router/Query + Mantine 9; staff pages (users, invitations, catalog, audit, settings), sudo modal, Spotlight user search, live bell | `apps/web/src` |
| 3.8 E2E | 25 Playwright journeys on the real stack, Mailpit API for one-time links, CI image mode | `e2e/`, `playwright.config.ts` |
| 3.9 Docker & CI | Dockerfile, `compose.yml` (demo), `compose.ci.yml`, `compose.prod.yml`, GitHub Actions (check / api-integration / security / e2e / image / publish / image-gitea) | root, `.github/workflows/ci.yml` |
| 3.10 Docs | README (3-command setup), DEPLOY.md, MIGRATION.md + `import:supabase` script with tests | `README.md`, `docs/modernize/{DEPLOY,MIGRATION}.md` |
| 4 Verification | this report | `docs/modernize/REPORT.md` |

Commits (oldest first): `70b1509` docs bootstrap · `cbda4be` inventory · `16117be` audit · `8f7f704` target + ADRs · `191787f` remove the deploy-on-push workflow · `850071d` tooling · `d50a6f8` database · `19f9bc7` auth · `221778f` fix · `ee8fc35` API + roles · `83fbece` storage · `bf84019` notifications · `10d4a2e`, `f1c2ace` lint fixes · `6a7b349` web · `a893c0f` web fixes found by E2E · `dba3a1a` E2E · `e7088e2` SPA served by the API · `a58568d` image + compose + CI · `b6f5069` Supabase import · `eeb3402` MIGRATION + DEPLOY · `9d87e6e` README · then the gitleaks allowlist fix and this report.

## 3. Decisions you should know about

All judgement calls are in `DECISIONS.md` (D-001…D-020) and the ADRs. The ones with user-visible effect:

| Decision | Effect |
|---|---|
| Profiles public by default; e-mails never public (D-013 Q4, PRIV-01) | the directory keeps showing everyone; author lines show the username (or `Developer #id`); only owner/admins see addresses |
| No `/admin/users/new` (D-018) | accounts come from sign-up or invitations only (ADR-013); the admin user page is a detail view with the matrix actions |
| Members' dashboard (D-018) | non-staff users see a personal overview instead of the admin statistics |
| Notification e-mails opt-in, transactional e-mails always (D-013 Q5) | preferences page; security notices cannot be turned off |
| GitHub is the only social login (MK-05) | Google/Twitter buttons were inert in the old app; new OAuth apps would need new accounts |
| Experiences/education: end date optional when current, edit/delete added (UI-10b/c) | the old app could only add |
| Random badge colours → deterministic per value (UX-11); `moment`/`date-fns` → dayjs (UX-09) | same display formats |
| Cookie banner text made truthful (UX-02) | one first-party session cookie, no tracking |
| Imported profiles become public unless `--keep-visibility` (ADR-012) | documented in MIGRATION.md |

## 4. Verification log (clean clone, 2026-10-26)

Clone of `modernize/2026` @ `9d87e6e` into a scratch directory, `pnpm install --frozen-lockfile`, Node 26.12.1, pnpm 12.15.0, Docker 29.9 (arm64 host):

| Check | Result |
|---|---|
| `pnpm lint` (ESLint 10, type-aware, strictTypeChecked) | 0 problems |
| `pnpm format:check` | clean |
| `pnpm typecheck` (shared, api, web, root e2e) | clean |
| `pnpm knip` (files, dependencies, exports, types) | clean |
| `pnpm test:unit` | 6 files, **28 tests** passed |
| `pnpm test:integration` (Testcontainers `postgres:18-alpine`) | 11 files, **210 tests** passed |
| `pnpm build` | API bundle 150 KB + scripts; web 1.8 KB index + hashed assets |
| `pnpm audit --prod --audit-level=high` | **No known vulnerabilities found** |
| `gitleaks git --log-opts=--all` (repo rules) | **no leaks found** (the 2023 commit is allowlisted by SHA, see §5) |
| `docker build` | image **332 MB**, runs as uid 1000, `node v26.12.1`; `/app` holds `dist`, `drizzle`, `node_modules`, `package.json`, `web` |
| First boot `docker compose -p devconnector-clean up --build -d --wait` (empty volumes) | all three containers healthy; `/api/v1/health` ok, `/api/v1/ready` `{"database":true,"uploads":true}`; owner bootstrapped and signs in (200); registration → 201 and "Confirm your e-mail" in Mailpit; **0 error log lines** |
| SPA served by the API | `/` → `no-cache` + CSP; `/assets/*` → `immutable`; deep links → index.html; `/api/v1/nope` → JSON 404 |
| `pnpm test:e2e` against the dev stack (Vite + tsx API) | **25 passed** |
| CI replay: `docker build -t devconnector:ci .` → `compose.yml` + `compose.ci.yml` → `E2E_BASE_URL=http://localhost:8080 pnpm test:e2e` | **25 passed** (36 s) |

Three defects in batch-7 code were caught by the E2E suite and fixed before commit (`a893c0f`): the sudo modal crashed because `ModalsProvider` sat above the `QueryClientProvider`; the CV edit form submitted the whole DTO; keyed forms lost their success toast.

## 5. Security — things only you can do

1. **CRITICAL — rotate the Supabase database password.** `backend/README.md` on `main` (since commit `161af4b`, 2023-02-19, public repository) contains the full connection string with the password of project `aetkrjbqdijselycidyg`. Supabase dashboard → Project Settings → Database → reset password; also rotate the pooler URIs derived from it. Assume the database has been readable and writable by anyone since 2023. (The commit is allowlisted in `.gitleaks.toml` so CI can gate *new* leaks; remove the entry if you rewrite history.)
2. **Novu**: rotate or delete the API key found in the ignored local `backend/.env` (never committed) and close the account once the old app is retired.
3. **Fly**: revoke the API token and delete the GitHub Actions secrets of the removed deploy workflow (`FLY_API_TOKEN`); stop, then delete the two Fly apps after the cut-over week.
4. **Supabase project**: after MIGRATION.md is done, pause the project, delete it when the retention period ends, and delete the local dump.
5. **GitHub OAuth App** (optional feature): if you create one, register the callback `${APP_URL}/api/v1/auth/github/callback`; the secret goes in the server `.env` only.
6. The literal `AUTH_SECRET` in `compose.yml` is a local-demo value by design; `compose.prod.yml` refuses to start without your own `POSTGRES_PASSWORD` and reads `AUTH_SECRET` from `.env`.

Hardening in place: argon2id (OWASP params) with bcrypt rehash, opaque sessions (sha256 of a 256-bit token), `SameSite=Lax` + `Secure` + httpOnly cookie, same-origin CSRF check, per-IP rate limits and login lockout, Zod strict objects on every input (no mass assignment), e-mail enumeration resistance (constant-time dummy verification, uniform responses), CSP without inline scripts, `frame-ancestors 'none'`, HSTS when served over https, non-root read-only container, database never published, audit log for every privileged action, sessions revoked on password/role change and disabling.

## 6. Known limitations and follow-ups

- **CI has not run on GitHub yet** (nothing was pushed). The workflow replays locally except for the two runner-specific jobs: `image` (needs `ubuntu-24.04-arm` for the native arm64 build) and `publish` (GHCR). Expect the first run to need `Settings → Actions → General → Workflow permissions: read and write` (or keep the job-level `packages: write`, already set) and the package to be made **public** once on GHCR so the LXC can pull without credentials.
- Only the arm64 image was built locally (this Mac); the amd64 build runs the same Dockerfile on `ubuntu-latest`. The `image-gitea` job is untested (no Gitea instance).
- The rate limiter and the SSE fan-out are single-process (in-memory limiter; Postgres `LISTEN/NOTIFY` would already support several instances). Horizontal scaling is a non-goal (ADR-010).
- The Supabase import was tested on a synthetic Supabase-shaped dump (same table and column shapes as the Prisma schema); run the dry run on your real dump first (MIGRATION.md §3).
- No digest e-mails, no post search, no follow/connect feature (the old button had no handler — MK-06).
- `pnpm-workspace.yaml` carries `minimumReleaseAgeExclude` entries for packages released in the last day (Mantine 9.7.4, TanStack Query 5.105, typescript-eslint 8.72.1); pnpm removes them automatically as they age.

## 7. How to ship

```sh
cd /Users/daniellaera/dev/git_repos/test-dashboard
git log --oneline main..modernize/2026        # review
git push -u origin modernize/2026
gh pr create --base main --head modernize/2026 --title "Rebuild: self-hosted DevConnector 2.0" --body-file docs/modernize/REPORT.md
```

On merge, CI publishes `ghcr.io/daniellaera/admin-dashboard:<sha>` and `:main`; then follow **DEPLOY.md** (server) and, for the data, **MIGRATION.md**. Day-to-day: `README.md`.

Local toolchain note: Node 26 is installed via nvm but is not your default alias; `nvm use 26` (or `.nvmrc`) before running pnpm.

# AUDIT — DevConnector (admin-dashboard) as of `origin/main` @ `ccfe293`

Date: 2026-10-26. Scope: the committed code on `origin/main` (2023-03-12) plus the uncommitted local tree preserved on `wip/local-uncommitted-2026-10-26`. Line numbers refer to `origin/main` unless marked ✚ (WIP tree). Severity scale: **critical** (exploitable now / data loss / leaked secret), **high** (serious weakness, easy to exploit or blocks the project), **medium**, **low**. Evidence files: `appendix/`.

Finding ID prefixes: REC recon · ARC architecture · SEC security · DEP dependencies · CQ code quality · TST tests · PERF performance · A11Y accessibility · DX developer experience · CI · INF infra · FE frontend (from the frontend sub-audit).

---

## 0. Reconnaissance results

### 0.1 Local copy vs `origin/main`

`git fetch` showed no new remote commits (last push 2023-03-12). `HEAD` == `origin/main` == `ccfe293`, **but the working tree did not match**: 167 changed paths (160 files, +7187/−7338 lines).

| ID | Sev | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| REC-01 | medium | The clone had been rewritten with **CRLF line endings** in ~130 files (whitespace-only diff) — no `.gitattributes`, `core.autocrlf` unset | `git diff origin/main --stat` = 160 files; `--ignore-all-space` = 31 files | Noise that hides real changes; mixed EOLs across machines | `.gitattributes` with `* text=auto eol=lf` in the rebuild; snapshot preserved (D-001) |
| REC-02 | high | `package.json` **major-version bumps that were never installed**: Express 4→5, Prisma 4→7, Chakra 2→3, react-router 6→7, framer-motion 6→12, ESLint 8→9, Jest 29→30… while both lockfiles still resolve the old versions (`express 4.18.2`, `@prisma/client 4.11.0`, `@chakra-ui/react 2.5.1`) | WIP `backend/package.json` vs `backend/package-lock.json` (`.packages["node_modules/express"].version` = 4.18.2) | `npm ci` fails on the WIP tree; the source is incompatible with the declared versions (Chakra v3 API, Prisma 7 config/generator) → an in-place upgrade attempt that was abandoned | Rebuild (this mission) rather than upgrade; lockfile discipline + Renovate-style PRs later |
| REC-03 | high | **All 14 Prisma migrations and `migration_lock.toml` deleted** in the WIP tree | `git status` `D backend/prisma/migrations/...` | Loses the only schema history; `prisma migrate deploy` would have nothing to apply | Migrations are intact on `main`; the rebuild ships its own versioned SQL migrations and an import script |
| REC-04 | low | Real feature work mixed into the noise: Profile `isPublic` switch (form + API), Developers card redesign, "Home" menu entry, like de-dup attempt, presence socket emit | `git diff origin/main -w` on 8 source files | Would be lost if the tree were reset | Captured in FEATURES.md as ✚ rows (D-005) |
| REC-05 | low | Untracked junk: `WARP.md` (agent-generated notes describing the old stack), `.idea/`, `.vscode/settings.json` (Kiro agent flag), empty root `package-lock.json`, `.DS_Store` | `git status --short \| grep '^??'` | Noise | Local excludes (D-003); root `.gitignore` in Phase 3 |
| REC-06 | high | **The committed Docker images no longer build**: backend `apt-get install openssl` on `node:16-bullseye-slim` → 404 from the removed Debian 11 security pool (exit 100); frontend `npm install` in `node:17-alpine` fails compiling `bufferutil` (no Python/toolchain on Alpine, no arm64-musl prebuilt for Node 17) | `appendix/run-as-is.md` §3.4 | The deploy pipeline on `main` would fail today; no reproducible artefact exists | New images on `node:26-alpine` with `pnpm fetch` and no native builds at image time |
| REC-07 | medium | Environment loading works **by accident**: `require('dotenv').config()` runs after the imports in `app.ts:12`; `config/supabase-client.ts` only survives because `@prisma/client` 4.x auto-loads `.env` when `lib/prisma.ts` is required first (`api/index.ts` imports `./posts` before `./profile`) | verified empirically: requiring `supabase-client.ts` alone throws `supabaseUrl is required.` (`appendix/run-as-is.md` §3.1) | Any import reordering (or Prisma ≥ 5) breaks boot | Typed env module loaded first, validated with Zod |
| REC-08 | low | Prisma 4.11 crashes on `SIGTERM` under Node 24 (`process.exit('SIGTERM')` → `ERR_INVALID_ARG_TYPE`) — shutdown is a crash | `appendix/run-as-is.md` §3.1 "extra" | Ungraceful shutdown in containers | Graceful shutdown handler (close server, drain pool) |

### 0.2 Inventory summary

| Area | As-is |
|---|---|
| Layout | Two independent npm projects `backend/` (Express 4.18, TS 4.9, Prisma 4.11) and `frontend/` (CRA 5 / react-scripts 5.0.1, React 18.2, TS 4.9); no root manifest, no workspaces, no shared types (frontend `types/*.ts` hand-copied from the Prisma schema) |
| Backend deps (locked) | express 4.18.2, @prisma/client 4.11.0, @supabase/supabase-js 2.8.0, @novu/node 0.12.0, socket.io 4.6.1, helmet 6.0.1, cors 2.8.5, jsonwebtoken 9.0.0, morgan 1.10.0, dotenv 16.0.3, date-fns 2.29.3; dev: jest 29.4, ts-jest, supertest 6.3, eslint 8.34 + airbnb-typescript, nodemon 2.0, ts-node 10.9 |
| Frontend deps (locked) | react 18.2, react-scripts 5.0.1, @chakra-ui/react 2.5.1 (+icons, emotion, framer-motion 6.5.1), react-query 3.39.3, react-router-dom 6.8.1, react-hook-form 7.43, axios 1.3.3, @supabase/supabase-js 2.8.0, @novu/notification-center 0.12.0, socket.io-client 4.6.1, chakra-react-select 4.4, react-icons 3.11, moment 2.29 + date-fns 2.29, web-vitals 2.1 |
| Scripts | backend: `start` (ts-node), `dev` (nodemon), `build` (tsc), `lint` (eslint **--fix**), `test` (jest), `db:seed` (`prisma migrate dev --name init && prisma db seed`), `generate` (`prisma migrate reset --preview-feature && migrate deploy`); frontend: CRA `start/build/test/eject` |
| Docker | `backend/Dockerfile` 5-stage on `node:16-bullseye-slim`, `npm install`, `prisma generate`, final stage `ADD . .`; `frontend/Dockerfile` `node:17-alpine` build with 3 `ARG`s → `nginx:1.19` + custom `nginx.conf` (SPA fallback, gzip) |
| CI | `.github/workflows/main.yml` "Fly Deploy": on **every push**, `dorny/paths-filter@v2` then `flyctl deploy` per changed app; secrets `FLY_API_TOKEN`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_BACKEND_URL` |
| Fly | `devconnector-backend` (internal 8080, `NODE_ENV=production`, TCP checks, 25 conn hard limit), `devconnector-frontend` (nginx:80, statics) |
| Database | Supabase-hosted Postgres; Prisma `public` schema with 8 tables + 1 enum (FEATURES §2); migrations applied **manually from a laptop** (README) |
| Supabase usage | **Auth** (email+password, magic link OTP, GitHub OAuth; `localStorage` sessions; backend verifies HS256 JWT with `SUPABASE_JWT_SECRET`; backend `auth.admin.deleteUser` with the **service-role key**), **Storage** (bucket `images`; `supabase.sql` = public read + anonymous insert policies + `GRANT ALL ... TO anon, authenticated`). **Not used:** Realtime, RLS, direct PostgREST queries from the SPA, Edge Functions |
| Novu | backend SDK: subscriber identify/delete, trigger `comment-template`; frontend `@novu/notification-center` bell with hard-coded `applicationIdentifier` |
| Realtime | Socket.IO, client-emitted events rebroadcast by the server (FEATURES §6) |
| Tests | backend: 2 files / 4 assertions on hello & 404 routes; frontend: CRA default `App.test.tsx` asserting text that does not exist in the app |

### 0.3 Secret scan

Full detail in `appendix/secret-scan.md`. Summary: gitleaks (default rules) found nothing in history; a manual pattern grep found **SEC-01** below. Local `.env` files contain only Supabase CLI demo keys and localhost URLs (plus a Novu API key to rotate).

### 0.4 Running the app as-is

Method (D-008): two isolated copies — **A** = `origin/main`, **B** = the uncommitted tree — each with a throwaway `postgres:15-alpine`, dummy local env, Node 24.16, no network to any non-localhost host. Full matrix, verbatim outputs and probe log: `appendix/run-as-is.md`, `appendix/run-as-is-probes-A.txt`.

| Step | A (committed) | B (uncommitted) |
|---|---|---|
| backend `npm ci` | OK (655 pkgs) | **FAIL** `ERESOLVE` (airbnb-typescript@18 vs typescript-eslint@8); `--legacy-peer-deps` needed to go further |
| `prisma generate` / `migrate deploy` / `db seed` | OK / 14 migrations applied / 4 profiles + 6 posts | **FAIL** P1012: Prisma 7 rejects `url`/`directUrl`/`shadowDatabaseUrl` in `schema.prisma` (wants `prisma.config.ts`); seed silently ignored |
| backend `tsc` / `eslint` / `jest` / `build` | 0 errors / 0 problems / 4 passed / OK | 2 TS errors (`PrismaClient` not exported) / ESLint 9 wants flat config / suites fail to compile / exit 2 |
| backend boot (`ts-node src/index.ts`) | OK in ~2 s | **FAIL** (TS2305) — no probes possible |
| frontend `npm ci` / `tsc` / `test` / `build` | OK / 0 errors / **FAIL** (Jest 27 cannot parse axios ESM) / OK "Compiled with warnings" — **615 kB gzip** main bundle (2.5 MB raw, 14 MB source maps) | **FAIL** lock out of sync (~200 entries) → with `--legacy-peer-deps`: **377 TS errors** (Chakra v2→v3 API), test cannot find `@testing-library/dom`, build crashes on `ajv` mismatch |
| Docker builds (A) | backend **FAIL** (Debian 11 pool 404), frontend **FAIL** (`bufferutil` needs Python) | not attempted |

**Live probes on A** (dev mode, `ts-node`): all read endpoints 200; `POST /posts/create` → 401 without token, 400 with a garbage token; **without any token**: `POST /comments/create` → 200 (comment attributed to profile 1), `POST /likes/create` → 200, `PUT /posts/updateById/1` → 200 and the title `HACKED` persisted, `PUT /profile/updateById/1` → 200 (`username: owned` persisted), `DELETE /posts/deleteById/2` → 200 and the post is gone. `GET /posts/post/abc` → 200 `{error}`. Malformed JSON → 500 with the body-parser stack trace and absolute paths; unknown route → 404 with stack trace (hidden only when `NODE_ENV=production`). `OPTIONS` with `Origin: https://evil.example` → `Access-Control-Allow-Origin: *`, methods `GET,HEAD,PUT,PATCH,POST,DELETE`. Helmet headers present, no `X-Powered-By`.

**Conclusion:** the committed app runs (and is exploitable as described in §2); the uncommitted upgrade attempt cannot be installed, compiled or booted, and the committed Docker pipeline is dead.

---

## 1. Architecture

**Shape.** SPA (CRA) ↔ Express JSON API ↔ Prisma ↔ Supabase Postgres, with three SaaS side-cars: Supabase Auth (identity), Supabase Storage (avatars), Novu (notifications), plus a Socket.IO channel for realtime. Identity lives in `auth.users`, the application "user" is `Profile` keyed by **email string**, and Novu subscribers are keyed by `Profile.id`. The SPA is responsible for keeping these in sync (it calls `POST /profile/create` after sign-up and `createProfileBySocial` on every GitHub auth event).

| ID | Sev | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| ARC-01 | **critical** | **No authorization model.** The API never resolves "who is calling" to a profile: the `auth` middleware only checks a JWT signature and does not attach the user (`middleware/auth.ts:7-20`); every handler trusts `profileId` from the body or URL (`posts.ts:116`, `comments.ts:7-12`, `like.ts:7`, `experience.ts:13,27`, `education.ts:13,27`, `profile.ts:84-91,105`) | Any client can act as any user (see SEC-02) | Server-side identity (session → user id) injected into every handler; ownership checks in a service layer; admin role for moderation |
| ARC-02 | high | **Three identity stores synchronised by the browser.** Profiles are created by client calls after `signUp`/`signInWithOtp`/OAuth (`frontend/src/api/authApi.ts:41-48, 58-68`, `providers/AuthProvider.tsx:26-29`) | Profiles without users (magic-link request for someone else's email creates their profile), users without profiles (if the second call fails), Novu drift; `authorEmail` as the join key breaks on email change | One `users` table owning identity, role and profile; registration is a single server transaction |
| ARC-03 | high | **Realtime is client-authoritative.** Any socket client can emit `createPost`/`addComment`; the server rebroadcasts the payload verbatim to everyone and triggers a Novu notification to whatever `profileId` the payload names (`app.ts:27-40`) | Fake "new post" banners for all visitors; notification spam to any user; no auth on sockets at all | Server publishes events itself after the DB write (SSE over Postgres `LISTEN/NOTIFY`); clients never broadcast |
| ARC-04 | medium | **"Admin" area is not an admin area** — every authenticated user gets `/admin/*` and a hard-coded "Admin" label (`frontend/src/components/shared/Nav.tsx:124`); the Users management pages are mock data (`api/userApi.ts`) | Misleading UX; no moderation capability | Real RBAC (`admin`/`user`), admin-only users page over real data (FEATURES MK-01) |
| ARC-05 | medium | **No shared contract** between front and back: frontend types are hand-written copies of the Prisma models (`frontend/src/types/*.ts`); request bodies are untyped `any` on the server | Silent drift (e.g. `isPublic` added on one side only in the WIP tree) | Shared package with Zod schemas → inferred TS types on both sides |
| ARC-06 | low | Backend reuses frontend env naming (`REACT_APP_SUPABASE_URL` read by the server, `config/supabase-client.ts:3`), and the starter-template identity is still in `package.json` (`"name": "express-api-starter-ts"`, author CJ R.) | Confusing config, wrong metadata | Typed env schema (zod) with app-specific names |

## 2. Security (OWASP Top 10 mapping)

| ID | Sev | OWASP | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|---|
| **SEC-01** | **critical** | A02 Cryptographic failures / secrets | **Production database password committed in clear text** in a public repo: `postgresql://postgres:***@db.aetkrjbqdijselycidyg.supabase.co:5432/postgres` | `backend/README.md:11`, since `161af4b` (2023-02-19); still on `origin/main` | Full read/write access to the production database for anyone who read GitHub in the last 3.5 years; gitleaks did **not** flag it | **Must be revoked now**: reset the DB password in Supabase, audit data; the string stays in history (no force-push), which is acceptable once rotated. Add gitleaks with a custom URI rule to CI |
| **SEC-02** | **critical** | A01 Broken access control | **Unauthenticated mutating endpoints**: `PUT /posts/updateById/:postId` (`posts.ts:81`), `DELETE /posts/deleteById/:id` (`posts.ts:131`), `PUT /profile/updateById/:profileId` (`profile.ts:105`), `DELETE /profile/delete/:profileId` (`profile.ts:84-91`: the profile row is deleted **before** the token is checked for anything), `POST /profile/create` (`:43`), `POST /profile/createProfileBySocial/:email` (`:57`), `POST /comments/create` (`comments.ts:6`), `POST /likes/create` (`like.ts:6`), `POST /experience/create` (`experience.ts:12`), `POST /education/create` (`education.ts:12`). The single guarded route `POST /posts/create` (`posts.ts:107`) still takes `profileId` from the body (`:116`) | Anyone on the internet can edit/delete every post, wipe any profile (cascade deletes everything the user owns), post comments/likes/CV entries as anyone | Session-based identity on every non-public route; ownership checks (`post.profileId === me.profileId || me.role === 'admin'`); `profileId` never accepted from clients |
| **SEC-03** | **critical** (unverified live) | A01 / A05 Security misconfiguration | **Whole `public` schema likely exposed through Supabase PostgREST with the anon key.** `supabase.sql:12-14` grants `USAGE` and `ALL PRIVILEGES ON ALL TABLES IN SCHEMA public` to `anon` and `authenticated`; tables were created by Prisma (RLS **off** by default, no policies anywhere in the repo); the anon key is shipped in the public JS bundle (`frontend/Dockerfile:5-6`, CI build-args) | If RLS is disabled (the default for tables not created via the dashboard), `curl https://<ref>.supabase.co/rest/v1/Profile -H "apikey: <anon>"` reads and writes every table — independent of the Express API | **Verify in the Supabase dashboard** (Table editor → RLS badge). Mitigation until cut-over: enable RLS on all 8 tables with no policies (the API uses the direct Postgres connection, not PostgREST, so nothing breaks). In the rebuild there is no PostgREST |
| SEC-04 | high | A01 / A04 | **Anonymous file upload to the avatar bucket**: storage policy "Anyone can upload an avatar" `for insert with check (bucket_id = 'images')` (`supabase.sql:9-10`) + public read (`:6-7`); client-side only `accept="image/*"` and a `Math.random()` filename (`CustomAvatar.tsx:49-52, 100`); no size/type validation anywhere | Free public file hosting / malware distribution under the project's domain; storage cost abuse | Authenticated upload through the API: size cap, MIME sniffing, re-encode with sharp (strips payloads), per-user quota |
| SEC-05 | high | A07 Identification & authentication failures | **Tokens in `localStorage`** (supabase-js default `persistSession`); access token sent as `Authorization: token <jwt>` (`frontend/src/api/authApi.ts:88`, `postApi.ts:26`); server accepts any scheme (`split(' ')[1]`, `auth.ts:7`), verifies only signature+exp with the **legacy shared HS256 secret**, no `aud`/`iss` check (`auth.ts:15`) | XSS → full account takeover with refresh token; the legacy JWT secret path is deprecated by Supabase (asymmetric signing keys) so the middleware is on borrowed time | DB-backed opaque sessions in `httpOnly; Secure; SameSite=Lax` cookies; CSRF protection; no tokens reachable from JS (brief) |
| SEC-06 | high | A01 | `auth` middleware never attaches identity to the request, so **ownership is unimplementable** downstream; invalid token → 400 instead of 401 (`auth.ts:22`) | Root cause of SEC-02 | Replace with session middleware that sets `c.var.user` and fail with 401/403 consistently |
| SEC-07 | high | A05 | **CORS wildcard** on the API (`app.use(cors())`, `app.ts:50` → `Access-Control-Allow-Origin: *`) and on Socket.IO (`cors: {methods:[…]}` with no origin, `app.ts:17-22`) | Any website can drive a visitor's browser against the API; harmless only because there is no cookie auth *yet* — fatal once cookies are introduced | Same-origin deployment (SPA and API behind one origin) and an explicit `CORS_ORIGIN` allow-list for dev |
| SEC-08 | high | A03 Injection / input validation | **No input validation at all**: bodies are destructured and handed to Prisma (`posts.ts:83, 108`, `profile.ts:106`, `comments.ts:7`, `experience.ts:13-16`); `Number(param)` → `NaN` crashes Prisma; `tags.map` on a missing field → `TypeError`; `parseISO(undefined)` → `Invalid Date`; mass assignment on updates | 500s with stack traces (SEC-10), data corruption (CQ-02), trivial DoS of the process via malformed payloads (unhandled promise rejections in Express 4 async handlers) | Zod schemas shared with the frontend, validated at the edge; typed params; 400 problem+json |
| SEC-09 | high | A01 / A02 | **Over-exposure of data**: `GET /profile` returns every profile incl. e-mail regardless of `isPublic` (`profile.ts:8-19`); `GET /posts/postsByProfileId/:id` returns **drafts** of any user (`posts.ts:36-48`); `GET /posts/post/:id` returns unpublished posts (`:50-79`); comments embed the **full** commenter profile (`comments.ts:32-34`), the feed embeds full profiles inside comments (`posts.ts:20-25`); `GET /experience` and `GET /education` dump everyone's CV (`experience.ts:7-10`) | E-mail harvesting, draft leakage, PII in every list payload | Public DTOs without e-mail for strangers; drafts visible to owner/admin only; `isPublic` enforced |
| SEC-10 | medium | A05 / A09 | Error handler returns `err.stack` unless `NODE_ENV=production` (`middlewares.ts:17`); many handlers answer **200 with `{error}`** on failure (`posts.ts:46, 77, 141`, `experience.ts:46`) | Information leak in non-prod deployments; clients cannot detect failures | Central error handler → RFC 9457 problem details, correct status codes, no stacks |
| SEC-11 | medium | A04 Insecure design / A07 | **No rate limiting** on comments, likes, posts, profile creation, or sockets; login brute force is delegated to Supabase | Spam, storage/DB growth, notification floods | Per-IP and per-account limits on auth routes; per-user limits on writes |
| SEC-12 | medium | A05 | Security headers only on the API (`helmet()`); the SPA served by nginx has **no CSP, HSTS, X-Frame-Options, Referrer-Policy** (`frontend/nginx/nginx.conf` has no `add_header`) | Clickjacking, weaker XSS containment | Single origin with strict headers from the app server (or NPM) |
| SEC-13 | medium | A02 / supply chain | Secrets passed as Docker `--build-arg`s and `ENV` (`frontend/Dockerfile:5-11`, `.github/workflows/main.yml:48-50`) end up in image history; acceptable for a Supabase anon key **only if RLS exists** (SEC-03) | The anon key is effectively a DB credential in this project | Runtime config injection; no secrets in images |
| SEC-14 | medium | A01 | Service-role Supabase client lives in the API process (`config/supabase-client.ts:4`) and is reachable from an unauthenticated route (`profile.ts:89-95`): `auth.admin.deleteUser(data.user?.id!)` with `data.user` undefined when the token is garbage | Combined with SEC-02: anyone deletes any profile; the admin call then throws *after* the delete | Removed with Supabase; destructive operations behind auth + confirmation |
| SEC-15 | low | A07 | Sign-in form pre-filled with credentials `janedane@gmail.com` / `123456` (`Signin.tsx:61-63`) | Indicates a real weak test account in production auth | Delete the account; no default values |
| SEC-16 | medium | A04 | Unauthenticated **Socket.IO** clients can trigger notifications to any profile and broadcast arbitrary payloads (`app.ts:35-39`) | Notification spam, UI spoofing | See ARC-03 |
| SEC-17 | low | A05 | Backend production image does `ADD . .` in the final stage (`backend/Dockerfile:57`), shipping source, tests, prisma folder **and `README.md` with the password**; runs as root (no `USER`) | Bigger attack surface, secret inside the image | Copy only `dist` + prod `node_modules`; non-root user; `.dockerignore` for docs |
| SEC-18 | low | A01 | Magic-link flow creates a profile for **any e-mail typed** before ownership is proven (`authApi.ts:41-48`) | Identity pre-claiming, profile squatting, junk rows | Profile created server-side only after verification |
| SEC-19 | low | A09 Logging | E-mail addresses in URLs (`/findProfileByEmail/:authorEmail`, `/createProfileBySocial/:email`) and `console.log` of whole profile objects (`profile.ts:65, 77, 93, 100`) | PII in access logs | IDs in URLs; structured logs with redaction |
| SEC-20 | low | A01 | Post-login redirect uses `location.state.from.pathname` (`Signin.tsx:54`) — internal pathname only, **not** an open redirect; noted because react-router ≤6.30.2 has open-redirect advisories (DEP-01) | — | Keep pathname-only redirect; upgrade router |

## 3. Dependencies

Evidence: `appendix/npm-audit-committed.md`, `appendix/outdated-deps.md`.

| ID | Sev | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| DEP-01 | **critical** | `npm audit` on the committed lockfiles: **backend 42 vulnerabilities (4 critical, 22 high; production-only 24: 3 critical, 12 high)**, **frontend 84 (6 critical, 42 high)**. Direct vulnerable packages: `express 4.18.2`, `nodemon 2.0.x`, `axios 1.3.3`, `react-router-dom 6.8.1`, `socket.io-client 4.6.1`, `@novu/notification-center 0.12`, `react-scripts 5.0.1` (unfixable: CRA is abandoned) | appendix tables | Known RCE/ReDoS/XSS/open-redirect issues in the shipped runtime (`express`, `body-parser`, `path-to-regexp`, `jws`, `ws`, `socket.io-parser`…) | Rebuild on current majors; `pnpm audit` gate in CI (brief: zero high/critical) |
| DEP-02 | high | **EOL / abandoned foundations**: Create React App (sunset by the React team, Feb 2025; `react-scripts` frozen at 5.0.1 since 2022), `react-query@3` (superseded by TanStack Query, no releases since 2022), `moment` (maintenance mode by its own docs; also duplicated with `date-fns`), Chakra UI v2 (v3 is a rewrite — the WIP bump proves the code does not compile against it), Prisma 4 (EOL), Express 4 (maintenance), TypeScript 4.9, ESLint 8 (EOL 2024-10), `@types/node@12`, framer-motion 6, react-icons 3, Novu 0.12 SDK (2.x is a different API), Node 16/17 and nginx 1.19 base images (INF-01) | `appendix/outdated-deps.md`; `frontend/package.json` | No security fixes, no React 19 support, upgrade path blocked by the toolchain itself | Replace the toolchain (Vite), the UI kit, the data layer; pin a Node LTS |
| DEP-03 | medium | Dependency hygiene: `@types/socket.io` as a runtime dependency; `@testing-library/*`, `@types/*`, `typescript` under `dependencies` in the frontend; two date libraries; `axios` for 18 calls where `fetch` suffices; `react-icons` default imports pulling whole icon sets (bundle) | `backend/package.json:24`, `frontend/package.json:12-19` | Bloat, unclear prod surface | Workspace catalogs, `knip` for unused deps |
| DEP-04 | medium | The WIP bump attempt (REC-02) is evidence that **upgrading in place is not viable**: Chakra v3 (every component), Prisma 7 (`prisma.config.ts`, new generator, driver adapters), react-router 7 (package rename), ESLint 9 flat config, Jest 30 — all breaking at once with a lockfile that was never regenerated | WIP `package.json` vs lockfile | — | Confirms the "rewrite" verdict (§12) |

## 4. Code quality & TypeScript strictness

| ID | Sev | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| CQ-01 | high (correctness) | **Tag / skill `connectOrCreate` uses the array index as primary key**: `tags.map((value, id) => ({ create: value, where: { id } }))` (`posts.ts:96-99, 118-121`; same for `programmingLanguages`, `profile.ts:123-126`) | For index 1,2,3… an existing `Tags`/`ProgrammingLanguage` row with that id (belonging to **another** post/profile) gets re-parented instead of a new one created; the preceding `deleteMany` makes it look like it "works" on fresh DBs only | Silent cross-user data corruption | Model tags as `text[]` or a proper junction table; never use client indexes as keys |
| CQ-02 | medium | Like uniqueness is a read-then-write race with no DB constraint (`like.ts:11-31`); WIP adds a second, nonsensical check (`existingLike?.createdAt === null`) | Double likes under concurrency | `UNIQUE (post_id, user_id)` + upsert/toggle |
| CQ-03 | medium | Prisma singleton is wrong: in production two clients are created (`lib/prisma.ts:9, 12`); `global.prisma = global.prisma` no-op (`:18`) | Extra connection pool per process (Supabase connection limits) | One client/pool module |
| CQ-04 | medium | Express 4 async handlers without error forwarding: a rejected promise in e.g. `GET /profile` (`profile.ts:8-19`, no try/catch) or `PUT /posts/updateById` (`posts.ts:81-104`) becomes an unhandled rejection / hung request | Process instability, hanging clients | Framework with native async error handling (Hono/Fastify/Express 5) + central handler |
| CQ-05 | medium | Routes contain all logic (Prisma calls inline), copy-paste between `experience.ts`/`education.ts`, inconsistent naming (`Experiences` vs `Education`, `Tags` rows), `catch` blocks that answer `'Unauthorized'` for any error (`posts.ts:127`, `comments.ts:18`, `like.ts:34`), `console.log` debugging (`profile.ts:65,77,93,100`), commented-out code (`app.ts:19,28,30-32`, `auth.ts:6,13-14`) | Unmaintainable; wrong error semantics | Layering: router → validated DTO → service → repository; shared error types |
| CQ-06 | low | TS config: backend `strict` ✔ but `req.body` is `any` everywhere and non-null assertions hide failures (`profile.ts:95`, `supabase-client.ts:3-4`); `include` has trailing commas and `./*.js` (`backend/tsconfig.json:13-16`); frontend `target: es5` with `lib: esnext` and `allowJs` (`frontend/tsconfig.json:3-7`); no `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals` | Weak type safety at the boundaries | Strict preset (`@tsconfig/strictest`-like) in a shared config |
| CQ-07 | low | Lint: backend legacy `.eslintrc` (airbnb-typescript, ESLint 8), `lint` script runs `--fix` (mutates in CI); frontend relies on CRA's bundled eslint only; two different Prettier configs (`backend/.prettierrc` vs `frontend/.prettierrc`: trailing commas, arrow parens) | Inconsistent style, no enforcement | One flat ESLint config + one Prettier config at the root, enforced in CI and pre-commit |
| CQ-08 | low | Schema smells: `@@unique([id])` on primary keys (`schema.prisma:39, 65`), `viewCount` never written, `isPublic` never read, `Profile.authorEmail` as the identity key, `Experiences.to`/`Education.to` NOT NULL while `current=true` implies no end date | Confusing model, impossible states | Redesign in Drizzle schema (nullable `ended_at`, `users` table) |
| CQ-09 | medium | **react-query cache key collision**: `usePost` uses `["posts", id]` and `usePostByProfileId` uses `["posts", profileId]` (`hooks/post/usePost.ts:5`, `usePostByProfile.ts:5`) — post *n* and the post list of profile *n* share one cache entry (a `Post` object vs a `Post[]`) | verified by grep | Admin Posts table can render a single post object (or the detail page an array) after navigation; intermittent "undefined" crashes | Hierarchical keys (`['posts', 'detail', id]`, `['posts', 'byProfile', profileId]`) via query-key factories |
| CQ-10 | medium | Socket listener registered in a `useEffect` whose dependency changes on every toggle and never removed (`pages/post/Posts.tsx:37-44`); `signInWithOAuth()` called without `await` so its `catch` is unreachable (`Signin.tsx:126-139`); `useCallback` with a missing dependency (CRA build warning `Signin.tsx:152`) | code + CRA build log (`appendix/run-as-is.md` §3.3) | Duplicate handlers, swallowed OAuth errors | Effects with cleanup; awaited async handlers; lint rules enforced |
| CQ-11 | medium | **Mass assignment from the client**: `PUT /posts/updateById` and `PUT /profile/updateById` are sent the *entire* loaded object (`reset(initialValues)` → form state includes `id, createdAt, updatedAt, viewCount, profile, comments, likes, authorEmail, experiences…`) (`PostForm.tsx:56-59, 81-97`, `ProfileForm.tsx:65-84`) and the server destructures what it wants without a schema | code | Works by luck; any new server field becomes client-writable | DTO schemas (Zod) on both sides; `pick` before sending |
| CQ-12 | low | UI bugs: Education table headers say "Company"/"Location" for degree/field of study (`EducationList.tsx:120-125`); Bio field error prints the Company error (`ProfileForm.tsx:161`); `FormErrorMessage` rendered outside any `FormControl` so comment-form errors never show (`CommentForm.tsx:89`); `AddModal` errors reference `errors.inputs[index]` which never exists; `PostForm` header says "Add Post" in edit mode; `Developers` destructures `company`/`website` and never renders them | code | Visible defects | Fixed in the rewrite |
| CQ-13 | low | **Undefined design tokens**: 27 uses of `color="muted"` plus `primary*`, `surface`, `dark-sm`, `md-dark` with the stock Chakra theme (no `extendTheme` anywhere) — they resolve to invalid CSS and silently inherit | `grep -rn muted frontend/src` = 27; `grep extendTheme` = 0 | Inconsistent typography/colours vs the intended design (copied from Chakra Pro templates) | Semantic tokens defined once in the new theme |
| CQ-14 | low | Dead links/pages: footer "Licence" → `/license` (no route), sidebar "404 Page" → `/404`, inert "Help" cards without `href`, footer "Github" → `https://github.com/` | `Footer.tsx:18-27`, `AdminLayout.tsx:26`, `pages/admin/Post.tsx:79-83` | Broken navigation | Removed/fixed (FEATURES MK-07) |
| CQ-15 | low | Frontend `any` everywhere at the boundaries (`CustomAvatar` props, `catch (error: any)`, `(location as any)`, `(notification: any)`), `!` assertions (`session?.user?.email!`, `profile?.id!`), `console.log` left in, `alert()` for errors | `CustomAvatar.tsx:5, 27, 60-61`, `Signin.tsx:54`, `Nav.tsx:30`, `DangerZone.tsx:92` | Runtime errors hidden from the type checker | Strict TS with typed API client |
| CQ-16 | low | Further frontend quality findings from the static sub-audit (FE-xx) are in §11 | | | |

## 5. Tests

| ID | Sev | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| TST-01 | high | Backend: 4 tests, all on the hello/404 routes (`backend/test/*.test.ts`); **zero** coverage of any business rule or auth; tests import `app.ts` which eagerly creates a Socket.IO server and loads `.env` | A change in any route is unverifiable | Vitest unit tests for services, Supertest/Hono `app.request` integration tests on a Testcontainers Postgres, Playwright E2E on critical paths (brief) |
| TST-02 | high | Frontend: the only test asserts `/learn chakra/i` text that does not exist in `App` (`frontend/src/App.test.tsx:8`) and renders the full app (router + Supabase client reading `process.env` at import) → **fails by construction**; empirically it fails even earlier because CRA 5's Jest 27 cannot parse axios 1.x's ESM entry (`appendix/run-as-is.md` §3.3) | CI never ran it, so nobody noticed | Component tests with Vitest + Testing Library, MSW for the API |
| TST-03 | medium | No test data strategy: seed creates profiles without auth users; no factories | — | Seed + factories shared by tests and dev |
| TST-04 | medium | CI runs **no** tests, lint or typecheck (CI-01) | — | Gate every PR |

## 6. Performance

| ID | Sev | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| PERF-01 | medium | `GET /posts` returns **all** published posts with all comments (each with a full profile) and all likes; pagination is client-side `slice` (`posts.ts:7-34`, `frontend/src/pages/post/Posts.tsx:21-35`) | Payload grows O(posts × comments); unusable past a few hundred posts | Keyset/offset pagination server-side; counts via aggregates |
| PERF-02 | medium | **No indexes on foreign keys** (Postgres does not create them): `Post.profileId`, `Comment.postId/profileId`, `Like.postId/profileId`, etc. (migrations create only PK/unique) | Sequential scans on every list/cascade | Index every FK and `(post_id, created_at)` |
| PERF-03 | low | Socket.IO connection opened at module import for every visitor (`frontend/src/utils/constants.ts:29`); `morgan('dev')` in production; Prisma pool defaults against Supabase's small connection limit | Idle connections, noisy logs | SSE on demand; pino; pool sizing |
| PERF-04 | low | Avatars downloaded as blobs per component instance (`ProfileAvatar.tsx:14-30`), N+1 storage requests on lists; no HTTP caching | Slow lists | Plain `<img>` URLs with `Cache-Control`, resized variants |
| PERF-05 | medium | Frontend bundle: **615 kB gzip / 2.5 MB raw single `main.js`** (CRA warns "significantly larger than recommended"), no route-level code splitting, `moment` (+locales) and `date-fns` both, `react-icons` full-set imports, framer-motion for page fades, Novu widget always bundled; 14 MB of source maps shipped in `build/` | `appendix/run-as-is.md` §3.3 (build output) | Slow first load, especially on mobile | Vite + route-level code splitting (target < 200 kB gzip initial), one date lib, icon tree-shaking, lazy notification popover |
| PERF-06 | low | `viewCount` exists but is never incremented; no caching layer anywhere (fine at this scale) | Dead column | Drop or implement |

## 7. Accessibility

Frontend-only; Chakra v2 gives good defaults (focus rings, dialog focus traps, form labels). Known issues from first-hand reading; the complete list is in the FE findings (§11).

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| A11Y-01 | medium | Avatar upload is a `visibility:hidden; position:absolute` file input with no visible control (`CustomAvatar.tsx:94-104`); the "Upload" button is a `<label>` around it in `ProfileForm` — keyboard users cannot reach it reliably; errors via `alert()` (`:61`) | Native accessible file button; inline error text |
| A11Y-02 | low | Broken `aria-label` strings `"'Like Button"`, `"'Chat Button"` (`LikeButton.tsx:63`, `Posts.tsx:121`) | Meaningful labels ("Like this post", "Open comments") |
| A11Y-03 | low | Post-type badge colour is **random on every render** (`getRandomColor()`, `Posts.tsx:98`) and conveys the type by colour + text | Stable colour map per type |
| A11Y-04 | low | Two `<FormLabel htmlFor="email">` / `id="email"` pairs rendered in the same page (two forms in tabs, `Signin.tsx:199-209, 262-270`) → duplicate ids | Unique ids per form |
| A11Y-05 | low | Cookie banner text promises "third-party cookies … personalize ads" which the app does not do (`CookieBanner.tsx:35-37`) | Truthful text |
| A11Y-06 | high | From the sub-audit (FE-41..44): unlabeled account/hamburger menu buttons, `menuitem` nested in `<a>`, inputs with placeholders only, `FormErrorMessage` that never renders, no `h1`/landmarks, contrast failures for small gray text in dark mode, animations without `prefers-reduced-motion` | Mantine primitives (labelled by default) + jsx-a11y lint + Playwright axe checks on the main screens |

## 8. Developer experience

| ID | Sev | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| DX-01 | high | **No reproducible local setup**: root README is one line (`README.md`), `backend/README.md` is Prisma notes (with the password), no `.env.example`, env var names only discoverable by grepping, local dev assumed a Supabase project or CLI stack (local `.env` points at `supabase-demo` keys) | New contributor cannot run the app; the brief's "3 commands" goal is impossible today | Root README + `.env.example` + `docker compose up` |
| DX-02 | medium | Dangerous npm scripts: `db:seed` runs `prisma migrate dev --name init` (creates a **new migration on every run**) then seeds; `generate` runs `prisma migrate reset --preview-feature` (destructive; flag removed in Prisma ≥3) (`backend/package.json:12-13`) | Accidental data loss / migration spam | `db:migrate`, `db:seed`, `db:reset` (dev-only guard) |
| DX-03 | medium | No Node version pin (`.nvmrc`/`engines`), no `.editorconfig`, no `.gitattributes` (→ REC-01), no pre-commit hooks, no workspace tooling, two Prettier configs | Drift between machines (the CRLF incident) | Pinned toolchain via `packageManager` + `.nvmrc` + hooks |
| DX-04 | low | Hard-coded values: Novu `applicationIdentifier` (`Nav.tsx:93`), `io("http://localhost:8080")` (`WebSocket.tsx:5`), seed e-mails, default login | Config scattered in code | Typed env module |
| DX-05 | low | Frontend `.env.development` committed with `REACT_APP_BACKEND_URL` while `.env` is ignored; backend `.env` loaded via `require('dotenv').config()` inside `app.ts` (`:12`) | Confusing precedence | `.env.example` + runtime config |

## 9. CI/CD

| ID | Sev | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| CI-01 | high | The only workflow **deploys to production on every push of every branch** (`on: [push]`, `.github/workflows/main.yml:2`) with **no lint, typecheck, test or build gate** | A typo on a feature branch ships to Fly | `ci.yml` on PR + main: lint → typecheck → test → build → image; deploy is a separate, manual/tagged step (and out of scope: Fly removed) |
| CI-02 | medium | Mutable / outdated actions: `superfly/flyctl-actions/setup-flyctl@master` (`:35, 45`) is a floating ref (supply-chain), `actions/checkout@v3` (`:19, 34, 44`) and `dorny/paths-filter@v2` (`:20`) are deprecated Node 16 actions | Breakage or compromise via upstream changes | Pin actions to major tags or SHAs; current majors |
| CI-03 | medium | Secrets exported at workflow level as `env` (`:4-8`) and passed as `--build-arg` (`:48-50`) | Leak into logs/image history; anon key doubles as DB key (SEC-03) | Runtime config; no secrets in build args |
| CI-04 | low | No concurrency group, no caching, no artifacts, no status badges, no Gitea compatibility | Slow, duplicate deploys on rapid pushes | Single workflow compatible with GitHub + Gitea Actions (brief) |

## 10. Infrastructure & deployment

| ID | Sev | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| INF-01 | high | **EOL base images**: `node:16-bullseye-slim` (Node 16 EOL 2023-09-11; Debian 11 LTS ended 2026-08-31 and its security pool now returns 404 → the image **cannot be rebuilt**, REC-06), `node:17-alpine` (odd release, EOL 2022-06-01; build fails on `bufferutil`), `nginx:1.19` (superseded 2021) (`backend/Dockerfile:2`, `frontend/Dockerfile:1, 21`) | Unpatched runtime CVEs in production; no way to ship a fix | `node:26-alpine` (Active LTS 2026-10-28); serve the SPA from the API container or a current nginx |
| INF-02 | medium | Backend image: `npm install` (not `ci`, `:14`), Prisma engines hand-copied (`:52`), final `ADD . .` (`:57`), runs as **root**, no `HEALTHCHECK`, amd64 only | Non-reproducible builds, large image, weak isolation | Multi-stage with `pnpm fetch`/`deploy`, distroless-ish `node:26-alpine`, non-root `USER`, healthcheck, `linux/amd64,arm64` via buildx |
| INF-03 | medium | Frontend image: `npm install` (`frontend/Dockerfile:17`), secrets as build args (`:5-11`), nginx without security or cache headers, `worker_processes 1` (`nginx.conf:1, 9-22`) | Non-reproducible, insecure defaults | One app image serving `dist/` with immutable cache headers; TLS/headers at Nginx Proxy Manager |
| INF-04 | medium | Fly config: TCP checks only (`backend/fly.toml:33-37`), `hard_limit = 25` connections (`:23`), no `release_command` → migrations run **from a laptop against production** (`backend/README.md:9-16`) | No real health checking; schema drift risk; SaaS lock-in (Fly + Supabase + Novu) | Compose-based deploy, migrations by the app on start, `/health` + `/ready` |
| INF-05 | medium | No local orchestration (no compose), no backup/restore procedure, no log aggregation, no metrics | Operability is manual | `compose.yml` (dev) + `compose.prod.yml`, documented `pg_dump` backups, pino JSON logs |
| INF-06 | low | Two separately deployed origins (SPA on nginx, API on another host) force CORS and cross-site cookies | Complexity and the SEC-07 wildcard | Same-origin: `/api/*` reverse-proxied next to the SPA |

## 11. Frontend sub-audit (FE findings)

Source: `appendix/audit-frontend.md` (static sub-audit of the frontend, 46 findings, every claim with `file:line`; its "Fix" columns describe in-place repairs and are superseded by the rebuild in `TARGET.md`). Independent reading that converges with §2–§10: its top 3 are SEC-02, SEC-03 and REC-02. Spot-checked items all held. Counts: **critical 3 · high 14 · medium 25 · low 4**; explicit "no finding" for XSS vectors (no `dangerouslySetInnerHTML`, all user content rendered as text), third-party scripts, service worker, HTTP method mismatches.

| ID | Sev | Finding (frontend evidence) | Cross-ref |
|---|---|---|---|
| FE-01 | critical | WIP `package.json` declares Chakra 3 / web-vitals 5 / framer-motion 12 / TS 5.9 against v2-era source; lock byte-identical to HEAD → cannot install or build | REC-02, DEP-04 |
| FE-02 | critical | 9 of 11 mutating calls send no credentials; the client supplies its own `profileId`; only `addPost`/`deleteProfile` send `Authorization: token …` | SEC-02, ARC-01 |
| FE-03 | critical | anon key in the bundle + `GRANT ALL … TO anon` → PostgREST read/write unless RLS is enabled | SEC-03 |
| FE-04 | high | sign-in form pre-filled with `janedane@gmail.com` / `123456` | SEC-15 |
| FE-05 | high | every user's e-mail rendered on public pages (Developers, comments, feed) and broadcast over sockets; `isPublic` switch has no consumer | SEC-09 |
| FE-06 | high | socket opened at import for every visitor; unauthenticated; drafts and full profiles broadcast to all | ARC-03, SEC-16, PERF-03 |
| FE-07 | high | anonymous arbitrary-file uploads to the bucket, no client validation, `Math.random()` names, per-component blob downloads never revoked | SEC-04, PERF-04 |
| FE-08 | high | Novu feed readable by guessing sequential `subscriberId` (no HMAC `subscriberHash`); identifier hard-coded; `"undefined"` subscriber while loading | — (Novu removed) |
| FE-09 | high | react-query key collision `["posts", id]` vs `["posts", profileId]` (also `["users", id]` vs `["users", query]`) → wrong-shaped cache data, crash on post page | CQ-09 |
| FE-10 | high | fake features shipped as real: password change stub, mock Users/Dashboard/Search, inert Connect/Google/Twitter | FEATURES MK-01..06 |
| FE-11 | high | profiles created before verification and replayed on every GitHub auth event (`INITIAL_SESSION`, `TOKEN_REFRESHED`…) | ARC-02, SEC-18 |
| FE-12 | high | auth bootstrap failure = blank page (`throw` in un-awaited async, `loading` never false); env misconfig throws at import (`createClient(undefined)`) | REC-07 |
| FE-13 | high | non-standard `Authorization: token …`, `"token undefined"` when logged out, no 401 handling anywhere | SEC-05 |
| FE-14 | high | CI deploys every push of every branch with no checks; `@master` action | CI-01, CI-02 |
| FE-15 | medium | Dockerfile: EOL `node:17-alpine`/`nginx:1.19`, `npm install`, no healthcheck, toolchain in `dependencies` | INF-01, INF-03 |
| FE-16 | medium | nginx: no security headers/CSP, no cache policy, `server_tokens` on, SPA fallback answers 200 for missing assets | SEC-12 |
| FE-17 | medium | cookie banner claims third-party/ad cookies that do not exist; consent gates nothing; `localStorage` read during render without try/catch (crashes when storage is blocked); Privacy/Terms are template text with "contact us at ..." | A11Y-05, FEATURES UX-02 |
| FE-18 | medium | e-mails in URL paths unencoded; API `200 {error}` responses trusted as data (`reset(profile)` fills the form with `{error}`) | SEC-19, SEC-10 |
| FE-19 | low | post-login redirect from `location.state` — pathname-only, not exploitable, but unvalidated `any` | SEC-20 |
| FE-20 | high | socket listeners leak (effect without cleanup, stale `useCallback`), chip toggles twice; `get-users` listener re-registered on every login | CQ-10 |
| FE-21 | medium | `AddModal` validation wired to a non-existent `errors.inputs`; duplicate React keys; Education table columns mislabelled; two 95 %-identical list components | CQ-12 |
| FE-22 | medium | `likeApi` wraps errors in `new AxiosError(error)`; network failure → `TypeError` inside `onError` | CQ-15 |
| FE-23 | medium | sign-in flow: magic-link toast says "Account confirmed." then navigates into `RequireAuth` bounce; `signInWithOAuth` not awaited; boolean rendered as button label; duplicate `id="email"`; no deep link to register mode | CQ-10, A11Y-04 |
| FE-24 | medium | `AuthProvider`: double state writes, dead `localStorage.removeItem('user')`, "Signed in" toast on every page refresh with supabase-js 2.8, `children: any` | — |
| FE-25 | medium | `DangerZone` can send `DELETE /profile/delete/undefined`; `type="submit"` outside a form | — |
| FE-26 | medium | `ProfileForm`: bio error shows company error; `website` required without URL validation and never displayed; `reset(profile)` dumps nested objects into the form and back to the server; `<label>` nested in `<Button>` | CQ-11, CQ-12 |
| FE-27 | medium | index keys on lists; random colours per render; `truncate` adds "…" to 3-char strings; `"1–NaN of undefined"` pagination while loading | A11Y-03 |
| FE-28 | medium | Chakra Pro tokens (`muted`, `primary*`, `surface`, `dark-sm`, `md-dark`) with the stock theme → invalid CSS silently dropped; `useMultiStyleConfig("Navbar")` undefined | CQ-13 |
| FE-29 | medium | `ColorModeScript` inside the React tree (flash), CRA default manifest "React App", static `document.title` | FEATURES UX-10 |
| FE-30 | medium | `Navbar` reads layout during render and re-renders per scroll frame; removed framer-motion API | — |
| FE-31 | medium | dead code and template leftovers (InnerLayout, ColorModeSwitcher, Brand, eventBus, WebSocket page, serviceWorker, `/404` link, `/license`, href-less Help links, "© 2023") | CQ-14, FEATURES §11 |
| FE-32 | medium | copy-paste duplication (lists, tables, confirm dialogs ×3, 20+ copies of the generic error string, `useProfile` re-derived in 9 components) | CQ-05 |
| FE-33 | medium | `strict` undermined: 27 `any`, ~25 `!`, `any` props; no `lint`/`typecheck` scripts; no strict flags | CQ-06, CQ-15 |
| FE-34 | low | Prettier not applied (440 double-quoted imports vs `singleQuote`), removed option `jsxBracketSameLine`, mixed indentation/semicolons, CRLF churn | REC-01, CQ-07 |
| FE-35 | low | `console.log`/`alert` left in; hook file names ≠ exports; `Comment` type shadows the DOM global | — |
| FE-36 | high | the only test asserts template text, cannot load its module graph (Supabase client throws at import), 0 % coverage of critical paths | TST-02 |
| FE-37 | medium | single ~1 MB chunk: no code splitting, moment + date-fns, two react-query copies (Novu bundles TanStack + Mantine 5), framer-motion for a fade, 5 icon packs | PERF-05 |
| FE-38 | medium | react-query defaults (`staleTime 0`, refetch on focus) + `useProfile` mounted in 9 places + 5 LikeButtons → refetch storms; whole dataset fetched to render `.length` | PERF-01 |
| FE-39 | medium | startup blocked on auth for public routes; avatars fetched N times; blob URL leak; infinite animation without `prefers-reduced-motion` | PERF-04 |
| FE-40 | low | Fly `[[statics]]` bypasses nginx (gzip/headers only on misses); `kill_signal = "SIGINT"` | INF-04 |
| FE-41 | high | unlabeled icon-only menu buttons (account menu, hamburger), stray-quote `aria-label`s, disabled button inside Tooltip unreachable, `button[role=menuitem]` nested in `<a>`, theme toggle label never reflects state | A11Y-02 |
| FE-42 | medium | inputs without labels (placeholders only), `FormErrorMessage` outside `FormControl` never renders, hidden file input unreachable, no `type="email"`/`autoComplete`, ✅/❌ emoji without text | A11Y-01 |
| FE-43 | medium | no `h1`, no `<nav>`/`<main>` landmarks, `<p>` inside `<h2>`, decorative SVGs not hidden, no skip link, static title | — |
| FE-44 | medium | contrast failures (`gray.600` 12 px on `gray.800`; white on `gray.400` button), motion everywhere without reduced-motion handling | — |
| FE-45 | medium | ad-hoc env reads with `!`, no `.env.example`, CRA boilerplate README, wrong `WARP.md` claims, missing `.gitattributes`/`.nvmrc`/`.editorconfig`, stray root lockfile and `.vscode` | DX-01, DX-03, DX-05 |
| FE-46 | medium | CRA toolchain EOL and unable to host the declared upgrades (peer conflict with TS 5) | DEP-02 |

The sub-audit's verdict matches §12: nothing in the frontend survives as code; it is a precise specification of the product to rebuild.

---

## 12. Verdict

**Worth keeping**
- The **product**: the feature set and flows in `FEATURES.md` (profiles with skills/experience/education, posts with types/tags/comments/likes, developers directory, notification bell, dark mode, cookie banner, static pages). The UX is coherent and small enough to re-implement 1:1.
- The **data model shape** (entities and relations), with fixes: a real `users` table, `UNIQUE(post_id, user_id)` on likes, tags/skills as arrays or junction tables, nullable end dates, indexes on FKs.
- The **UI copy, routes and layout structure** (landing vs admin shell, navbar/menu composition, cards, tables, forms) as the visual reference for parity. Individual components are **not** reusable as code (Chakra v2 API, react-query v3 hooks, `any`-typed props) but they are a precise spec.
- Seed personas (Hulk Green & co.) for a friendly demo dataset.

**Must be rewritten (everything else)**
- **Backend: 100 %.** ~600 lines, every route lacks authorization and validation, the realtime and notification paths are client-authoritative, the ORM layer has a data-corruption bug, and the framework/ORM/runtime are all being replaced. There is nothing to port line-by-line; the API table in FEATURES §3 is the contract.
- **Auth, storage, notifications, realtime**: replaced by first-party implementations per the brief (sessions + argon2id, local files + sharp, notifications table + SSE/LISTEN-NOTIFY + SMTP).
- **Frontend toolchain and libraries**: CRA → Vite, Chakra v2 → current UI kit, react-query 3 → TanStack Query 5, react-router 6 → current router, axios → typed fetch client, moment → one date library; TypeScript strict; tests that run.
- **Delivery**: Dockerfiles, compose, CI (gated, Gitea-compatible, multi-arch), docs, env handling — all new.

**Immediate actions independent of the rebuild** (user-side, cannot be done by this mission): revoke the leaked DB password (SEC-01); check/enable RLS on the 8 public tables (SEC-03); delete the `janedane@gmail.com` test account (SEC-15); rotate the Novu key. The Fly deploy pipeline should be disabled (CI-01) if anyone pushes to that repo before cut-over.

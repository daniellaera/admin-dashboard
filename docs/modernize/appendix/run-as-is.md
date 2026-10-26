# Run-as-is report: test-dashboard (Express + Prisma backend, CRA + Chakra frontend)

Date: 2026-10-26. Empirical run of two throwaway snapshots, no source files modified
(only `backend/.env` with dummy local values was created in each snapshot).

- **A = committed state (origin/main)**: `/private/tmp/claude-501/-Users-daniellaera-dev-git-repos-test-dashboard/4107091c-cf07-44b4-b67f-b25fe04ab89a/scratchpad/head-main`
- **B = uncommitted working tree**: `/private/tmp/claude-501/-Users-daniellaera-dev-git-repos-test-dashboard/4107091c-cf07-44b4-b67f-b25fe04ab89a/scratchpad/dirty-tree`
- Raw logs for every step: `/private/tmp/claude-501/-Users-daniellaera-dev-git-repos-test-dashboard/4107091c-cf07-44b4-b67f-b25fe04ab89a/scratchpad/agent-out/` (file names cited per step below). Drivers used: `backend-chain.sh`, `boot.sh`, `probes.sh`, `frontend-chain.sh` in the same folder.

Legend: **OK** / **FAIL** / **SKIPPED** / **WORKAROUND** (= step only possible after deviating from the as-is state; the deviation is named).

---

## 1. Summary matrix

| Step | A (committed) | B (uncommitted) |
|---|---|---|
| Backend `npm ci` | **OK** - 5 s, 655 pkgs | **FAIL** - `ERESOLVE`: `eslint-config-airbnb-typescript@18` needs `@typescript-eslint/eslint-plugin@^7`, package.json has `^8.48.1` |
| Backend fallback `npm install --package-lock=false` | SKIPPED (not needed) | **FAIL** - same `ERESOLVE` (1 s) |
| Backend WORKAROUND `--legacy-peer-deps` | n/a | **WORKAROUND OK** - 17 s, 803 pkgs (prisma 7.10.1, express 5.3.0, eslint 9.39.5, jest 30.5.2). Every B backend row below ran on this install |
| `prisma generate` | **OK** - Prisma 4.11.0, 291 ms | **FAIL** - P1012: `url`, `directUrl`, `shadowDatabaseUrl` "no longer supported in schema files" (Prisma 7 wants `prisma.config.ts`) |
| `prisma migrate deploy` | **OK** - 14 migrations applied to empty DB | **FAIL** - same P1012; never reaches the (missing) migrations folder |
| `prisma migrate status` | **OK** - "Database schema is up to date!" | **FAIL** - same P1012. WORKAROUND (A's 14 migrations copied in, then removed): identical P1012 |
| `prisma db seed` | **OK** - 4 profiles + 6 posts via `ts-node prisma/seed.ts` | **FAIL (silent, exit 0)** - "No seed command configured": Prisma 7 ignores `package.json#prisma.seed`; nothing seeded |
| `tsc --noEmit` (backend) | **OK** - 0 errors (TS 4.9.5) | **FAIL** - 2 errors: `like.ts(30,22)` implicit any; `lib/prisma.ts(1,10)` `PrismaClient` not exported (client never generated) |
| `eslint src test` (no --fix) | **OK** - 0 problems (eslint 8.34.0, `.eslintrc` honoured) | **FAIL** - ESLint 9.39.5: "couldn't find an eslint.config.(js|mjs|cjs) file"; `.eslintrc` ignored |
| `npm test -- --ci --watchAll=false` | **OK** - 2/2 suites, 4/4 tests (1.3 s) | **FAIL** - 2/2 suites fail to compile (TS2305 `PrismaClient`), 0 tests run |
| `npm run build` (tsc) | **OK** - `dist/src/**` emitted | **FAIL (exit 2)** - same 2 TS errors, but `dist/` is still emitted (`noEmitOnError` default false) |
| Server boot `npx ts-node src/index.ts` | **OK** - "Listening: http://localhost:18080" in ~2 s | **FAIL** - ts-node `TSError ... src/lib/prisma.ts(1,10): TS2305`, process exits; no probes possible |
| Probes: read endpoints (`/`, `/api/v1`, emojis, posts, profile, experience, education, findProfileByEmail, post/1) | **OK** - all 200 with expected JSON | SKIPPED (no server) |
| Probes: `post/abc` non-numeric id | **OK-ish** - 200 `{"error":"Post with ID abc does not exist..."}` (no 500, but wrong status) | SKIPPED |
| Probes: auth on `POST /posts/create` | **OK** - 401 without token, 400 with `Bearer not-a-jwt` | SKIPPED |
| Probes: unauthenticated mutations | **SECURITY FAIL** - comment create 200, like create 200, post update 200 (`HACKED` persisted), profile update 200 (`owned` persisted), post delete 200 (row gone) | SKIPPED |
| Probes: malformed JSON / unknown route | **LEAKS** - 500 and 404 bodies include full stack traces with absolute paths (dev mode) | SKIPPED |
| Probes: CORS / headers | `Access-Control-Allow-Origin: *` for `https://evil.example`; helmet 6 headers present; no `X-Powered-By` | SKIPPED |
| Frontend `npm ci` | **OK** - 7 s, 1660 pkgs (warm cache) | **FAIL** - `EUSAGE` lock out of sync (~200 invalid/missing entries, e.g. lock `@chakra-ui/react@2.5.1` vs `^3.30.0`) |
| Frontend fallback `npm install --package-lock=false` | SKIPPED (not needed) | **FAIL** - `ERESOLVE`: `react-scripts@5.0.1` peerOptional `typescript@^3.2.1 \|\| ^4` vs `typescript@5.9.3` |
| Frontend WORKAROUND `--legacy-peer-deps` | n/a | **WORKAROUND OK** - 17 s, 1690 pkgs (@chakra-ui/react 3.37.0, react-router-dom 7.18.4, TS 5.9.3). Every B frontend row below ran on this install |
| Frontend `tsc --noEmit` | **OK** - 0 errors | **FAIL** - 377 errors (Chakra v2 -> v3 API, web-vitals v5, @testing-library/react v16) |
| Frontend `CI=true react-scripts test` | **FAIL** - Jest cannot parse `node_modules/axios/index.js` (ESM `import`), 1 suite failed, 0 tests ran | **FAIL** - "Cannot find module '@testing-library/dom'" (peer dep not installed under legacy-peer-deps) |
| Frontend `npm run build` | **OK** - 15 s, "Compiled with warnings" (1 ESLint warning + 159 source-map warnings); 615 kB gzip main bundle; `build/` 17 MB (14 MB are source maps) | **FAIL** - crashes in 1 s before compiling: `Cannot find module 'ajv/dist/compile/codegen'` (ajv-keywords 5 vs hoisted ajv 6.15.0) |
| Frontend serve `build/` | **OK** - index.html 200 (title "DevConnector"), `main.db7cb631.js` 200 / 2,503,369 bytes | SKIPPED (no build) |
| Docker build backend (A only) | **FAIL** - 5 s: `apt-get install openssl` on `node:16-bullseye-slim` -> 404 from `bullseye-security` pool (exit 100) | not requested |
| Docker build frontend (A only) | **FAIL** - 18 s: `npm install` in `node:17-alpine` -> `bufferutil` node-gyp "Could not find any Python installation" | not requested |
| Docker run backend image | SKIPPED - no image built. Substitute: ran `NODE_ENV=production node dist/src/index.js` on host (the Dockerfile CMD): boots, stacks hidden (`"stack":"🥞"`), crashes on SIGTERM (Prisma 4.11 exit hook vs Node 24) | not requested |

Bottom line: **A boots and serves everything (with the security problems listed in section 4); B boots nothing** - neither backend nor frontend can even be installed as-is, and with `--legacy-peer-deps` forced, the backend is stopped by Prisma 7 schema validation and the frontend by Chakra v3 / CRA 5 dependency breakage.

---

## 2. Environment

| Item | Value |
|---|---|
| OS / arch | macOS 27.0.1 (Darwin 27.0.0), arm64 (Apple Silicon) |
| Node / npm | v24.16.0 (nvm) / 11.13.0 |
| Docker | Docker Desktop 29.9.2 (client and server), aarch64 |
| curl / python3 | curl 8.7.1 / Python 3.14.2 (python3 used only as a static file server for `build/`) |
| Database | `postgres:15-alpine` containers: `asis-pg-A` -> `127.0.0.1:58596`, `asis-pg-B` -> `127.0.0.1:58597`; DB `app` + `shadow` |
| GNU `timeout` | not present on macOS; the 8-minute docker cap was implemented with `perl -e 'alarm 480; exec @ARGV' docker build ...` |
| Backend `.env` (created, both snapshots, local dummies only) | `DATABASE_URL`/`DIRECT_URL`=`postgresql://postgres:postgres@127.0.0.1:<port>/app?schema=public`, `SHADOW_DATABASE_URL`=`.../shadow?schema=public`, `SUPABASE_JWT_SECRET=dummy-local-secret-not-real`, `SUPABASE_SERVICE_ROLE=dummy`, `REACT_APP_SUPABASE_URL=http://127.0.0.1:9`, `NOVU_API_KEY=dummy`, `PORT=18080` (A) / `18081` (B) |

Safety: no host other than 127.0.0.1 was contacted for DB/Supabase/Novu. The only `supabase.co` strings in the snapshots are in `backend/README.md` and `backend/src/scripts/supabase.sql` (documentation), never in an env file used here. Nothing was pushed, deployed or run against the real repository.

Resolved versions actually exercised:

| Package | A backend | B backend (after workaround) | | A frontend | B frontend (after workaround) |
|---|---|---|---|---|---|
| prisma / @prisma/client | 4.11.0 / 4.11.0 | 7.10.1 / 7.10.1 | react / react-dom | 18.2.0 | 18.3.1 |
| express | 4.18.2 | 5.3.0 | react-scripts | 5.0.1 (jest 27.5.1) | 5.0.1 |
| helmet / cors | 6.0.1 / 2.8.5 | 8.3.0 / 2.8.5 | typescript | 4.9.5 | 5.9.3 |
| typescript / ts-node | 4.9.5 / 10.9.1 | 5.9.3 / 10.9.2 | @chakra-ui/react | 2.5.1 | 3.37.0 |
| eslint / airbnb-ts / ts-eslint plugin | 8.34.0 / 16.2.0 / 5.52.0 | 9.39.5 / 18.0.0 / 8.72.0 | react-router-dom | 6.8.1 | 7.18.4 |
| jest / ts-jest | 29.4.3 / 29.0.5 | 30.5.2 / 29.4.15 | axios | 1.3.3 | 1.20.0 |
| @supabase/supabase-js | 2.8.0 | 2.118.0 | @supabase/supabase-js | 2.8.0 | 2.118.0 |
| @novu/node | 0.12.0 | 2.6.6 (EOL 2025-03-20 per npm deprecation) | @novu/notification-center | 0.12.0 | 2.0.0 |
| socket.io / jsonwebtoken | 4.6.1 / 9.0.0 | 4.8.4 / 9.0.3 | @testing-library/react | 13.4.0 | 16.3.3 |

What actually differs between A and B at content level (most B files differ only by CRLF line endings): `backend/package.json` and `frontend/package.json` (major bumps), `backend/prisma/schema.prisma` (adds `directUrl`, `shadowDatabaseUrl`), `backend/prisma/seed.ts` (`create` -> `upsert`), `backend/src/api/like.ts` (extra `existingLike` lookup whose check `existingLike?.createdAt === null` can never be true), `backend/src/api/posts.ts` (adds `router.use("/fetchByDateArrow/:postId", auth)` for a route that does not exist), `backend/src/api/profile.ts` (adds `isPublic` to update), 9 frontend `.tsx` files, and the deleted `backend/prisma/migrations/` (14 migrations). B also adds `WARP.md`, `.vscode/settings.json`, and an empty root `package-lock.json`.

---

## 3. Detailed results

### 3.1 Snapshot A - backend (`head-main/backend`)

| # | Command | Result | Notes / log |
|---|---|---|---|
| 1 | `npm ci --no-audit --no-fund` | OK, 5 s | "added 655 packages"; 1 warning: `@types/socket.io@3.0.2` is a stub. `backend-A-npm-ci.log` |
| 2 | `npx prisma --version` | OK | prisma 4.11.0, @prisma/client 4.11.0, darwin-arm64 engines; prints "Environment variables loaded from .env". `backend-A-prisma-version.log` |
| 2b | `npx prisma generate` | OK, 1 s | "Generated Prisma Client (4.11.0 \| library) ... in 291ms"; banner "Update available 4.11.0 -> 8.0.0-rc.27". `backend-A-prisma-generate.log` |
| 3 | `npx prisma migrate deploy` | OK, 1 s | "14 migrations found", all 14 applied (`20230203170229_init` ... `20230312160018_add_post_tags`). `backend-A-prisma-migrate-deploy.log` |
| 3b | `npx prisma migrate status` | OK | "Database schema is up to date!" |
| 4 | `npx prisma db seed` | OK, 1 s | `ts-node prisma/seed.ts` -> "Created user with id: 1..4", "Seeding finished." `backend-A-prisma-db-seed.log` |
| 5 | `npx tsc --noEmit` | OK | 0 errors (empty log) |
| 6 | `npx eslint src test` | OK | 0 errors / 0 warnings, exit 0 (eslint 8.34.0 with `.eslintrc`, airbnb-typescript/base) |
| 7 | `npm test -- --ci --watchAll=false` | OK, 2 s | `PASS test/api.test.ts`, `PASS test/app.test.ts`; "Tests: 4 passed, 4 total". `backend-A-jest.log` |
| 8 | `npm run build` (`tsc`) | OK | emits `dist/src/{api,config,functions,interfaces,lib,middleware}`, `dist/src/index.js`, `dist/test/` |
| 9 | `nohup npx ts-node src/index.ts > agent-out/backend-A.log 2>&1 &` | OK | "Listening: http://localhost:18080" after ~2 s; full probe results in 3.2 and `probes-A.txt`; server killed afterwards, no listener left |
| extra | `NODE_ENV=production PORT=18082 node dist/src/index.js` (= Dockerfile `CMD`) | OK boot | `GET /api/v1/doesnotexist` -> 404 `{"message":"🔍 - Not Found - /api/v1/doesnotexist","stack":"🥞"}`; malformed JSON -> 500 `{"message":"Unexpected end of JSON input","stack":"🥞"}`. On `kill` (SIGTERM) the process logs `TypeError [ERR_INVALID_ARG_TYPE]: The "code" argument must be of type number. Received type string ('SIGTERM')` thrown from `@prisma/client/runtime/library.js` (Prisma 4.11 exit hook calls `process.exit('SIGTERM')`, rejected by Node 24). `backend-A-dist-prod.log` |

Why A boots at all although `app.ts` calls `require('dotenv').config()` *after* its imports: verified empirically that requiring only `src/config/supabase-client.ts` with no env throws `supabaseUrl is required.`, whereas requiring `src/lib/prisma.ts` alone populates `process.env.REACT_APP_SUPABASE_URL` from `.env`. `@prisma/client` 4.x auto-loads `.env` when first required, and `api/index.ts` imports `./posts` (-> `lib/prisma`) before `./profile` (-> `config/supabase-client`). The env loading therefore works only through a Prisma 4 side effect; Prisma 7 (snapshot B) no longer does this.

### 3.2 Snapshot A - live HTTP probes (dev mode, `ts-node`, port 18080)

Verbatim (bodies trimmed to 300 chars). Full text: `probes-A.txt`; server-side morgan log: `backend-A.log`.

| Probe | Status | Body (trimmed) |
|---|---|---|
| `GET /` | 200 | `{"message":"🦄🌈✨👋🌎🌍🌏✨🌈🦄"}` |
| `GET /api/v1` | 200 | `{"message":"API - 👋🌎🌍🌏"}` |
| `GET /api/v1/emojis` | 200 | `["😀","😳","🙄"]` |
| `GET /api/v1/posts` | 200 | `[{"id":6,...,"type":"FUNNY","title":"Ask a question about Prisma on GitHub",...,"profile":{"username":"Randy Smith","autho...` (6 published posts incl. nested profile/comments/likes/tags) |
| `GET /api/v1/profile` | 200 | `[{"id":1,...,"username":"Hulk Green",...,"authorEmail":"hulk@marvel.com","isPublic":false,"programmingLanguages":[]},...` (all 4 profiles incl. emails, no auth) |
| `GET /api/v1/experience` | 200 | `[]` |
| `GET /api/v1/education` | 200 | `[]` |
| `GET /api/v1/profile/findProfileByEmail/hulk@marvel.com` | 200 | `{"id":1,...,"username":"Hulk Green",...,"authorEmail":"hulk@marvel.com","isPublic":false,"experiences":[],"programmingLanguages":[]}` |
| `GET /api/v1/posts/post/1` | 200 | `{"id":1,...,"type":"FUNNY","title":"Where does it come from?",...` |
| `GET /api/v1/posts/post/abc` | **200** | `{"error":"Post with ID abc does not exist in the database"}` - `Number('abc')` = NaN, Prisma validation error swallowed; no 500, but 200 for an error |
| `POST /api/v1/posts/create` (no auth) | **401** | `{"msg":"No token, auth denied!"}` |
| `POST /api/v1/posts/create` + `Authorization: Bearer not-a-jwt` | **400** | `{"error":"Invalid token, auth denied!"}` (jwt.verify failure mapped to 400, not 401) |
| `POST /api/v1/comments/create` (no auth) `{"text":"hi","profileId":1,"postId":1}` | **200** | `{"id":1,"createdAt":"2026-10-26T16:41:36.404Z","text":"hi","postId":1,"profileId":1}` - **comment created as profile 1 by an anonymous caller** |
| `GET /api/v1/comments/commentsByPostId/1` | 200 | `[{"id":1,...,"text":"hi","postId":1,"profileId":1,"profile":{"id":1,...,"authorEmail":"hulk@marvel.com",...` |
| `POST /api/v1/likes/create` (no auth) 1st | **200** | `{"id":1,"createdAt":"...","postId":1,"profileId":1}` - **like created anonymously** |
| `POST /api/v1/likes/create` (no auth) 2nd | 400 | `{"error":"You cannot like a post twice"}` (dedupe keyed on client-supplied `profileId`) |
| `PUT /api/v1/posts/updateById/1` (no auth) title `HACKED` | **200** | `{"id":1,...,"type":"TECH","title":"HACKED","content":"c","published":true,"viewCount":0,"profileId":1}` |
| `GET /api/v1/posts/post/1` after PUT | 200 | `{"id":1,...,"title":"HACKED","content":"c",...` - **tampering persisted** |
| `PUT /api/v1/profile/updateById/1` (no auth) `{"username":"owned","programmingLanguages":[]}` | **200** | `{"id":1,...,"username":"owned",...,"authorEmail":"hulk@marvel.com","isPublic":false}` |
| `GET .../findProfileByEmail/hulk@marvel.com` after PUT | 200 | `...,"username":"owned",...` - **persisted** |
| `DELETE /api/v1/posts/deleteById/2` (no auth) | **200** | `{"id":2,...,"title":"Why do we use it?",...` - **post deleted anonymously** |
| `GET /api/v1/posts/post/2` after DELETE | 200 | `null` |
| `POST /api/v1/comments/create` body `{"text":` (malformed) | **500** | `{"message":"Unexpected end of JSON input","stack":"SyntaxError: Unexpected end of JSON input\n    at JSON.parse (<anonymous>)\n    at parse (/private/tmp/.../head-main/backend/node_modules/body-par...` - **stack trace + absolute paths leaked** |
| `GET /api/v1/doesnotexist` | 404 | `{"message":"🔍 - Not Found - /api/v1/doesnotexist","stack":"Error: 🔍 - Not Found - /api/v1/doesnotexist\n    at notFound (/private/tmp/.../head-main/backend/src/middleware/middlewares.ts:7:17)...` - **stack trace leaked** |
| `OPTIONS /api/v1/posts` with `Origin: https://evil.example` | 204 | `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE`, `Access-Control-Allow-Headers: content-type` |
| `GET /` with `Origin: https://evil.example` | 200 | `Access-Control-Allow-Origin: *` |

`GET /` response headers (verbatim): `Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests`, `Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `X-DNS-Prefetch-Control: off`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security: max-age=15552000; includeSubDomains`, `X-Download-Options: noopen`, `X-Content-Type-Options: nosniff`, `Origin-Agent-Cluster: ?1`, `X-Permitted-Cross-Domain-Policies: none`, `Referrer-Policy: no-referrer`, `X-XSS-Protection: 0`, `Access-Control-Allow-Origin: *`, `Content-Type: application/json; charset=utf-8`, `ETag`, `Connection: keep-alive`. No `X-Powered-By` header (helmet removes it).

### 3.3 Snapshot A - frontend (`head-main/frontend`)

| # | Command | Result | Notes / log |
|---|---|---|---|
| 1 | `npm ci --no-audit --no-fund --loglevel=error` | OK, 7 s | "added 1660 packages" (npm cache was warm; no network-heavy minutes). `frontend-A-install.log` |
| 2 | `npx tsc --noEmit` | OK, 3 s | 0 errors (TypeScript 4.9.5) |
| 3 | `CI=true npx react-scripts test --watchAll=false` | **FAIL**, 2 s | `FAIL src/App.test.tsx` - "Jest encountered an unexpected token ... /node_modules/axios/index.js:1 ... import axios from './lib/axios.js'; SyntaxError: Cannot use import statement outside a module" (axios 1.x ships an ESM entry; CRA 5's jest 27 does not transform `node_modules`). "Test Suites: 1 failed, 1 total; Tests: 0 total". `frontend-A-test.log` |
| 4 | `CI=false REACT_APP_BACKEND_URL=http://127.0.0.1:18080 REACT_APP_SUPABASE_URL=http://127.0.0.1:9 REACT_APP_SUPABASE_ANON_KEY=dummy npm run build` | OK, 15 s | "Compiled with warnings." Warnings: (a) 1 ESLint warning: `src/pages/auth/Signin.tsx Line 152:9: React Hook useCallback has a missing dependency: 'signInWithGithub' ... react-hooks/exhaustive-deps`; (b) 159 x "Failed to parse source map from '.../node_modules/@novu/notification-center/src/...tsx' file: Error: ENOENT" (package ships maps pointing at absent sources); (c) "Browserslist: caniuse-lite is outdated" (x2); (d) Node `[DEP0176] DeprecationWarning: fs.F_OK is deprecated`. `frontend-A-build.log` |
| 4b | "File sizes after gzip" | | `615.09 kB build/static/js/main.db7cb631.js`, `1.78 kB build/static/js/787.41975fa9.chunk.js`, `151 B build/static/css/main.cfec828a.css`; CRA adds "The bundle size is significantly larger than recommended." |
| 4c | `du -sh build` | 17 MB | `build/static/js` = 17 MB, of which 14 MB are source maps (`main.db7cb631.js.map` 14,846,234 bytes); `main.db7cb631.js` 2,503,369 bytes uncompressed |
| 5 | serve `build/` (`python3 -m http.server 18090` in `build/`; `npx serve` not used to avoid a network fetch) | OK | `curl -s localhost:18090 \| head -c 400` -> `<!doctype html><html lang="en"><head><meta charset="utf-8"/>...<title>DevConnector</title>...`; `static/js/main.db7cb631.js` -> 200, 2,503,369 bytes. Server stopped afterwards |

### 3.4 Snapshot A - Docker (`timeout 480` emulated with `perl alarm`)

| Build | Result | Detail |
|---|---|---|
| `docker build -t asis-backend-a .` (`head-main/backend`) | **FAIL after 5 s** | Stage `base`: `RUN apt-get update && apt-get install -y openssl` -> `Err:1 http://deb.debian.org/debian-security bullseye-security/main arm64 openssl arm64 1.1.1w-0+deb11u8  404  Not Found`, `E: Failed to fetch http://deb.debian.org/debian-security/pool/updates/main/o/openssl/openssl_1.1.1w-0%2bdeb11u8_arm64.deb  404  Not Found`, `E: Unable to fetch some archives` -> exit code 100. BuildKit lint warnings: `FromAsCasing` x4, `LegacyKeyValueFormat` ("ENV key value", line 46). No image produced. `docker-builds-A.log` lines 1-116 |
| `docker build --build-arg REACT_APP_BACKEND_URL=http://localhost:8080 --build-arg REACT_APP_SUPABASE_URL=http://localhost:9 --build-arg REACT_APP_SUPABASE_ANON_KEY=dummy -t asis-frontend-a .` (`head-main/frontend`) | **FAIL after 18 s** | Stage `build` (`node:17-alpine`, node v17.9.1 / npm 8.11.0): `RUN npm install` -> `npm ERR! path /app/node_modules/bufferutil ... command sh -c node-gyp-build ... gyp ERR! find Python ... Could not find any Python installation to use` (no prebuilt `bufferutil@4.0.7` binary for linux/arm64/musl + Node 17; Alpine image has no python3/make/g++). `bufferutil` is pulled in by `@supabase/realtime-js -> websocket` and `socket.io-client -> ws`. Also `npm WARN EBADENGINE @csstools/selector-specificity@2.1.1 required node ^14 \|\| ^16 \|\| >=18, current v17.9.1` and 5 deprecation warnings. `FromAsCasing` lint warning. No image produced. `docker-builds-A.log` lines 119-308 |
| `docker run ... asis-backend-a` + `curl /api/v1` | SKIPPED | no image. Host-side substitute of the Dockerfile `CMD` (`NODE_ENV=production node dist/src/index.js`) documented in 3.1 "extra" |

Base images and status (as of 2026-10-26): `node:16-bullseye-slim` - Node 16 EOL 2023-09-11, Debian 11 "bullseye" LTS ended 2026-08-31 (its security pool now 404s, which is exactly the failure seen); `node:17-alpine` - Node 17 was an odd-numbered, never-LTS release, EOL 2022-06-01; `nginx:1.19` - mainline branch from 2020, superseded by 1.20 in April 2021 (pull still succeeds but no updates). All three are end-of-life.

### 3.5 Snapshot B - backend (`dirty-tree/backend`)

| # | Command | Result | Notes / log |
|---|---|---|---|
| 1 | `npm ci --no-audit --no-fund` | **FAIL**, 6 s | `npm error code ERESOLVE ... While resolving: express-api-starter-ts@1.2.0 Found: @typescript-eslint/eslint-plugin@8.72.0 ... Could not resolve dependency: peer @typescript-eslint/eslint-plugin@"^7.0.0" from eslint-config-airbnb-typescript@18.0.0`. (npm 11 surfaces the resolution error instead of the usual "lock out of sync" message.) `backend-B-npm-ci.log` |
| 1b | `npm install --no-audit --no-fund --package-lock=false` | **FAIL**, 1 s | identical `ERESOLVE`. `backend-B-npm-install-fallback.log` |
| 1c | **WORKAROUND** `npm install --no-audit --no-fund --package-lock=false --legacy-peer-deps` | OK, 17 s | "added 803 packages". Deprecation warnings: `eslint@9.39.5: This version is no longer supported`, `@novu/node@2.6.6: March 20, 2025 marks the end of support`, `glob@10.5.0`, `uuid@9.0.1`, `lodash.get@4.4.2`, `@types/socket.io@3.0.2`. `backend-B-npm-install-legacy-peer-deps.log`. **All rows below ran on this non-as-is install.** |
| 2 | `npx prisma --version` | OK | prisma 7.10.1, @prisma/client 7.10.1, "Query Compiler: enabled", schema-engine darwin-arm64. Note: no "Environment variables loaded from .env" line - Prisma 7 CLI does not auto-load `.env` |
| 2b | `npx prisma generate` | **FAIL** | `Error: Prisma schema validation - (get-config wasm) Error code: P1012` with 3 errors: "The datasource property `url` is no longer supported in schema files. Move connection URLs for Migrate to `prisma.config.ts` ..." (schema.prisma:10), same for `shadowDatabaseUrl` (line 12) and `directUrl` (line 11). "Validation Error Count: 3". `backend-B-prisma-generate.log` |
| 3 | `npx prisma migrate deploy` | **FAIL** | identical P1012 output; the absence of `prisma/migrations/` is never reached |
| 3b | `npx prisma migrate status` | **FAIL** | identical P1012 |
| 3c | **WORKAROUND**: copied A's 14 migrations into `dirty-tree/backend/prisma/migrations`, re-ran `migrate status` and `migrate deploy`, then deleted the copy (B restored to as-is) | **FAIL** | identical P1012 both times - the missing migrations are not B's blocker; the Prisma 7 schema format is |
| 4 | `npx prisma db seed` | **exit 0 but nothing seeded** | "⚠️ No seed command configured. To seed your database, add a seed property to the migrations section in your Prisma config file." Prisma 7 ignores `package.json#prisma.seed`. `backend-B-prisma-db-seed.log` |
| 5 | `npx tsc --noEmit` | **FAIL**, 2 errors | `src/api/like.ts(30,22): error TS7006: Parameter 'lk' implicitly has an 'any' type.` and `src/lib/prisma.ts(1,10): error TS2305: Module '"@prisma/client"' has no exported member 'PrismaClient'.` (no generated client under Prisma 7). `backend-B-tsc-noemit.log` |
| 6 | `npx eslint src test` | **FAIL** (config) | "ESLint: 9.39.5 - ESLint couldn't find an eslint.config.(js\|mjs\|cjs) file. From ESLint v9.0.0, the default configuration file is now eslint.config.js. If you are using a .eslintrc.* file, please follow the migration guide". `backend-B-eslint.log` |
| 7 | `npm test -- --ci --watchAll=false` | **FAIL** | `FAIL test/api.test.ts` and `FAIL test/app.test.ts`: "Test suite failed to run - src/lib/prisma.ts:1:10 - error TS2305: Module '"@prisma/client"' has no exported member 'PrismaClient'." "Test Suites: 2 failed, 2 total; Tests: 0 total". `backend-B-jest.log` |
| 8 | `npm run build` (`tsc`) | **FAIL, exit 2** | same 2 errors; nevertheless `dist/src/**` was emitted (file timestamps 17:39:46 = this run) because `noEmitOnError` is not set. `backend-B-build.log` |
| 9 | `nohup npx ts-node src/index.ts > agent-out/backend-B.log 2>&1 &` | **FAIL** | process exits in <2 s: `TSError: ⨯ Unable to compile TypeScript: src/lib/prisma.ts(1,10): error TS2305: Module '"@prisma/client"' has no exported member 'PrismaClient'.` (`diagnosticCodes: [2305]`). No listener on 18081; all probes SKIPPED. `backend-B.log` |

### 3.6 Snapshot B - frontend (`dirty-tree/frontend`)

| # | Command | Result | Notes / log |
|---|---|---|---|
| 1 | `npm ci --no-audit --no-fund --loglevel=error` | **FAIL**, 13 s | `npm error code EUSAGE - npm ci can only install packages when your package.json and package-lock.json ... are in sync`. Examples of the ~200 listed mismatches: `lock file's @chakra-ui/react@2.5.1 does not satisfy @chakra-ui/react@3.37.0`, `react-router-dom@6.8.1 ... 7.18.4`, `typescript@4.9.5 ... 5.9.3`, `@testing-library/react@13.4.0 ... 16.3.3`, `framer-motion@6.5.1 ... 12.43.0`, `Missing: @ark-ui/react@5.39.0`, ~70 `Missing: @zag-js/*@1.43.3`. `frontend-B-install.log` |
| 1b | `npm install --no-audit --no-fund --loglevel=error --package-lock=false` | **FAIL**, 7 s | `ERESOLVE could not resolve - While resolving: react-scripts@5.0.1 Found: typescript@5.9.3 ... Could not resolve dependency: peerOptional typescript@"^3.2.1 \|\| ^4" from react-scripts@5.0.1 ... Conflicting peer dependency: typescript@4.9.5` |
| 1c | **WORKAROUND** `npm install ... --package-lock=false --legacy-peer-deps` | OK, 17 s | "added 1690 packages". `frontend-B-install-legacy-peer-deps.log`. **All rows below ran on this non-as-is install.** |
| 2 | `npx tsc --noEmit` | **FAIL, 377 errors** (TS 5.9.3) | Dominated by Chakra UI v2 -> v3 breakage: `'"@chakra-ui/react"' has no exported member named 'theme'`, `'useToast'`, `FormControl`/`FormLabel`/`FormErrorMessage`, `AlertDialog*`, `MenuButton`/`MenuList`, `useColorModeValue`; prop renames `spacing` (Stack), `isLoading`->`loading`, `isDisabled`->`disabled`, `isOpen`->`open`; namespace components `Switch`/`Menu`/`Checkbox`/`Select` "cannot be used as a JSX component". Also `web-vitals` v5 (`ReportHandler`, `getCLS/getFID/getFCP/getLCP/getTTFB` gone) and `@testing-library/react` 16 (`screen` not exported). First 15: `src/App.test.tsx(2,10) TS2305 'screen'`; `src/App.tsx(3,3) TS2724 'theme'`; `src/App.tsx(28,21) TS2322 ChakraProviderProps has no 'theme'`; `src/components/auth/DangerZone.tsx(3,5)..(8,5)` TS2305/TS2724 `AlertDialog`, `AlertDialogBody`, `AlertDialogContent`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogOverlay`; `DangerZone.tsx(12,5) 'useToast'`; `DangerZone.tsx(21,13) TS2339 'isOpen'`; `DangerZone.tsx(90,33) TS2322 'isLoading'`; `PasswordForm.tsx(3,5) 'FormErrorMessage'`; `PasswordForm.tsx(6,5) 'useToast'`; `PasswordForm.tsx(101,13) 'isLoading'`. `frontend-B-tsc-noemit.log` (539 lines) |
| 3 | `CI=true npx react-scripts test --watchAll=false` | **FAIL** | `FAIL src/App.test.tsx - Cannot find module '@testing-library/dom' from 'node_modules/@testing-library/react/dist/pure.js'` (v16 made `@testing-library/dom` a peer dependency; `--legacy-peer-deps` does not install peers). 1 suite failed, 0 tests. `frontend-B-test.log` |
| 4 | `CI=false REACT_APP_BACKEND_URL=http://127.0.0.1:18081 ... npm run build` | **FAIL**, 1 s | crashes before compiling: `Error: Cannot find module 'ajv/dist/compile/codegen'` required from `node_modules/ajv-keywords/dist/definitions/typeof.js` <- `schema-utils` <- `terser-webpack-plugin` <- `react-scripts/config/webpack.config.js`. Hoisted `ajv` is 6.15.0 while `ajv-keywords` 5.1.0 needs ajv 8 (dependency tree produced by `--legacy-peer-deps`). `frontend-B-build.log` |
| 5 | serve | SKIPPED | no `build/index.html` |

---

## 4. Security observations from live probing (snapshot A; B never booted)

1. **Unauthenticated writes succeed on 5 of the 6 mutation routes probed.** Only `POST /api/v1/posts/create` sits behind the `auth` middleware. With no `Authorization` header at all, the server created a comment (`POST /api/v1/comments/create` -> 200, id 1 attributed to profile 1), created a like (`POST /api/v1/likes/create` -> 200), rewrote post 1 (`PUT /api/v1/posts/updateById/1` -> 200, title `HACKED` visible on the next GET), rewrote profile 1 (`PUT /api/v1/profile/updateById/1` -> 200, username `owned` persisted) and deleted post 2 (`DELETE /api/v1/posts/deleteById/2` -> 200, subsequent GET returns `null`). Identity (`profileId`) is taken from the request body/URL, so any caller can act as any user. (Not probed but same pattern in source: `DELETE /api/v1/profile/delete/:profileId`, `POST /api/v1/profile/create`, experience/education routes.) Snapshot B's uncommitted change adds `router.use("/fetchByDateArrow/:postId", auth)` for a non-existent path and leaves all of the above untouched.
2. **Auth middleware semantics.** Missing token -> 401 `{"msg":"No token, auth denied!"}`; present-but-invalid token -> 400 `{"error":"Invalid token, auth denied!"}`. Tokens are verified with `SUPABASE_JWT_SECRET` (HS256 shared secret); verified claims are not used to bind the request to a profile.
3. **CORS is wide open.** `cors()` with defaults returns `Access-Control-Allow-Origin: *` for `Origin: https://evil.example`, with `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE` on preflight. Combined with (1), any web page can mutate data. The Socket.IO server's `cors` option sets `methods` but no `origin` (the origin line is commented out).
4. **Stack traces leak in the mode the app is normally run in.** `npm start`/`ts-node` leave `NODE_ENV` unset, so the error handler returns `err.stack`: 404s include `at notFound (/private/tmp/.../backend/src/middleware/middlewares.ts:7:17)` and malformed JSON returns a 500 with the body-parser stack and absolute `node_modules` paths. Only with `NODE_ENV=production` (as the Dockerfile sets) is the stack replaced by `"🥞"` (verified on the compiled build).
5. **Input handling.** Non-numeric ids (`/posts/post/abc`) are swallowed into a 200 `{"error":...}`; Prisma errors are generically mapped to 400 `{"error":"Unauthorized"}` in several routes (misleading status/message). `GET /api/v1/profile` returns every user's email without auth; morgan logs request URLs, so `/findProfileByEmail/<email>` puts PII in logs.
6. **Header hygiene is good** (helmet 6 defaults: CSP, HSTS 180 d incl. subdomains, COOP/COEP/CORP, nosniff, SAMEORIGIN, Referrer-Policy no-referrer, `X-Powered-By` removed). Note `Cross-Origin-Resource-Policy: same-origin` coexists with `Access-Control-Allow-Origin: *`.
7. **Operational.** On SIGTERM under Node 24 the Prisma 4.11 client runtime throws `ERR_INVALID_ARG_TYPE` (`process.exit('SIGTERM')`), so shutdown is a crash. All three Docker base images are EOL and the backend image can no longer be built because the Debian 11 security pool has been removed; the frontend image never compiled native `bufferutil` on Alpine/arm64.

---

## 5. Cleanup performed

Killed the ts-node servers (18080, 18081 never listened), the compiled-build server (18082) and the static servers (18090; one Python process had survived the chain script and was killed explicitly). `docker rm -f asis-pg-A asis-pg-B asis-be` done; `asis-backend-a` / `asis-frontend-a` never existed ("No such image"). No `asis*` containers or images remain; no listeners remain on 18080-18091. `node_modules/` left in place in all four snapshot folders (A backend 302 MB, B backend 496 MB, A frontend 548 MB, B frontend 575 MB), as requested. Snapshot B was restored to its as-is state after the temporary migrations copy.

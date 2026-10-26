# DevConnector frontend — static audit (PRIMARY = dirty working tree)

Scope: `frontend/src/**`, `Dockerfile`, `nginx/nginx.conf`, `.dockerignore`, `.env.development`, `tsconfig.json`, `package.json`, `package-lock.json`, `public/*`, `fly.toml`, `.github/workflows/main.yml`. Backend files were read only to verify claims the frontend makes (auth header format, which routes are enforced, storage policies). Nothing was installed, run or modified.

Paths below are relative to `frontend/` unless prefixed with `backend/`. Line numbers refer to PRIMARY.

## 0. What differs between PRIMARY and REFERENCE (origin/main)

Source: 8 files differ, all small and all behaviour-preserving except two:
- `src/components/auth/ProfileForm.tsx` adds an `isPublic` `<Switch>` (lines 108-112) — nothing else in the frontend or backend reads the flag (see FE-05).
- `src/pages/auth/Signin.tsx` adds `socket.emit("new-user-add", values.email)` + a never-removed `socket.on("get-users", …)` with a `console.log` of online users (lines 96-100).
- `PostForm.tsx` adds six props to `PostFormProps` (26-34) that are never destructured (dead); `Blog.tsx`/`ProfileAvatar.tsx` make two props optional; `Nav.tsx` adds a "Home" menu item; `Developers.tsx` is a cosmetic card redesign ("Follow" → "Connect", still no handler); `PostTable.tsx` whitespace.
- All 117 PRIMARY source files were converted LF → CRLF (REFERENCE is LF). Every file will show as 100 % changed in `git diff`; there is no `.gitattributes`.

Dependencies: `package.json` bumps 24 of 28 packages, many across majors. `package-lock.json` is **byte-identical to HEAD apart from line endings** (diff ignoring CR = 0 lines); its root `dependencies` block still says `@chakra-ui/react ^2.5.1`, `react-router-dom ^6.8.1`, `framer-motion ^6.5.1`, etc. No `node_modules` exists in the working tree. Conclusion: the bump was typed into `package.json` (or produced by an `ncu`-style tool) and never installed, so the source was never compiled against the declared versions. Details in FE-01.

| package | PRIMARY package.json | PRIMARY lock | REFERENCE package.json | REFERENCE lock |
|---|---|---|---|---|
| @chakra-ui/react | ^3.30.0 | 2.5.1 | ^2.5.1 | 2.5.1 |
| @chakra-ui/icons | ^2.2.4 | 2.0.17 | ^2.0.17 | 2.0.17 |
| react-router-dom | ^7.10.1 | 6.8.1 | ^6.8.1 | 6.8.1 |
| framer-motion | ^12.23.25 | 6.5.1 | ^6.5.1 | 6.5.1 |
| react-icons | ^5.5.0 | 3.11.0 | ^3.11.0 | 3.11.0 |
| @testing-library/react | ^16.3.0 | 13.4.0 | ^13.4.0 | 13.4.0 |
| @testing-library/jest-dom | ^6.9.1 | 5.16.5 | ^5.16.5 | 5.16.5 |
| @novu/notification-center | ^2.0.0 | 0.12.0 | ^0.12.0 | 0.12.0 |
| typescript | ^5.9.3 | 4.9.5 | ^4.9.5 | 4.9.5 |
| web-vitals | ^5.1.0 | 2.1.4 | ^2.1.4 | 2.1.4 |
| date-fns | ^4.1.0 | 2.29.3 | ^2.29.3 | 2.29.3 |
| chakra-react-select | ^6.1.1 | 4.4.3 | ^4.4.3 | 4.4.3 |
| @types/jest / @types/node | ^30.0.0 / ^24.10.1 | 28.1.8 / 12.20.55 | ^28.1.8 / ^12.20.55 | same |
| react-scripts | 5.0.1 | 5.0.1 | 5.0.1 | 5.0.1 |
| react-query | ^3.39.3 | 3.39.3 | ^3.39.3 | 3.39.3 |

---

## A. Security

### FE-01 — Critical — Build/dependency integrity: declared versions are incompatible with the source; lock is stale
Evidence:
- `package.json:7` `"@chakra-ui/react": "^3.30.0"` while every component is written against the v2 API. Symbols imported from `@chakra-ui/react` that do not exist in v3: `theme`, `ColorModeScript`, `useColorMode`, `useColorModeValue`, `useToast`, `FormControl`, `FormLabel`, `FormErrorMessage`, `Modal*` (6), `AlertDialog*` (6), `Drawer*` (7), `MenuButton/MenuList/MenuItem/MenuDivider`, `TabList/Tab/TabPanels/TabPanel`, `Thead/Tbody/Tr/Th/Td/TableContainer`, `CardHeader/CardBody/CardFooter`, `StatLabel/StatNumber`, `CircularProgress(+Label)`, `AlertIcon/AlertTitle/AlertDescription`, `InputRightElement`, `TagLabel`, `Divider`, `UnorderedList/ListItem`, `Collapse/ScaleFade/Fade`, `keyframes`, `useMultiStyleConfig`. Prop vocabulary also changed (`isOpen/onClose/isInvalid/isDisabled/isLoading/isExternal/isNumeric/isCentered/isLazy/colorScheme/spacing/sx/__css/leftIcon/as={Link}`, `bgGradient` string syntax). Examples: `src/App.tsx:28` `<ChakraProvider theme={theme}>`; `src/index.tsx:19` `<ColorModeScript />`; `src/components/shared/Navbar.tsx:17` `useMultiStyleConfig("Navbar", {})`; `src/components/shared/CustomAvatar.tsx:1` `import { … keyframes } from '@chakra-ui/react'`.
- `package.json:6` `@chakra-ui/icons ^2.2.4` — a Chakra-v2 package; v3 dropped it (used in 15 files).
- `package.json:33` `web-vitals ^5.1.0` vs `src/reportWebVitals.ts:1,5` `import { ReportHandler } from "web-vitals"` / `getCLS, getFID, …` — removed in v3 (`onCLS…`), FID removed in v5 → type error → `react-scripts build` fails.
- `package.json:22` `framer-motion ^12` vs `src/components/shared/Navbar.tsx:26` `scrollY.onChange(...)` — `MotionValue.onChange` deprecated in v8 and removed since; v12 needs `scrollY.on('change', …)`/`useMotionValueEvent`.
- `package.json:13` `@testing-library/react ^16` requires an explicit `@testing-library/dom` dependency (absent) → Jest "Cannot find module".
- `package.json:32` `typescript ^5.9.3` vs `react-scripts 5.0.1` peer range `typescript ^3.2.1 || ^4` → `npm install` on npm ≥ 7 (Node 17 ships npm 8) ends in `ERESOLVE` unless `--legacy-peer-deps`.
- Lock root deps ≠ package.json deps → `npm ci` refuses to run ("package.json and package-lock.json are not in sync"); the Dockerfile's `npm install` (`Dockerfile:17`) would re-resolve, hit ERESOLVE, and even with legacy peers would install Chakra 3 and fail type-check.
- Compatible after the bump (API surface used still exists): `react-router-dom` 7 (BrowserRouter/Routes/Route/Link/NavLink/Navigate/useNavigate/useLocation/useParams/Outlet), `react-icons` 5 (same pack paths), `@supabase/supabase-js` 2.86, `axios` 1.13, `react-hook-form` 7.68, `socket.io-client` 4.8, `date-fns` 4 (`formatDistanceToNow`), `@novu/notification-center` 2 (same three exports; package itself deprecated), `chakra-react-select` 6 (targets Chakra v3 — consistent with the bump, inconsistent with the v2 source).
Impact: PRIMARY cannot be installed reproducibly nor built. Anyone running `npm ci`/Docker from this tree gets a hard failure; anyone running `npm install --legacy-peer-deps` gets ~60 TypeScript errors across every component. HEAD (REFERENCE) builds; PRIMARY does not.
Fix: either revert `package.json` to the lock (keep v2 and plan the migration), or do the migration for real: Chakra v3 codemod + manual rewrite of every compound component, drop `@chakra-ui/icons`, rewrite `reportWebVitals.ts` (or delete it), fix `Navbar.tsx`, add `@testing-library/dom`, and leave CRA (CRA + TS5 is a dead end — move to Vite in the same step). Regenerate the lock and commit it; add `npm ci` to CI so drift is caught.

### FE-02 — Critical — Authorization is cosmetic: 9 of 11 mutating calls are unauthenticated and the client chooses its own identity
Evidence (frontend):
- Only two requests carry credentials: `src/api/postApi.ts:25-27` `axios.post(postUrl + '/create', post, { headers: { Authorization: \`token ${session?.access_token}\` } })` and `src/api/authApi.ts:87-89` (profile delete).
- No credentials on: `postApi.ts:32` `axios.put(\`${postUrl}/updateById/${post.id}\`, post)`, `postApi.ts:37` `axios.delete(\`${postUrl}/deleteById/${id}\`)`, `authApi.ts:75` `addProfile`, `authApi.ts:80` `updateProfile`, `authApi.ts:71` `createOrVerifyProfile`, `commentApi.ts:7`, `likeApi.ts:8`, `educationApi.ts:7`, `experienceApi.ts:7`.
- The acting user is a client-supplied body field: `src/components/comments/CommentForm.tsx:38` `if (profile) setValue('profileId', profile.id)`; same in `PostForm.tsx:57`, `LikeButton.tsx:33`, `EducationList.tsx:48`, `ExperienceList.tsx:48`. `updateProfile` targets `/updateById/${profile.id}` with `id` taken from the form (`ProfileForm.tsx:62`).
- UI-only gates: `src/components/auth/RequireAuth.tsx:12-14` (route guard), `src/components/shared/LikeButton.tsx:61` `isDisabled={!session}`, `src/pages/post/Post.tsx:65` `{session ? <CommentForm/> : <Empty/>}`, admin Posts lists only own posts via `usePostByProfileId(profile?.id)` (`pages/admin/Posts.tsx:21`).
Cross-check (backend): `backend/src/api/posts.ts:109` is the only route with the `auth` middleware; `posts.ts:81` `router.use("/fetchByDateArrow/:postId", auth)` guards a route that does not exist; `posts.ts:83` (PUT) and `posts.ts:133` (DELETE) are open; `backend/src/api/profile.ts:84-95` deletes the profile row by URL id *before* checking the token's user. `comments.ts`, `like.ts`, `education.ts`, `experience.ts` never import `auth`.
Impact: any visitor can `curl -X DELETE $API/api/v1/posts/deleteById/1`, edit any post/profile, post comments/likes as any `profileId` (ids are sequential and `GET /profile` lists them). The frontend's "my posts only" table and disabled buttons give a false sense of enforcement.
Fix (frontend side): one `axios.create()` instance with a request interceptor that attaches `Authorization: Bearer <access_token>` to every request and a response interceptor for 401 → sign-out/refresh; delete every `profileId` hidden field and let the server derive identity from the JWT; remove the two ad-hoc header literals. Backend must enforce; until it does, nothing in the UI is protection.

### FE-03 — Critical — Public anon key in the bundle + `grant all privileges … to anon` on every table
Evidence: `src/config/supabase-client.ts:3-6` embeds `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` (by design public, shipped in `main.*.js`). `backend/src/scripts/supabase.sql:14` `grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;`. Tables are created by Prisma migrations, which do not enable RLS.
Impact: if RLS is not enabled on the Prisma tables (default), the anon key from the bundle gives read/write on `Profile`, `Post`, `Comment`, `Like`, … through PostgREST (`/rest/v1/Profile`) — bypassing the Express API entirely. Must be verified in the Supabase dashboard; treat as critical until proven otherwise.
Fix: enable RLS on all public tables (deny-all policies; the app uses Prisma via the service connection so no anon policies are needed), revoke the blanket grant, rotate the anon key after fixing. Keep the anon key in the bundle only once that is done.

### FE-04 — High — Test credentials pre-filled in the production sign-in form
Evidence: `src/pages/auth/Signin.tsx:61-66` `useForm<FormValues>({ defaultValues: { email: "janedane@gmail.com", password: "123456" } })`.
Impact: every visitor sees a working-looking account; if that user exists (it is the obvious seed/dev account) anyone can log in as it with one click. Also leaks a real-looking email address.
Fix: remove `defaultValues`; add `autoComplete="email"` / `"current-password"` instead.

### FE-05 — High — PII exposure: every registered email is rendered on public pages, over the socket, and the new `isPublic` flag does nothing
Evidence:
- `src/pages/developers/Developers.tsx:67-69` `<Text fontSize='sm'>{authorEmail}</Text>` for every profile returned by `GET /profile` (unfiltered; `useProfiles`, `hooks/auth/useProfiles.ts:5`).
- `src/pages/post/Post.tsx:73` comment author `name={profile?.authorEmail}`; `src/pages/post/Posts.tsx:111` `name={profile?.username || profile?.authorEmail}`; `Blog.tsx:16-17` prints `props.userEmail` when no name.
- `src/components/comments/CommentForm.tsx:49` `socket.emit("addComment", { post, profile, comment })` → server broadcasts the whole `profile` object to every connected socket (`backend/src/app.ts:36`).
- `src/components/auth/ProfileForm.tsx:108-112` new `isPublic` Switch with helper text "If you make your profile public it will be visible by everyone" — no consumer anywhere (`grep isPublic` → only the form and the type).
- Emails are also used as avatar `name`/alt (`ProfileAvatar.tsx:32`, via `truncate(email)`).
Impact: harvestable email list of all users from an anonymous page; privacy toggle is a lie.
Fix: never render `authorEmail` outside the owner's own settings; display `username` with a fallback like "Developer #id"; filter the developers list by `isPublic` server-side; strip `profile` from socket payloads.

### FE-06 — High — Socket.io opens a connection for every visitor at import time; events are unauthenticated and over-broadcast
Evidence: `src/utils/constants.ts:27-29` `const socketIoBackendUrl = \`${process.env.REACT_APP_BACKEND_URL}\`; export const socket = io(\`${socketIoBackendUrl}\`);` — module-level side effect; the module is imported by `LikeButton.tsx:9` (for a text constant), `PostForm.tsx:9`, `CommentForm.tsx:9`, `Posts.tsx:18`, `Signin.tsx:37`, all in the single main chunk → `io()` runs on first paint of `/privacy` for an anonymous user. `src/components/post/PostForm.tsx:69` emits the full post (including `published: false` drafts) and `src/pages/post/Posts.tsx:38-41` only *filters client-side* `if (postBroadcasted.post.published)`. Backend `app.ts:17-22` socket CORS has no `origin`, no auth handshake.
Impact: one persistent WebSocket per tab for every visitor (cost, backend fan-out, blocked by corporate proxies → console noise); unpublished post content and commenter profiles are delivered to every browser; emails sent as `new-user-add` identity (`Signin.tsx:97`).
Fix: create the socket lazily inside a provider mounted only for authenticated users (or only on `/posts`), pass the Supabase JWT in `auth:` for a server-side handshake check, send only ids over the wire and let clients refetch, and never emit unpublished content.

### FE-07 — High — Supabase Storage: anonymous arbitrary-file uploads, no client validation, predictable/unnamespaced paths, avatar download anti-pattern
Evidence: `backend/src/scripts/supabase.sql:9-10` `create policy "Anyone can upload an avatar." on storage.objects for insert with check (bucket_id = 'images');` (includes `anon`). Client: `src/components/shared/CustomAvatar.tsx:47-52` `const file = event.target.files[0]; const fileExt = file.name.split('.').pop(); const fileName = \`${Math.random()}.${fileExt}\`; … .upload(filePath, file)` — no size cap, no MIME check (`accept="image/*"` at line 100 is UI-only), extension taken from the user's filename (`.html`, `.svg` allowed), no per-user folder, `Math.random()` for naming, old avatar never deleted. Download path: `ProfileAvatar.tsx:21-26` and `CustomAvatar.tsx:28-33` call `storage.from('images').download(path)` and `URL.createObjectURL(data)` on every mount (never `revokeObjectURL`); the `path` comes from `profile.avatarUrl`, which is writable through the unauthenticated `PUT /profile/updateById` (FE-02).
Impact: bucket becomes free anonymous file hosting on the project's `*.supabase.co` origin (same origin as the auth API — hostable HTML/SVG phishing pages); unbounded storage cost; each avatar is fetched N times per page (one per `ProfileAvatar` instance, e.g. 5 posts + comments) via the authenticated API instead of a cacheable public URL; blob URL memory leak.
Fix: policy `insert` only for `authenticated` and path prefix `auth.uid()`; client: validate type via `file.type` allowlist + size (e.g. ≤ 2 MB), name as `${userId}/avatar.${ext}` with `upsert: true`; render with `getPublicUrl()` (or signed URLs) + `<img loading="lazy">`; delete previous object.

### FE-08 — High — Novu notification feed readable by guessing integer subscriber ids; identifier hard-coded; "undefined" subscriber
Evidence: `src/components/shared/Nav.tsx:91-94` `<NovuProvider subscriberId={\`${profile?.id}\`} applicationIdentifier='vTbMIBFNZdXt'>` — no `subscriberHash` (HMAC), `subscriberId` is the sequential Prisma id, and before `profile` loads it is the string `"undefined"`.
Impact: Novu's widget API authenticates a subscriber by (applicationIdentifier, subscriberId) alone unless HMAC is enabled; anyone can open any user's in-app notification feed (which contains post ids and commenter names) by trying ids 1..N. Hard-coding the identifier prevents per-environment apps. The "undefined" subscriber creates junk sessions.
Fix: enable HMAC in Novu and have the backend return `subscriberHash` for the logged-in user; render `NovuProvider` only when `profile?.id` exists; move the identifier to `REACT_APP_NOVU_APP_ID`.

### FE-09 — High — react-query cache key collision returns wrong-shaped data and crashes pages
Evidence: `src/hooks/post/usePost.ts:5` `useQuery(["posts", id], …)` (returns `Post`) and `src/hooks/post/usePostByProfile.ts:5` `useQuery(["posts", profileId], …)` (returns `Post[]`) share the same key shape; same for `hooks/user/useUser.ts:5` `["users", id]` vs `hooks/user/useSearchUsers.ts:5` `["users", query]`. `invalidateQueries("posts")` prefix-matches both.
Impact: a user whose `profile.id` is 3 visits `/admin/posts` (caches a `Post[]` under `["posts", 3]`), then opens `/posts/3`: `usePost(3)` returns the cached array immediately → `src/pages/post/Post.tsx:62` `data?.profile.authorEmail` → `TypeError: Cannot read properties of undefined (reading 'authorEmail')` (and `Posts` admin would call `.slice` on an object). Default `staleTime: 0` masks it only after the refetch resolves.
Fix: key factories — `['posts','detail',id]`, `['posts','byProfile',profileId]`, `['users','detail',id]`, `['users','search',q]`.

### FE-10 — High — Fake features shipped as real: password change is a stub that reports success; Users, Dashboard, Search run on in-memory mock data
Evidence: `src/api/authApi.ts:108-114` `export async function updatePassword(newPassword) { return new Promise(resolve => setTimeout(() => resolve(true), 2000)); }` → `PasswordForm.tsx:37-41` toasts "Your password has been updated". `src/api/userApi.ts:4-115` hard-coded `users` array; `:142-202` `addUser/fetchUserById/fetchUserStats/fetchUsers/removeUser/searchUsers/updateUser` all `setTimeout` fakes; consumed by `/admin` (Dashboard), `/admin/users*`, `UserSearch`. `fetchAuthUser` mock at `authApi.ts:8-21`. `Developers.tsx:93-104` "Connect" button and `Signin.tsx:144-152` Google/Twitter buttons do nothing but `console.log`.
Impact: a user who "changes" a password keeps the old one (security expectation broken); admin pages show invented people (`rhys@arriaga.com`, …) and "Add User" creates nothing.
Fix: implement with `supabaseClient.auth.updateUser({ password })` (requires a fresh session; handle `reauthentication`), delete the Users/Dashboard/Search admin template pages and `userApi.ts`, hide or implement the social/connect buttons.

### FE-11 — High — Profile rows are created before the user is verified; profile creation is replayed on every auth event
Evidence: `src/api/authApi.ts:41-48` `signInWithMagicLink`: after `signInWithOtp` it unconditionally `await addProfile({ authorEmail: email })`; `authApi.ts:58-68` `signUpWithEmailAndPassword` same; `POST /profile/create` is unauthenticated (FE-02) and is a plain `prisma.profile.create` (`backend/src/api/profile.ts:43-52`). `src/providers/AuthProvider.tsx:25-29` `onAuthStateChange((_event, session) => { if (session?.user.app_metadata.provider === 'github') createOrVerifyProfile(session.user.email!) …` runs for `INITIAL_SESSION`, `SIGNED_IN`, `TOKEN_REFRESHED`, `USER_UPDATED` — unawaited, uncaught.
Impact: anyone can create profiles for arbitrary emails without owning them; a second magic-link request for an existing email makes `addProfile` reject (unique `authorEmail`) so the whole mutation errors *after* the email was sent, showing an error toast for a successful OTP; `/profile/createProfileBySocial/:email` is POSTed on every page load and token refresh (~hourly) for GitHub users.
Fix: create the profile server-side from the verified JWT on first authenticated request (or in a Supabase auth webhook/trigger), remove both client-side `addProfile` calls and the `onAuthStateChange` hook call.

### FE-12 — High — Auth bootstrap failure mode is a blank white page; env misconfiguration throws at import
Evidence: `src/providers/AuthProvider.tsx:16-23` `const setData = async () => { const { data: { session }, error } = await supabaseClient.auth.getSession(); if (error) throw error; … setLoading(false); }` — thrown inside an un-awaited async → unhandled rejection, `loading` stays `true`, and `AuthProvider.tsx:64` `{!loading && children}` renders nothing. `src/config/supabase-client.ts:3-4` `process.env.REACT_APP_SUPABASE_URL!` → `createClient(undefined, undefined)` throws "supabaseUrl is required." at module evaluation (also why the test suite cannot load, FE-29). API base URLs are built as template strings (`api/postApi.ts:5` ``${process.env.REACT_APP_BACKEND_URL}/api/v1/posts``) → literal `"undefined/api/v1/posts"` when unset.
Impact: all public routes (Home, Posts, Privacy) are blocked behind Supabase session resolution; any failure = empty `<div id="root">` with no error UI.
Fix: a single `src/env.ts` that validates required vars at startup and renders a visible configuration error; `try/catch` in `setData` with `finally { setLoading(false) }`; render public routes without waiting for the session; add an error boundary.

### FE-13 — High — Non-standard `Authorization: token …` scheme, `"token undefined"` when logged out, no 401 handling
Evidence: `src/api/postApi.ts:26` and `src/api/authApi.ts:88` `Authorization: \`token ${session?.access_token}\``. Backend `backend/src/middleware/auth.ts:7` `req.header('Authorization')?.split(' ')[1]` accepts any scheme word, which is why it "works". There is no axios instance, interceptor, retry or 401/403 handling anywhere (`grep interceptors` → none); errors surface as the generic toast "Something went wrong! …" (20+ copies).
Impact: contract works by accident; a logged-out click on "Save" sends `token undefined` and gets `400 Invalid token` (backend also uses 400 instead of 401). Expired sessions are never detected.
Fix: `Bearer` scheme via one interceptor (FE-02); map 401 → sign-out + redirect with `from`; return typed errors from the API layer.

### FE-14 — High — CI deploys every push on every branch straight to production without build/test/lint; unpinned action
Evidence: `.github/workflows/main.yml:2` `on: [push]`; `:35,45` `uses: superfly/flyctl-actions/setup-flyctl@master`; `:46-50` `flyctl deploy --remote-only --build-arg REACT_APP_SUPABASE_ANON_KEY=…`; no `npm ci`, `npm test`, `npm run build`, or lint step anywhere.
Impact: a broken PRIMARY (FE-01) pushed to any branch triggers a production deploy attempt; a mutable `@master` action is a supply-chain hole (it runs with `FLY_API_TOKEN`).
Fix: `on: push: branches: [main]` + PR workflow with `npm ci && npm run typecheck && npm test -- --ci && npm run build`; pin actions by SHA; deploy only from `main` after checks.

### FE-15 — Medium — Dockerfile: EOL base images, `npm install` instead of `npm ci`, no healthcheck
Evidence: `Dockerfile:1` `FROM node:17-alpine as build` (Node 17: EOL June 2022, never LTS; react-router 7 wants Node ≥ 20); `Dockerfile:21` `FROM nginx:1.19` (EOL 2021); `Dockerfile:16-17` `COPY package*.json ./` + `RUN npm install` (mutates the stale lock during the build → non-reproducible); `Dockerfile:13-14` `ARG NODE_ENV=production` + `RUN echo ${NODE_ENV}` is a no-op; `Dockerfile:5-11` build args become `ENV` in the builder stage (acceptable here because all three values are public — anon key, URLs — but the pattern invites putting a real secret there later). No `HEALTHCHECK`; the final image runs the stock nginx entrypoint (master as root, workers as `nginx` — standard but unnecessary). All toolchain packages (`typescript`, `@types/*`, `@testing-library/*`) are in `dependencies` (`package.json:12-18,32`), so there is no dev/prod split to exploit.
Fix: `node:22-alpine` + `npm ci --no-audit --no-fund`; `nginx:1.27-alpine` (or `nginxinc/nginx-unprivileged`); `HEALTHCHECK CMD wget -qO- http://127.0.0.1/ || exit 1`; move dev deps to `devDependencies`; drop the NODE_ENV lines.

### FE-16 — Medium — nginx: no security headers, no CSP, no cache policy, version disclosure
Evidence: `nginx/nginx.conf:8-24` — the whole server block is `listen 80; root …; index …; gzip …; location / { try_files $uri $uri/ /index.html; }`. No `add_header` at all, no `server_tokens off`, no `Cache-Control` (CRA emits content-hashed `/static/**` that should be `public, max-age=31536000, immutable` and `index.html` that should be `no-cache`). `try_files … /index.html` also answers 200 + HTML for any missing `/static/js/*.js`. TLS/HSTS are terminated by Fly (`fly.toml:26` `force_https = true`), so the app never sets HSTS itself.
Fix:
```
server_tokens off;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://<backend> wss://<backend> https://api.novu.co wss://ws.novu.co; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" always;
location /static/ { try_files $uri =404; add_header Cache-Control "public, max-age=31536000, immutable"; }
location = /index.html { add_header Cache-Control "no-cache"; }
```
(`style-src 'unsafe-inline'` is required by Emotion unless a nonce is wired in.)

### FE-17 — Medium — Cookie banner and privacy copy are inaccurate and the "consent" is non-functional
Evidence: `src/components/shared/CookieBanner.tsx:34-39` "We use third-party cookies to deliver our services, to personalize ads, and to analyze traffic." — `public/index.html` loads no third-party script, there is no analytics/ads code, Supabase auth uses `localStorage`, so no third-party cookies are set. Only action is `:43-45` "I agree" (no reject), consent is `localStorage.setItem("cookies-consent","true")` and nothing waits for it. `:17-19` `localStorage.getItem(…)` runs during render with no `try/catch` (throws in Safari private mode / blocked storage → the whole app crashes, since `CookieBanner` is mounted in `App.tsx:30` above everything). `src/pages/Privacy.tsx:25` "Updated on Apr 12, 2022", `:52-57` claims Google Analytics, `:63-69` "Facebook Connect / Google Sign-in" (the app has GitHub OAuth), `:101-102` "contact us at ...". `Terms.tsx:61-62` same placeholder.
Impact: misleading legal text; a consent banner that is neither needed for what the site actually does nor GDPR-compliant if it were.
Fix: either remove the banner (no non-essential cookies) or implement real consent gating; rewrite Privacy/Terms to describe Supabase auth, GitHub OAuth, Novu, Fly hosting, storage of avatars, and a real contact; wrap storage access in a `safeStorage` helper.

### FE-18 — Medium — Emails and ids in URL paths, unencoded; API responses are trusted without shape validation
Evidence: `src/api/authApi.ts:94` `axios.get(\`${profileUrl}/findProfileByEmail/${email}\`)`; `:71` `axios.post(\`${profileUrl}/createProfileBySocial/${email}\`)` — no `encodeURIComponent` (`#`, `?`, `/`, `%` in a local part break routing; emails land in backend access logs — `morgan('dev')` — and Fly logs). Backend returns `200 { error: 'Profile … does not exist' }` for a missing profile (`backend/src/api/profile.ts:39`), and the frontend treats any 200 as a `Profile`: `useProfile` data `{error}` is truthy → `ProfileForm.tsx:66` `reset(profile)` fills the form with it, `CommentForm.tsx:38` sets `profileId` to `undefined`, `EducationList.tsx:36` `useEducations(profile?.id)` stays disabled with no message.
Fix: look up "my profile" by JWT (`GET /profile/me`) instead of by email; `encodeURIComponent` any path segment; validate responses with `zod` schemas in the API layer and fail loudly.

### FE-XSS — No finding (XSS vectors)
`grep dangerouslySetInnerHTML|innerHTML|javascript:` → none. No markdown rendering; all user content (`title`, `content`, `text`, `bio`, `username`) is rendered through JSX text nodes (`Posts.tsx:99,107`, `Post.tsx:55,59,71`, `Developers.tsx:76`). `profile.website` is collected (`ProfileForm.tsx:131-137`) but never rendered as an `href` (REFERENCE rendered it as text; PRIMARY dropped it). The only external anchor is `Footer.tsx:57` `<Link href="https://github.com/" isExternal>` (Chakra adds `rel="noopener noreferrer"`). Avatar `src` values are `blob:` URLs produced locally. Hardening note: if `website` is ever linked, allowlist `https?:` and add `rel="noopener noreferrer nofollow ugc"`.

### FE-3P — No finding (third-party scripts)
`public/index.html` contains no external `<script>`/`<link>`; the only third parties are npm-bundled (Novu widget talks to `api.novu.co`/`ws.novu.co`, Supabase, backend). The `<meta name="DevConnector" content="Social Network for Developers" />` at `index.html:8-11` is not a valid meta name (should be `description`).

### FE-19 — Low — Post-login redirect from `location.state` (open-redirect check)
Evidence: `src/pages/auth/Signin.tsx:55` `let from = (location as any).state?.from?.pathname || "/";` → `navigate(from, { replace: true })` at `:83,101,115`. `state` is written only by `RequireAuth.tsx:14` `state={{ from: location }}` and lives in `history.state`, not in the URL, so an external link cannot inject it; the value is a `pathname`, not a full URL. Not exploitable as an open redirect today; still unvalidated and typed `any`.
Fix: `const safeFrom = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'`; type `location.state` properly.

### FE-SW — No finding (service worker)
`src/index.tsx:28` `serviceWorker.unregister()`; `src/serviceWorker.ts` is a CRA 3-era template file that is never used to register. Dead code only (see FE-31).

---

## B. Correctness

### FE-20 — High — Socket listeners leak and the "New posts" chip toggles the wrong number of times (stale closure + missing cleanup)
Evidence: `src/pages/post/Posts.tsx:25-31` `const toggleChip = useCallback(() => setChipVisible(!chipVisible), [chipVisible, setChipVisible]);` → new identity on every toggle; `:37-44` `useEffect(() => { socket.on("postBroadcasted", …toggleChip()…) }, [toggleChip]);` with **no cleanup** → one additional listener per toggle; with two listeners each broadcast flips the chip twice (net no change). `src/pages/auth/Signin.tsx:98-100` `socket.on("get-users", …)` inside a mutation callback — registered again on every login attempt, never removed, logs every online user's email to the console.
Fix: `useEffect(() => { const h = (p) => { if (p.post.published) setChipVisible(true) }; socket.on("postBroadcasted", h); return () => { socket.off("postBroadcasted", h) } }, [])`; use functional `setState`; remove the Signin listener.

### FE-21 — Medium — `AddModal` validation is wired to a field that does not exist, duplicate React keys, and the Education table is mislabeled (copy-paste)
Evidence: `src/components/shared/AddModal.tsx:38-40,50` `isInvalid={Boolean(errors?.inputs?.[index])}` / `{errors?.inputs?.[index] && "Input is required."}` while fields are registered as `register(\`${field}\`)` (`school`, `degree`, …) → `errors.inputs` is always `undefined` → required-field errors are never shown; submit silently does nothing. `:38` and `:58` both use `key={\`input-form-control-${index}\`}` → duplicate keys across the two `.map`s. `AddModal.tsx:3-14` all props typed `any`, RHF internals (`register`, `errors`, `formState`) passed as props; `reset` prop accepted but unused (`:7,24`). `src/components/profile/EducationList.tsx:120-125` headers `School, Description, Company, Location, From - To, Current` while cells `:131-136` render `school, description, degree, fieldOfStudy` → "Company"/"Location" columns show degree/field of study. `EducationList.tsx:51-71` and `ExperienceList.tsx:51-71` call `mutate(...)` then synchronously `onClose(); reset(); setValue('profileId', …)` — fine functionally but the two files are ~95 % identical.
Fix: `errors?.[field]`; distinct keys (`\`date-${field}\``); `FormProvider`/`useFormContext` with a typed field config `{ name, label, type }`; one generic `ProfileSectionList<T>` for both lists; fix the headers.

### FE-22 — Medium — `likeApi` error-wrapping hack → `TypeError` inside the error handler on network failure
Evidence: `src/api/likeApi.ts:10-11` `catch (error: any) { throw new AxiosError(error); }` (passes an `AxiosError` object as the *message*); `src/components/shared/LikeButton.tsx:44-47` `onError: (error: any) => toast({ description: \`${error.message.response.data.error}\` })` relies on `message` being that object. A network error (no `response`) → `error.message.response` is `undefined` → `TypeError` thrown from `onError` (unhandled).
Fix: let axios errors propagate; `axios.isAxiosError(e) ? e.response?.data?.error ?? e.message : 'Unknown error'`.

### FE-23 — Medium — Sign-in flow bugs
Evidence: `src/pages/auth/Signin.tsx:75-83` magic-link success toasts `title: 'Account confirmed.'` (nothing is confirmed; an email was sent) and then `navigate(from, { replace: true })` → for `from === '/admin'` the user is bounced straight back to `/signin` by `RequireAuth` (the page they already are on, now with no toast context). `:126-139` `signInWithGithub` wraps a **non-awaited** `signInWithOAuth()` in `try/catch` → rejections are never caught. `:239` `{!authButtonState ? (signUp.isLoading || 'Register') : (signIn.isLoading || 'Sign in')}` renders the boolean `true` while loading (React renders nothing) — the `isLoading` prop already shows a spinner. `:194/:256` both tab forms use `id="email"` (same id reused; only one panel is mounted at a time thanks to `isLazy`, but `FormLabel htmlFor="email"` is duplicated too). Nav offers "Login" and "Register" as separate links (`Nav.tsx:77-83`) that both go to `/signin`; the sign-up mode is component state only, so `/signin` cannot deep-link to register.
Fix: separate `/signin` and `/signup` routes (or `?mode=`), `await` the OAuth call, show "Check your email" state instead of navigating, drop the boolean-label trick, unique ids.

### FE-24 — Medium — `AuthProvider`: double state writes, dead localStorage key, toast on every `SIGNED_IN`, `children: any`
Evidence: `src/providers/AuthProvider.tsx:10` `({ children }: any)`; `:16-23` and `:25-46` both set `session`/`user`; `:35` `localStorage.removeItem('user')` — nothing ever writes a `user` key (dead); `:37-42` toast "Signed in" on every `SIGNED_IN` event (with the locked supabase-js 2.8 the initial restored session also emits `SIGNED_IN` → toast on every page refresh); `:8` default context `signOut: () => {}` hides misuse outside the provider; `src/hooks/auth/useSignOut.ts` duplicates `signOut` from the context.
Fix: `PropsWithChildren`, rely on `onAuthStateChange` only (it fires `INITIAL_SESSION` on modern supabase-js), toast only on user-initiated actions, one sign-out path.

### FE-25 — Medium — `DangerZone` can issue `DELETE /profile/delete/undefined`; `type="submit"` outside a form
Evidence: `src/components/auth/DangerZone.tsx:91` `onClick={() => handleRemoveProfile(profile?.id!)}` — if the profile has not loaded (or is the `{error}` object from FE-18) this sends `undefined`; backend `Number('undefined')` → NaN → Prisma throws → 500. `:61-67` the "Delete Account" button has `type="submit"` inside `FormHeader` (a `Stack`, not a form).
Fix: disable the button until `profile?.id` is a number; `type="button"`; confirm by typing the email.

### FE-26 — Medium — `ProfileForm` bugs
Evidence: `src/components/auth/ProfileForm.tsx:168-170` the Bio field's error slot renders `errors.company && errors.company.message` (copy-paste; bio errors never show). `:131-137` `website` is `required` with no URL validation (and is never displayed anywhere — FE-XSS). `:61-67` two effects on `profile`: `setValue('id', …)` then `reset(profile)` (redundant; `reset` with a `Profile` also dumps `createdAt`, `experiences`, `programmingLanguages` objects into the form and back to the server). `:99-106` the "Upload" control is `<Button><label htmlFor="avatarUrl">` — a label nested inside a button (invalid HTML, double activation, see FE-33) with `className="button primary block"` referencing CSS that does not exist. `:108-112` `isPublic` has no effect (FE-05). `:97` `FormLine id="userName"` with a label that has no `htmlFor`.
Fix: `errors.bio`; `pattern`/`validate` with `new URL()`; one `reset(pick(profile, formFields))`; a real `<input type="file">` triggered via `ref.click()` from the button.

### FE-27 — Medium — Index keys, non-deterministic colors per render, broken `truncate`, NaN pagination
Evidence: `src/pages/post/Posts.tsx:88-92` `posts?.map((…), i) => <Wrap key={i}>` and `Post.tsx:66-67` `comments?.map((…), i) => <Flex key={i}>`, `Developers.tsx:55` `key={i}` — with pagination/live updates React reuses `LikeButton`/avatar state across different items. `Posts.tsx:100` `<Badge colorScheme={getRandomColor()}>` and `Blog.tsx:32` — `src/utils/functions.ts:5-12` `getRandomColor` picks a random color *on every render* (and loops 7 times for nothing) → badge/tag colors reshuffle whenever the chip toggles or a query refetches. `functions.ts:1-3` `truncate = str => str.length > 1 ? str.substring(0, 10) + '...' : str` → `"abc"` becomes `"abc..."`; used for avatar names (`ProfileAvatar` initials/alt) and `PostTable.tsx:43-44` title/content. `Posts.tsx:136`, `admin/Posts.tsx:105`, `admin/Users.tsx:120` `total={data?.length!}` → `"1–NaN of undefined"` while `data` is undefined.
Fix: `key={id}`; derive color deterministically from `type`/`tag.value` (a lookup map); `str.length > n ? str.slice(0, n) + '…' : str`; `total={data?.length ?? 0}`.

### FE-28 — Medium — Chakra Pro theme tokens used with the stock theme → silently broken styles; dead template hooks
Evidence: `src/App.tsx:28` `<ChakraProvider theme={theme}>` (default theme, no extension) while the components use tokens that only exist in the Chakra Pro template theme: `color="muted"` (Home.tsx:63,90; Footer.tsx:44; Section.tsx:42; Privacy/Terms; Dashboard; ProfileMenu.tsx:64; Search.tsx:163 …), `color="primary"` / `bg="primary"` (Section.tsx:60, Brand.tsx:9, Search.tsx:100), `color="surface"` (PromoBanner.tsx:20), `bgGradient="linear(to-r, primary.500, green.500)"` (PromoBanner.tsx:11-14 → invalid gradient, banner has no background), `shadow="dark-sm"` (Navbar.tsx:18, AppShell.tsx:143), `boxShadow 'md-dark'` (Signin.tsx:180), `fill: primary.500` (Illustration.tsx:9). `Navbar.tsx:17` `useMultiStyleConfig("Navbar", {})` — no `Navbar` component style exists → `styles.navbar` undefined → `__css={undefined}`.
Impact: invalid CSS values are dropped by the browser, so "muted" text is full-contrast body text, primary accents are invisible, the promo banner is unstyled, and dark-mode shadows are missing — the design intent is lost without any error.
Fix: define the tokens in `extendTheme` (semantic tokens `muted`, `primary`, `surface`, shadows `dark-sm`, `md-dark`) or replace them with real tokens; delete `useMultiStyleConfig`.

### FE-29 — Medium — `ColorModeScript` inside the React tree, template manifest, static document title
Evidence: `src/index.tsx:17-21` `<React.StrictMode><QueryClientProvider …><ColorModeScript /><App /></…>` — the script that prevents a light→dark flash must run before first paint (in `public/index.html`), not after hydration; `public/manifest.json:2-3` `"short_name": "React App", "name": "Create React App Sample"` with the default CRA `logo192/512.png`; `public/index.html:7` `theme-color #000000`; no per-route `document.title` anywhere (always "DevConnector").
Fix: move `ColorModeScript` to `index.html` (or use `initialColorMode` + `localStorage` inline script); real manifest/icons; a `usePageTitle()` hook or `react-helmet-async`.

### FE-30 — Medium — `Navbar` reads layout during render and uses a removed framer-motion API
Evidence: `src/components/shared/Navbar.tsx:22` `const { height = 0 } = ref.current?.getBoundingClientRect() ?? {};` executes on every render (forced synchronous layout; `ref.current` is `null` on the first render); `:25-27` `scrollY.onChange(() => setY(scrollY.get()))` re-renders the whole navbar (and its children) on every scroll frame; `onChange` is deprecated/removed (FE-01).
Fix: `useMotionValueEvent(scrollY, "change", v => setScrolled(v > 0))` with a boolean state, measure in a `useLayoutEffect`/`ResizeObserver`, or simply CSS `position: sticky` + `box-shadow` on a scroll threshold via IntersectionObserver.

### FE-31 — Medium — Dead code and template leftovers shipped or type-checked
Evidence: never imported: `src/layouts/InnerLayout.tsx`, `src/components/shared/ColorModeSwitcher.tsx`, `src/components/shared/Brand.tsx`, `src/utils/eventBus.ts`, `src/types/authUser.ts` + `fetchAuthUser` (`authApi.ts:8-21`), `src/logo.svg`, `src/pages/admin/WebSocket.tsx` (`:5` `io("http://localhost:8080")` at module level, `:9` `localStorage.getItem("1")`), `src/serviceWorker.ts` (template), `reportWebVitals()` called with no handler (`index.tsx:33`). Commented-out routes/code: `App.tsx:35-36,61`, `authApi.ts:23-32`, `Nav.tsx:36`, `AddModal.tsx:24`, `EducationList.tsx:93`. Template navigation: `layouts/AdminLayout.tsx:27` `{ href: "/404", label: "404 Page", icon: FiSettings }` in the sidebar; `Footer.tsx:17-28` "Documentation" → `/`, "Github" → `https://github.com/`, "Licence" → `/license` (404); `pages/admin/Post.tsx:79-83` and `pages/admin/User.tsx:79-83` `<ChakraLink isExternal>Read documentation</ChakraLink>` with **no href**; `PromoBanner.tsx:24` "We just launched our new product."; `Nav.tsx:123-125` every signed-in user is labeled "Admin"; `pages/post/Post.tsx:38` public post page titled `"Post 3"`/"Add post" (copied from the admin page, `isUpdate` meaningless there); `PostForm.tsx:26-34` six unused props. `Footer.tsx:75` "© 2023".
Fix: delete; add `noUnusedLocals`/`eslint-plugin-unused-imports` and a `knip` run to keep it that way.

### FE-32 — Medium — Copy-paste duplication
Evidence: `EducationList.tsx` ≈ `ExperienceList.tsx` (149 lines each); `PostTable.tsx` ≈ `UserTable.tsx`; `pages/admin/Posts.tsx` ≈ `pages/admin/Users.tsx` (the `AlertDialog` confirm block appears three times incl. `DangerZone.tsx:69-99`); `CustomAvatar.downloadImage` ≈ `ProfileAvatar.downloadImage`; `pages/admin/Post.tsx` ≈ `pages/admin/User.tsx`; the string "Something went wrong! If the problem persists, contact us!" appears 20+ times (`grep -c`), with no contact method anywhere; `<span>Something went wrong!…</span>` unstyled fallback in 4 pages. `useProfile(session?.user.email)` is re-derived in 9 components instead of once in a `useMyProfile()` hook.
Fix: `ConfirmDialog`, `DataTable<T>`, `useMyProfile`, `useAvatarUrl`, an `ErrorState` component and a `messages.ts`.

### FE-HTTP — No finding (HTTP methods)
Every frontend verb/path matches a backend route of the same verb (`PUT /posts/updateById/:id`, `DELETE /posts/deleteById/:id`, `POST …/create`, `GET /profile/findProfileByEmail/:email`, etc.). The backend's 400-for-auth-failures and 200-with-`{error}` are backend findings; the frontend's failure to handle them is FE-18.

---

## C. TypeScript strictness and code quality

### FE-33 — Medium — `strict: true` is undermined: 27 `any`s, ~25 non-null assertions, `any`-typed component props; no lint/typecheck scripts
Evidence: `tsconfig.json:3` `"target": "es5"` (irrelevant to emitted code under Babel, but `lib`/checks are pinned to it), `:13` `"strict": true` but no `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, no `paths` alias (deep `../../..` imports everywhere). `any`: `AuthProvider.tsx:10`, `AddModal.tsx:14,35,55`, `CustomAvatar.tsx:5,6,26,28,32,34,39,60`, `ProfileAvatar.tsx:19,21,25,27`, `eventBus.ts:2,5,8`, `Nav.tsx:30`, `LikeButton.tsx:44`, `likeApi.ts:10`, `Posts.tsx:68`, `Signin.tsx:55,129`, `WebSocket.tsx:11`, `OAuthButtonGroup.tsx:11`. Non-null assertions on data that can legitimately be absent: `profile?.id!` (DangerZone.tsx:91), `user?.email!` (ProfileMenu.tsx:54), `session?.user?.email!` (Nav.tsx:116), `data?.profile.authorEmail!`/`username!` (Post.tsx:62), `data?.length!` ×3, `activePost!`/`activeUser!` (admin Posts.tsx:131, Users.tsx:146), `isOpen!`/`onClose!`/`onQueryChange!` (AppShell.tsx:147, Search.tsx:79,97,103), `email!`/`id!`/`profileId!` in 7 hooks, `process.env.*!` ×2. `@ts-ignore`/`eslint-disable`: none (good). `let` for never-reassigned bindings (`let { session } = useAuth()` ×6, `Signin.tsx:48-49,55`). `package.json:35-40` scripts are only `start/build/test/eject` — no `lint`, `typecheck`, `format`; `eslintConfig` is `react-app` only (`:41-43`), no `react-app/jest`, no `jsx-a11y` beyond CRA's subset, no `@typescript-eslint` strictness.
Fix: `"lint": "eslint src --max-warnings 0"`, `"typecheck": "tsc --noEmit"`, enable the flags above, ban `any`/`!` via `@typescript-eslint/no-explicit-any`, `no-non-null-assertion`; type RHF forms end-to-end.

### FE-34 — Low — Formatting is inconsistent and Prettier is not applied; CRLF churn
Evidence: `.prettierrc:2` `"singleQuote": true` yet 440 imports use double quotes vs 35 single; `:7` `"jsxBracketSameLine"` is a removed Prettier option (`bracketSameLine`); six files are pasted with a two-space global indent offset (`PasswordForm.tsx`, `Navbar.tsx`, `UserForm.tsx`, `PromoBanner.tsx`, `Privacy.tsx`, `Dashboard.tsx`), two use tabs (`CustomAvatar.tsx`, `WebSocket.tsx`), semicolons are mixed per file, `Nav.tsx:3,11` imports Chakra both as `import * as c` and by name. PRIMARY converted every file to CRLF (117 files) with no `.gitattributes`.
Fix: `.gitattributes` `* text=auto eol=lf`, renormalize, `prettier --write`, `lint-staged` + `husky`.

### FE-35 — Low — Logging and naming hygiene
Evidence: `console.log` left in `Signin.tsx:99,145,151`, `ProfileAvatar.tsx:28`, `CustomAvatar.tsx:35`; `CustomAvatar.tsx:61` `alert(error.message)` (blocking native dialog) for upload errors. File/export name mismatches: `hooks/profile/useEducation.ts` exports `useEducations`, `useCommentsByPost.ts` → `useCommentsByPostId`, `usePostByProfile.ts` → `usePostByProfileId`; `types/comment.ts` `Comment` shadows the DOM global `Comment` (an unimported `Comment` silently type-checks as a DOM node). `OAuthButtonGroup` uses a stringly-typed `childToParent('GitHub')` switch (`Signin.tsx:141-158`).
Fix: ESLint `no-console` (allow `warn`/`error`), a `logger`, consistent file names, `Comment` → `PostComment`, a `Provider` union type.

---

## D. Tests

### FE-36 — High — One test exists; it asserts template text, cannot load its module graph, and fails under both locked and declared dependency sets
Evidence: `src/App.test.tsx:6-10` `test("renders learn react link", () => { render(<App />); const linkElement = screen.getByText(/learn chakra/i); …` — no such text exists in `App` (Chakra CRA template leftover). Rendering `<App />` imports `src/config/supabase-client.ts:6` `createClient(undefined!, undefined!)` (no `.env.test`/`.env` — `.env.development` only sets `REACT_APP_BACKEND_URL`) → throws "supabaseUrl is required." at module load, so the suite dies before the assertion; `src/utils/constants.ts:29` `io("undefined")` would also run; Chakra's `useColorMode`/`useBreakpointValue` need a `window.matchMedia` stub that `src/setupTests.ts:5` does not provide. `src/test-utils.tsx:5-7` wraps in a second `ChakraProvider` on top of `App`'s own. With the declared versions, RTL 16 lacks `@testing-library/dom` and `@types/jest 30` mismatches CRA's Jest 27.
Coverage of critical paths (auth, API layer, hooks, forms, routing, socket): 0 %. No MSW, no component tests, no e2e, no CI test step (FE-14).
Fix: delete `App.test.tsx`; add a `renderWithProviders` (QueryClient with `retry: false`, MemoryRouter, Chakra), `msw` handlers for `/api/v1/**`, a mocked `supabase-client` module, `matchMedia` polyfill in `setupTests.ts`; start with `Signin`, `PostForm`, `CommentForm`, `RequireAuth`, the API layer's auth header; Playwright for sign-in → post → comment.

---

## E. Performance

### FE-37 — Medium — Single ~1 MB+ chunk: no code splitting, two date libraries, two react-query copies, heavy widgets for everyone
Evidence: `grep lazy|Suspense` → none; `App.tsx:10-24` statically imports every page incl. the mock admin dashboard. `moment` imported in 4 files (`Post.tsx:3`, `Posts.tsx:3`, `EducationList.tsx:3`, `ExperienceList.tsx:3`) for `format('Do MMMM YYYY')`/`'l'` — CRA/webpack 5 has no `IgnorePlugin` for `moment/locale`, so all ~130 locales ship (~70 KB gz); `date-fns` also imported (`Dashboard.tsx:19`). `@novu/notification-center` (Nav.tsx:15-19) bundles Mantine 5 + its own `@tanstack/react-query` next to the app's `react-query` v3. `framer-motion` is loaded for a page fade (`Page.tsx:1`) and a navbar shadow. `react-icons` imported from five packs (`fi`, `hi`, `bi`, `gi`, `fa`) plus `@chakra-ui/icons`. `chakra-react-select` (react-select) for two multi-selects.
Fix: `React.lazy` per route group (public / auth / admin); replace moment with `date-fns`/`Intl.DateTimeFormat`; lazy-load the Novu widget only when `session` exists; drop framer-motion for CSS transitions; one icon pack; `source-map-explorer` in CI with a budget.

### FE-38 — Medium — react-query defaults cause refetch storms; whole dataset fetched and paginated client-side
Evidence: `src/index.tsx:14` `const queryClient = new QueryClient();` (defaults: `staleTime: 0`, `refetchOnWindowFocus: true`, `refetchOnMount: true`, `retry: 3`). `useProfile(session?.user.email)` is mounted in Nav, ProfileMenu, DangerZone, ProfileForm, CommentForm, PostForm, EducationList, ExperienceList, admin Posts and once per `LikeButton` (5 per page) → each mount triggers a background `GET /profile/findProfileByEmail/...`; every tab focus refetches all active queries. `src/hooks/post/usePosts.ts:5` fetches all posts with nested `comments`, `likes`, `tags`, `profile` (`backend posts.ts:7-35`) and `Posts.tsx:33-35` slices 5 per page in memory; `likes`/`comments` arrays are downloaded only to render `.length` (`Posts.tsx:118,122`).
Fix: `defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } }`; one `useMyProfile` consumer tree; server-side pagination (`?page=&size=`) with counts, `keepPreviousData`/`placeholderData`.

### FE-39 — Medium — Startup is blocked on auth; avatars fetched N times; blob URLs leak; infinite CSS animation
Evidence: `AuthProvider.tsx:64` `{!loading && children}` hides every route (including `/privacy`) until `getSession()` resolves. `ProfileAvatar.tsx:15-30` downloads the avatar through the Storage API per component instance and `URL.createObjectURL` is never revoked (also `CustomAvatar.tsx:22-37`). `CustomAvatar.tsx:86` `animation: \`2.25s ${pulseRing} … infinite\`` runs forever on the profile page with no `prefers-reduced-motion`. `Navbar.tsx:22,26` layout read in render + state update per scroll frame (FE-30). `getRandomColor()` per render (FE-27). `index.html` has no `<link rel="preconnect">` to Supabase/backend.
Fix: render public routes immediately; `getPublicUrl()` + `<img loading="lazy" decoding="async">`; `useEffect` cleanup `URL.revokeObjectURL`; respect `prefers-reduced-motion`; preconnect.

### FE-40 — Low — Static asset caching/compression depends on Fly statics vs nginx overlap
Evidence: `fly.toml:40-42` `[[statics]] guest_path = "/usr/share/nginx/html/" url_prefix = "/"` serves files from the image directly at the Fly proxy, so nginx's `gzip` (`nginx.conf:16-19`) and any future headers only apply to misses (`/posts/3` → `index.html`). No brotli anywhere. `fly.toml:4` `kill_signal = "SIGINT"` (nginx fast shutdown; `SIGQUIT` is graceful).
Fix: pick one server; if nginx, remove `[[statics]]`; add `Cache-Control` as in FE-16; `SIGQUIT`.

---

## F. Accessibility

### FE-41 — High — Unlabeled or mislabeled controls on the primary navigation and actions
Evidence: `src/components/auth/ProfileMenu.tsx:47-53` `<MenuButton py="4" as={IconButton} rounded="full" variant="link" cursor="pointer">` — an icon-only button with **no `aria-label`** containing an avatar image; `src/components/shared/Nav.tsx:110-113` `<MenuButton p={0} borderRadius="full">` — the main account/hamburger menu, no label (`:132` hamburger is a bare `<c.Box as={GiHamburgerMenu} />`); `Posts.tsx:123` `aria-label="'Chat Button"` and `LikeButton.tsx:63` `aria-label="'Like Button"` (stray quote, no post context, counts in a separate unassociated `<span className="button__badge">` `Posts.tsx:118,122`); `LikeButton.tsx:59-65` disabled `IconButton` wrapped in `Tooltip` → disabled buttons do not receive focus or pointer events, so the explanatory "you must be logged in" tooltip is unreachable for keyboard/SR users (Chakra documents wrapping in a `<span>`); `DarkModeSwitch.tsx:16` `aria-label="Dark mode"` never reflects state (compare the unused `ColorModeSwitcher.tsx:26` which does it right). `Nav.tsx:139-148,175-183` `<Link to=…><c.MenuItem>…</c.MenuItem></Link>` nests a `button[role=menuitem]` inside an `<a>` (invalid; two tab stops/announcements).
Fix: `aria-label="Account menu"` / `"Open navigation"`; `aria-label={\`Like post ${title}, ${likes} likes\`}`; `<Tooltip><span tabIndex={0}><IconButton isDisabled/></span></Tooltip>` or keep it enabled and toast; `MenuItem as={Link} to=…`.

### FE-42 — Medium — Forms: inputs without labels, errors that never render, hidden file input unreachable, nested label-in-button
Evidence: `AddModal.tsx:41-48,61-69` inputs have `placeholder={field}` only ("fieldOfStudy") and no `<FormLabel>`; `CommentForm.tsx:74-91` comment `Input` has no label and its `<FormErrorMessage>` sits **outside any `FormControl`** → Chakra's `FormErrorMessage` returns `null` without the `isInvalid` context, so the "This is required" message can never appear (the button is merely disabled); `ProfileForm.tsx:99-106` `<Button><label htmlFor="avatarUrl">Upload</label></Button>` + `CustomAvatar.tsx:92-103` `<Input style={{ visibility: 'hidden', position: 'absolute' }} type="file">` → the file picker is not keyboard reachable; `ProfileForm.tsx:111` helper text as `<Text as='sup'>` instead of `FormHelperText` (not linked via `aria-describedby`); `Signin.tsx:194-201,256-263` email inputs lack `type="email"`/`autoComplete`; password fields lack `autoComplete="current-password"`/`"new-password"` (`Signin.tsx:217-224`, `PasswordForm.tsx:63-70,81-92`); `EducationList.tsx:136`/`ExperienceList.tsx:136` booleans rendered as `'✅' : '❌'` emoji (no text alternative, color/glyph only).
Fix: `FormControl` + `FormLabel` for every field (visually hidden where needed), `FormHelperText`, native `<input type="file">` with a visible labeled button, `type="email"`, `autoComplete`, text "Yes/No".

### FE-43 — Medium — Document structure: no `h1`, no landmarks, invalid heading content, static title, decorative SVGs not hidden
Evidence: no page has an `h1` — Chakra `Heading` defaults to `h2` (`Home.tsx:47-62`), `SectionTitle` `as="h2"` (`Section.tsx:66`), `ToolbarTitle` `as="h2"` (`Toolbar.tsx:34`), form headings default `h2`; `Posts.tsx:97-104` and `Post.tsx:53-57` put `<Text>` (a `<p>`) and a `<Badge>` inside `<Heading>` → `<p>` inside `<h2>` is invalid; `Nav.tsx:49` top bar is a `Box` (no `<nav>`), `AdminLayout.tsx:47-53` sidebar links in a `Stack` (no `<nav aria-label>`), no `<main>` anywhere (`LandingLayout.tsx:12-14` `Limiter` is a `div`), `Footer.tsx:34` `as="footer"` is the only landmark; `Logo.tsx:4-18`, `Brand.tsx:10-19`, `NotFoundImage.tsx` SVGs lack `role="img"`+`<title>` or `aria-hidden`; `document.title` is always "DevConnector" (FE-29); no skip link; `CookieBanner.tsx:28` fixed overlay with no `role="region" aria-label`.
Fix: one `h1` per page via `Page` prop, `as="nav"/"main"`, `Heading` containing text only (badge outside), `aria-hidden="true"` on decorative SVGs, title per route, skip link.

### FE-44 — Medium — Color contrast and motion
Evidence: `Nav.tsx:123-125` `<Text fontSize="xs" color="gray.600">Admin</Text>` on `gray.800` in dark mode (~2.7:1, fails AA for 12 px text); `Developers.tsx:93-104` "Connect" button `bg={followColor}` = `gray.400` with `color="white"` in light mode (~2.2:1); `color="muted"` resolves to nothing (FE-28) so intended hierarchy is lost; `Page.tsx:3-12` fade/slide on every route change, `ScaleFade`/`Collapse`/`Fade` banners, `CustomAvatar.tsx:86` infinite pulse — no `prefers-reduced-motion` handling (`useReducedMotion` from framer-motion is unused).
Fix: use `gray.400` on dark / `gray.600`+ on light for small text; `colorScheme="blue"` button; `useReducedMotion()` to disable animations; define `muted` as a semantic token with checked contrast.

---

## G. DX / tooling

### FE-45 — Medium — Env handling, documentation and repo hygiene
Evidence: env vars read ad hoc in 8 files (`grep process.env`) with `!` or string interpolation (FE-12); no `.env.example`; Supabase vars are only documented implicitly by `Dockerfile:5-7`; `.env.development:1` sets only `REACT_APP_BACKEND_URL="http://localhost:8080"`. `README.md` is the untouched CRA boilerplate ("bootstrapped with Create React App", `npm run eject`), the repo root `README.md` is one line; the only architecture notes are in `WARP.md` (an AI-assistant file) and it is wrong in two places ("Socket.IO connection established on user login" — it is at import time; "Auth middleware validates tokens server-side" — one route). `.gitignore` is CRA default (no `.eslintcache`, `*.tsbuildinfo`, `.idea`, editor files); `.vscode/settings.json` is committed at the root (`{"kiroAgent.configureMCP": "Enabled"}`); a stray 93-byte `package-lock.json` sits at the repo root (an accidental `npm` run); no `.nvmrc`/`engines`, no `.gitattributes`, no `.editorconfig`; `.dockerignore` mirrors `.gitignore` but does not exclude `.git`, `README.md`, tests or `coverage`-adjacent files beyond `/coverage`.
Fix: `src/env.ts` with validation + `.env.example`; a real README (setup, env vars, Supabase SQL/RLS, Novu, run/test/deploy); `.nvmrc` `22`, `engines`; `.gitattributes`; remove the root lockfile and `.vscode`; husky + lint-staged; `scripts`: `lint`, `typecheck`, `format`, `test:ci`, `analyze`.

### FE-46 — Medium — Toolchain is end-of-life (CRA) and cannot host the declared upgrades
Evidence: `package.json:30` `"react-scripts": "5.0.1"` (last release April 2022; CRA deprecated/sunset by the React team in 2025; Jest 27, webpack 5.64, ESLint 8 frozen; peer-dep conflict with TypeScript 5 — FE-01); `react-app-env.d.ts` and `serviceWorker.ts` are CRA artifacts; no `vite.config`, no `tsc` step, no bundle analysis.
Fix: Vite + `@vitejs/plugin-react` + Vitest + `vite-plugin-checker` (or `tsc -b` in CI); `import.meta.env.VITE_*`; this is also the natural moment to do the Chakra v3 / TanStack Query v5 / router v7 migration from FE-01.

---

## H. Dependencies — status one-liners (locked version → declared version)

| package | status |
|---|---|
| react-scripts 5.0.1 | **EOL/deprecated** (CRA sunset; no releases since 2022; unpatched transitive advisories: nth-check, postcss, svgo…). Replace with Vite. |
| react-query 3.39.3 | **EOL** — superseded by `@tanstack/react-query` v4 (2022) / v5 (2023); no fixes; Novu already bundles a TanStack copy. |
| moment 2.29 → 2.30 | **Maintenance mode / legacy** per its own docs; bundles all locales under CRA; `date-fns` is already a dependency — drop moment. |
| date-fns 2.29 → 4.1 | Maintained; v3/v4 are ESM-first; `formatDistanceToNow` usage compatible. |
| @chakra-ui/react 2.5.1 → 3.30 | v2 in maintenance since v3 (Oct 2024); v3 is a different component API (FE-01). |
| @chakra-ui/icons 2.0.17 → 2.2.4 | v2-only companion; **no v3 release** — v3 docs point to `react-icons`/`lucide-react`. |
| @emotion/react, @emotion/styled 11 | Maintained; required peer of Chakra (both versions). |
| framer-motion 6.5 → 12.23 | Maintained (now the `motion` project); six majors between — `MotionValue.onChange` removed, `useScroll` fine. |
| react-router-dom 6.8 → 7.10 | Maintained; v7 = Remix merge; the APIs used still exist; `engines node >= 20`. |
| react-icons 3.11 → 5.5 | Maintained; same import paths; v5 tree-shakes better. |
| @novu/notification-center 0.12 → 2.0 | **Deprecated** by Novu in favor of `@novu/react` `<Inbox/>`; v2 is the last line; drags Mantine 5. |
| @supabase/supabase-js 2.8 → 2.86 | Maintained; API used is stable; upgrade recommended (auth fixes, `INITIAL_SESSION` event). |
| axios 1.3.3 → 1.13 | Maintained; 1.3.3 is affected by CVE-2023-45857 (XSRF-TOKEN leak) and CVE-2024-39338 (SSRF) — upgrade is warranted. |
| socket.io-client 4.6 → 4.8 | Maintained. |
| react-hook-form 7.43 → 7.68 | Maintained. |
| chakra-react-select 4.4 → 6.1 | Maintained; v4 = Chakra v2, v5+/v6 = Chakra v3 — must move together with Chakra. |
| @testing-library/react 13.4 → 16.3 | Maintained; 16 needs explicit `@testing-library/dom`; `jest-dom` 6 and `user-event` 14 fine. |
| @types/jest 28 → 30 / @types/node 12 → 24 | Type-only; 30 mismatches CRA's Jest 27; @types/node 24 needs TS ≥ 5. |
| typescript 4.9 → 5.9 | Fine for the source; conflicts with CRA's peer range (FE-01). |
| web-vitals 2.1 → 5.1 | Maintained; v3+ removed `getXXX`/`ReportHandler`, v5 removed FID → `reportWebVitals.ts` breaks. |
| react / react-dom 18.2 → 18.3.1 | Fine (18.3 adds React-19 deprecation warnings). |

---

## Ranked TOP 10 (most severe first)

1. **FE-01** PRIMARY cannot be installed or built: `package.json` declares Chakra 3 / web-vitals 5 / framer-motion 12 / TS 5 against v2-era source, and the lock still pins the old tree.
2. **FE-02** Authorization is client-side only; 9 of 11 mutating requests are anonymous and the client picks its own `profileId` (backend mirrors this).
3. **FE-03** Public anon key + `grant all privileges … to anon` → likely direct DB read/write through PostgREST unless RLS is enabled.
4. **FE-05** Every user's email is rendered on public pages and broadcast over sockets; the new `isPublic` switch is decorative.
5. **FE-04** Working test credentials pre-filled in the production sign-in form.
6. **FE-06** Socket.io connects for every visitor at module load; unauthenticated; unpublished posts and profiles broadcast to all.
7. **FE-07** Storage bucket allows anonymous arbitrary-file uploads; client does no validation; avatars fetched per component with leaking blob URLs.
8. **FE-10** Password change is a stub that reports success; Users/Dashboard/Search are mock data.
9. **FE-08** Novu feed readable by guessing sequential subscriber ids (no HMAC), identifier hard-coded.
10. **FE-09** react-query key collision (`["posts", id]` vs `["posts", profileId]`) serves wrong-shaped data and crashes the post page.
Honourable mentions: FE-14 (every push deploys to prod, no tests), FE-36 (the only test cannot even load), FE-11/FE-12 (profile-creation and blank-page auth bootstrap bugs).

## Finding counts
Critical 3 (FE-01, FE-02, FE-03) · High 14 (FE-04…FE-14, FE-20, FE-36, FE-41) · Medium 25 (FE-15…FE-18, FE-21…FE-33, FE-37…FE-39, FE-42…FE-46) · Low 4 (FE-19, FE-34, FE-35, FE-40) · explicit "no finding": XSS vectors, third-party scripts, service worker, HTTP methods. Total: 46 findings.

## Blunt verdict — keep vs rewrite

Keep (as specification, not as code):
- The **product shape**: public Home / Posts / Post detail / Developers, auth page with password + magic link + GitHub, a private area with Profile (avatar, bio, languages, public toggle), Experience/Education, My Posts with publish flag, likes, comments, live "new posts" chip, in-app notifications. It is coherent and worth re-implementing.
- The **domain types** in `src/types/*` (`Post`, `Profile`, `Comment`, `Like`, `Education`, `Experience`, `Tag`, `ProgrammingLanguage`, `PostType`) as the starting contract — regenerate them from the Prisma schema / zod rather than hand-maintaining.
- The **hook-per-operation + API-module layering** as an idea (`hooks/x/useX` wrapping a typed `api/xApi`), re-done on TanStack Query v5 with key factories and one axios instance.
- The **Signin UX** (tabs, reveal-password button with a proper `aria-label`, OAuth row) and the `ConfirmDialog` pattern (`leastDestructiveRef` is used correctly).
- A handful of small shared primitives are fine conceptually (`Page`, `Section`, `Toolbar`, `Pagination`, `Empty`, `Result`, `Loading`, `AppShell` responsive drawer/sidebar, `Search` command-palette) — but every one of them is written against Chakra v2 props, so under the declared Chakra v3 they are rewrites too.

Rewrite or delete:
- **All of auth/API transport**: `authApi`, `postApi`, `commentApi`, `likeApi`, `educationApi`, `experienceApi`, `supabase-client`, `AuthProvider`, `RequireAuth` — header scheme, identity-in-body, profile creation on sign-in, blank-screen bootstrap, no 401 handling.
- **Realtime** (`utils/constants.ts` socket singleton, `Posts.tsx` effect, `Signin.tsx` emits) — lazy, authenticated, id-only events.
- **Avatar/storage** (`CustomAvatar`, `ProfileAvatar`) — public URLs, validation, cleanup, keyboard-accessible upload.
- **Nav/menus/ProfileMenu** — labels, `MenuItem as={Link}`, role label, Novu with HMAC.
- **AddModal + Education/Experience lists** — broken validation, mislabeled columns, `any` props → one generic typed list + form.
- **Admin Users / Dashboard / UserSearch / userApi / PasswordForm / WebSocket page / InnerLayout / ColorModeSwitcher / Brand / eventBus / serviceWorker / reportWebVitals** — delete (mock or dead).
- **Legal copy, cookie banner, promo banner, footer links, manifest, README** — all template text; rewrite for what the product actually does.
- **Theme** — define the semantic tokens the components already assume, or stop using them.
- **Toolchain & delivery**: CRA → Vite + Vitest; Dockerfile (Node 22, `npm ci`, current nginx, healthcheck); nginx headers/CSP/caching; CI gated on `main` with typecheck/lint/test/build and pinned actions; tests written from zero.

Net: there is no component file that can be copied into a Chakra-v3/TanStack-v5 codebase unchanged, and the security posture of the API layer must not be carried forward. Treat this frontend as a well-documented prototype that defines the product, and rebuild it.

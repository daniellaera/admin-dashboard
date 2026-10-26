# FEATURES — functional inventory & parity checklist

Baseline: `origin/main` @ `ccfe293` plus the uncommitted local additions preserved on `wip/local-uncommitted-2026-10-26` (DECISIONS D-005). Everything listed here must exist in the rebuild unless its row says `➖ dropped` with a reason and a decision ID. Tick the **Status** column during Phase 3. Pixel-level details (every prop, colour pair, toast text) are in `appendix/features-frontend.md`; this file is the checklist.

Legend — **Src**: ✔ committed · ✚ uncommitted local addition · ⚠ mock/fake (in-memory data, `setTimeout`) · ☠ dead code (never reachable). **Status**: ⬜ todo · 🔶 partial · ✅ done · ➖ dropped (decision logged).

---

## 0. Roles in the rebuild (ADR-013, D-017 — `[USER]` amendment)

| ID | Rule | Status |
|---|---|---|
| RB-01 | Three roles `owner` / `admin` / `user`; exactly one owner (partial unique index) | ✅ |
| RB-02 | OWNER bootstrapped once via `OWNER_EMAIL`/`OWNER_PASSWORD` on first boot or `pnpm owner:create`; never created/transferred from the UI or API | ✅ |
| RB-03 | OWNER can never be demoted, disabled or deleted (admin API and self-deletion → 403) | ✅ matrix |
| RB-04 | Only OWNER grants/revokes ADMIN (promote a verified user, or admin invitation); never the `owner` role | ✅ matrix |
| RB-05 | ADMIN: moderation, catalog, disable/delete USER accounts, invite users; never changes roles, never acts on ADMIN/OWNER | ✅ matrix |
| RB-06 | Registration mode setting `open` (default) / `invite_only`; invite-only requires a single-use 72 h invitation (user invitations by OWNER/ADMIN) | ✅ |
| RB-07 | Admin invitations (OWNER + sudo): accepting creates the account or signs in an existing one, then grants ADMIN | ✅ |
| RB-08 | Sudo mode: role changes and admin invitations require the OWNER's password re-entry (`POST /auth/sudo`, 10 min) | ✅ |
| RB-09 | Role changes notify the user in-app (`system` notification) and by e-mail | ✅ |
| RB-10 | Audit log for role changes, invitations, disable/enable, delete, settings, catalog, sudo; readable by OWNER/ADMIN | ✅ |
| RB-11 | Disabling a user or changing a role revokes all their sessions immediately | ✅ |
| RB-12 | Skills/tags catalog managed by ADMIN/OWNER, seeded with the legacy 15 + 14 entries, enforced on profile/post writes | ✅ |
| RB-13 | Web UI for all of the above (users table with role/disable, invitations, settings, catalog, audit, sudo prompt) | ⬜ batch 7 |

## 1. Actors and roles (as-is)

| ID | Actor | What they can do today | Notes |
|---|---|---|---|
| ROLE-01 | Anonymous visitor | Home, public posts feed, post detail (read comments), developers directory, privacy/terms, sign-in/up | Also, because the API has no authorization, *technically* everything (AUDIT SEC-02, verified live) |
| ROLE-02 | Authenticated user | Everything above + "admin" area (`/admin/*`): dashboard, own profile (avatar, bio, skills, experiences, educations), posts CRUD, comment, like, delete own account, notification bell | There is **one** role. The UI prints a hard-coded "Admin" label under every user's name (`Nav.tsx:124`) and every signed-in user reaches `/admin`. |
| ROLE-03 | ⚠ "Admin / Member / Guest" roles | Appear only in the mock Users admin pages (`api/userApi.ts`) | No backend concept of roles. Target: real RBAC `admin` / `user` (brief). |

## 2. Data model (as-is, Prisma → Postgres `public` schema)

Tables are PascalCase quoted identifiers created by Prisma migrations (`main:backend/prisma/migrations/*`). All FKs cascade on delete since migration `20230223123750`.

| ID | Entity | Columns (type, constraints) | Relations | Status |
|---|---|---|---|---|
| DM-01 | `Profile` | `id` serial PK · `createdAt` · `updatedAt` · `avatarUrl` text? (storage object path) · `username` text? · `website` text? · `company` text? · `bio` text? · `authorEmail` text **unique** (identity key = Supabase user email) · `isPublic` bool default false (exists since the init migration but unused by committed code; ✚ exposed by the local edits) | 1-n posts, experiences, comments, likes, educations, programmingLanguages | ✅ |
| DM-02 | `ProgrammingLanguage` | `id` serial PK (+ redundant unique) · `value` text · `label` text · `profileId` FK cascade | n-1 Profile (a "skills" multi-select; rows are re-created on every profile update) | ✅ |
| DM-03 | `Post` | `id` · `createdAt` · `updatedAt` · `type` enum `PostType` default `FUNNY` · `title` text · `content` text · `published` bool default false · `viewCount` int default 0 (never incremented) · `profileId` FK cascade | 1-n comments, likes, tags | ✅ |
| DM-04 | `Tags` | `id` (+ redundant unique) · `value` · `label` · `postId` FK cascade | n-1 Post (tag multi-select, re-created on every update) | ✅ |
| DM-05 | `Comment` | `id` · `createdAt` · `text` · `postId` FK cascade · `profileId` FK cascade | — | ✅ |
| DM-06 | `Like` | `id` · `createdAt` · `postId` FK · `profileId` FK | **no unique (postId, profileId)** — uniqueness enforced in code only | ✅ |
| DM-07 | `Experiences` | `id` · `title` · `description` · `company` · `location` · `from` date · `to` date · `current` bool default true · `createdAt` · `updatedAt` · `profileId` FK | — | ✅ |
| DM-08 | `Education` | `id` · `school` · `description` · `degree` · `fieldOfStudy` · `from` date · `to` date · `current` bool default true · `createdAt` · `updatedAt` · `profileId` FK | — | ✅ |
| DM-09 | enum `PostType` | `FUNNY, TECH, RANDOM, NEWS, SERIOUS` (UI labels/order: Funny, Serious, News, Random, Tech — `constants.ts:11-17`) | — | ✅ |
| DM-10 | Option list: programming languages (15, frontend constant `types/programmingLanguage.ts`) | python/Python, typescript/TypeScript, javascript/JavaScript, ruby/Ruby, java/Java, php/PHP, golang/GoLang, c++/C++, c#/C#, clojure/Clojure, scala/Scala, kotlin/Kotlin, solidity/Solidity, rust/Rust, .net/.NET | source of the skills multi-select | ✅ (shared package constant) |
| DM-11 | Option list: post tags (14, `types/tag.ts`) | engineering/Engineering, computerscience/Computer Science, product/Product, productivity/Productivity, algorithms/Algorithms, joblife/Job Life, tech/Tech, security/Security, industrial/Industrial, it/IT, hardware/Hardware, programming/Programming, devops/DevOps, cybersecurity/Cybersecurity | source of the tags multi-select | ✅ |
| DM-12 | Supabase `auth.users` (external) | email, `encrypted_password` (bcrypt), confirmed flags, `app_metadata.provider` (`email` / `github`), identities | Linked to `Profile` **only by email string** | ✅ (→ own `users` table; import script keeps bcrypt hashes) |
| DM-13 | Supabase `storage.objects`, bucket `images` (external) | avatar files named `${Math.random()}.${ext}` at bucket root, public read, anonymous write, never deleted | `Profile.avatarUrl` stores the object path | ✅ (→ local volume) |
| DM-14 | Novu subscribers (external) | subscriberId = `Profile.id`, email | created on profile creation, deleted on profile deletion | ✅ (→ `notifications` tables) |
| DM-15 | Seed data | 4 profiles (`hulk@marvel.com` "Hulk Green", `matthewlaing@gmail.com` "Matthew Laing", `ken@jimmy.io` "Ken Jimmy", `randysmith@gmail.com` "Randy Smith") with 6 published lorem-ipsum posts (`prisma/seed.ts`) | — | ✅ (seed users with passwords + admin for the new auth) |
## 3. Backend HTTP API (as-is, Express, base `/api/v1`)

**Auth** column = what the server actually enforces (confirmed by live probing, `appendix/run-as-is.md` §3.2). `JWT` = `auth` middleware (`middleware/auth.ts`): verifies an HS256 Supabase access token found in `Authorization: <anything> <token>`; it does **not** attach the user to the request, so no handler knows who is calling.

| ID | Method & path | Auth | Request | Response / behaviour | Status |
|---|---|---|---|---|---|
| API-01 | `GET /` and `GET /api/v1` | none | — | `{message: "🦄…"}` / `{message: "API - 👋🌎🌍🌏"}` (used by the 4 existing tests) | ✅ (→ `/health`, `/ready`) |
| API-02 | `GET /api/v1/emojis` | none | — | `["😀","😳","🙄"]` — starter-template leftover, unused by the UI | ➖ drop (starter leftover; no UI usage) |
| API-03 | `GET /posts` | none | — | all **published** posts, newest first, each with `profile{username,authorEmail,avatarUrl}`, `comments[{profile(full), text}]`, `likes[]`, `tags[]`. No pagination (client slices 5/page). | ✅ |
| API-04 | `GET /posts/postsByProfileId/:profileId` | none | — | all posts of a profile **including drafts** (used by admin Posts list) | ✅ (owner-only) |
| API-05 | `GET /posts/post/:id` | none | — | one post incl. drafts, with `profile{id,username,authorEmail,avatarUrl}`, `comments`, `tags{value,label}`; on error returns 200 `{error}` | ✅ (drafts owner-only) |
| API-06 | `POST /posts/create` | JWT (identity not checked) | `{title, content, type, published, profileId, tags:[{value,label}]}` | creates post for **body-supplied** `profileId`; `tags` via buggy `connectOrCreate` (AUDIT CQ-01); 400 `{error:'Unauthorized'}` on any exception | ✅ (profileId from session) |
| API-07 | `PUT /posts/updateById/:postId` | **none** (verified) | `{title, content, type, published, tags}` (UI sends the whole loaded post object) | deletes all tags of the post then updates; same tag bug | ✅ (owner/admin) |
| API-08 | `DELETE /posts/deleteById/:id` | **none** (verified) | — | deletes post (cascades comments/likes/tags) | ✅ (owner/admin) |
| API-09 | `GET /profile` | none | — | **all** profiles (every email) with `programmingLanguages{label}`; `isPublic` ignored. Feeds the Developers page. | ✅ (public profiles only, no email for strangers) |
| API-10 | `GET /profile/findProfileByEmail/:authorEmail` | none | — | profile with `experiences`, `programmingLanguages{value,label}`; `null` if none | ✅ (→ `GET /me`) |
| API-11 | `POST /profile/create` | **none** | `{authorEmail}` | creates a profile for any email (called by the SPA after sign-up and after *requesting* a magic link) + Novu `subscribers.identify` | ✅ (server-side on registration) |
| API-12 | `POST /profile/createProfileBySocial/:email` | **none** | — | idempotent get-or-create (called by the SPA on every GitHub `onAuthStateChange`) | ✅ (server-side in OAuth callback) |
| API-13 | `DELETE /profile/delete/:profileId` | token read but **not** required for the delete | `Authorization: token <jwt>` | deletes the profile by id (cascade: posts, comments, likes, experiences, educations, skills), then deletes the **caller's** Supabase auth user (`auth.admin.deleteUser`) and the Novu subscriber | ✅ (self or admin; delete own user + sessions + avatar file) |
| API-14 | `PUT /profile/updateById/:profileId` | **none** (verified) | `{username, website, company, bio, avatarUrl, programmingLanguages:[{value,label}]}` (✚ `isPublic`; UI sends the whole loaded profile) | deletes all skills then updates profile with buggy `connectOrCreate` | ✅ (self only) |
| API-15 | `GET /experience` | none | — | all experiences of everyone (unused by UI) | ➖ drop as global list; keep per-profile |
| API-16 | `POST /experience/create` | **none** | `{title, description, company, location, from, to, current, profileId}` (`from`/`to` `yyyy-mm-dd` from `<input type=date>` → `parseISO`) | creates | ✅ (self only) |
| API-17 | `GET /experience/experienceByProfileId/:profileId` | none | — | list | ✅ |
| API-18 | `GET /education` | none | — | all educations (unused) | ➖ same as API-15 |
| API-19 | `POST /education/create` | **none** | `{school, description, degree, fieldOfStudy, from, to, current, profileId}` | creates | ✅ (self only) |
| API-20 | `GET /education/educationByProfileId/:profileId` | none | — | list | ✅ |
| API-21 | `POST /comments/create` | **none** (verified) | `{text, profileId, postId}` | creates (any profileId) | ✅ (profileId from session) |
| API-22 | `GET /comments/commentsByPostId/:postId` | none | — | newest first, each with the **full** commenter profile | ✅ (public subset of profile) |
| API-23 | `POST /likes/create` | **none** (verified) | `{profileId, postId}` | 400 `{error:'You cannot like a post twice'}` if that profile already liked; else creates. No unlike. | ✅ (keep "like once"; add unlike as toggle) |
| API-24 | 404 fallback | — | — | JSON `{message, stack}` (stack hidden only when `NODE_ENV=production`) | ✅ (problem+json, no stack) |
| API-25 | ✚ `router.use("/fetchByDateArrow/:postId", auth)` | — | — | WIP-only line that mounts the auth middleware on a path with no handler | ➖ dead |

Missing today but implied by the UI or the brief (new in the rebuild): update/delete experience & education (UI only adds), unlike, server-side pagination, `GET /me`, users administration, notification inbox, email/password management, password reset, email verification.

**Privacy rule (D-013 Q4, `[USER]`):** no public endpoint or page ever returns or renders a user's e-mail. Author cards and public profiles expose `displayName` (= `username`, else `Developer #<id>`) and the avatar only. E-mails appear only in `GET /auth/me`, `GET /me/*` (owner) and `GET /admin/*` (admins). Every endpoint returning user data is covered by the authorization matrix (anonymous / other user / owner / admin) in the integration tests — this is checklist item **PRIV-01** ✅ (authz-matrix.test.ts, PRIV-01 block).

## 4. Authentication & account flows (as-is)

| ID | Flow | As-is behaviour (evidence) | Target (brief) | Status |
|---|---|---|---|---|
| AU-01 | Sign up (email + password) | Signin page in "Register" mode: `supabase.auth.signUp` then `POST /profile/create {authorEmail}` from the browser (`authApi.ts:58-68`); Supabase sends its confirmation e-mail (project setting). Form pre-filled with `janedane@gmail.com` / `123456` (`Signin.tsx:61-63`). Validation: both fields `required` only, no email pattern. On success navigate to `from` or `/`. | own `/auth/register` → user + profile in one transaction, argon2id, verification e-mail over SMTP | ✅ |
| AU-02 | Sign in (email + password) | `signInWithPassword`; on success emits socket `new-user-add` (✚) and navigates to `location.state.from` or `/` (`Signin.tsx:93-105`); error toast shows the raw error (`AuthApiError: Invalid login credentials`). Password field has a reveal/mask eye toggle. Submit disabled until valid. | `/auth/login` → DB session cookie (httpOnly/Secure/SameSite), rate-limited, generic error message | ✅ |
| AU-03 | Magic link | Second tab: `signInWithOtp({email})` **then immediately** `POST /profile/create` for that email (`authApi.ts:41-48`); toast title "Account confirmed." description "Check your email for the login link"; navigates away | e-mail login link over SMTP (signed single-use token); profile created only after the link is used | ✅ |
| AU-04 | GitHub OAuth | `signInWithOAuth({provider:'github'})` (not awaited, catch unreachable); on every `onAuthStateChange` with `app_metadata.provider === 'github'` the SPA calls `POST /profile/createProfileBySocial/:email` (`AuthProvider.tsx:26-29`). Google and Twitter buttons exist but only `console.log` (`Signin.tsx:138-152`). | GitHub OAuth App via `arctic`; Google/Twitter buttons dropped (never worked) | ✅ |
| AU-05 | Session persistence | supabase-js stores access+refresh tokens in `localStorage` (`sb-<ref>-auth-token`); `AuthProvider` renders **nothing** until `getSession()` resolves | server session table + cookie; `GET /me` on boot with a loading skeleton | ✅ |
| AU-06 | Sign out | `supabase.auth.signOut()`; toast "Signed out"; `localStorage.removeItem('user')` (leftover); from the admin ProfileMenu it navigates to `/signin`, from the landing Nav it stays | `POST /auth/logout` deletes the session row + cookie; same navigation | ✅ |
| AU-07 | Route guard | `<RequireAuth>` redirects to `/signin` with `state.from` when there is no user (`RequireAuth.tsx:12-15`); `/signin` is reachable while logged in | same UX + role guard for admin-only pages; redirect away from `/signin` when logged in | ⬜ |
| AU-08 | Password change | ⚠ `PasswordForm` ("Change password": New Password + Confirm Password, mismatch message "Your passwords do no match", no min length) calls `updatePassword()` which is a 2 s `setTimeout` returning `true` (`authApi.ts:108-114`) — **nothing is changed**; toast "Your password has been updated" | real `POST /auth/password` (current + new, strength rule) | ✅ |
| AU-09 | Delete account ("Danger zone") | tab with red "Delete Account" → `AlertDialog` "Delete Profile" / "Are you sure? You can't undo this action afterwards." / Cancel / Delete → `DELETE /profile/delete/:id` with the access token → toast "Your profile has been deleted" (top) → `signOut()` (`DangerZone.tsx:28-45`). Server deletes the profile row, then the caller's Supabase user, then the Novu subscriber | same UX; server deletes user, sessions, profile, avatar file in one transaction | ✅ |
| AU-10 | Toasts on auth events | "Signed in" / "Signed out" info toasts from `onAuthStateChange` | keep | ✅ |
| AU-11 | Password reset / forgot password | **absent** | required by brief (SMTP) | ✅ |
| AU-12 | E-mail verification | delegated to Supabase (project setting, not visible in code) | required by brief (SMTP) | ✅ |
| AU-13 | RBAC | **absent** (see ROLE-02) | `admin` / `user`; first seeded user is admin | ✅ |
## 5. Storage — avatars (as-is)

| ID | Feature | As-is | Target | Status |
|---|---|---|---|---|
| ST-01 | Upload avatar | `CustomAvatar.tsx` (ProfileForm only): hidden `<input type=file id="avatarUrl" accept="image/*">` opened by a `<label htmlFor="avatarUrl">Upload</label>` button; file stored in Supabase bucket `images` as `${Math.random()}.${ext}` at the bucket root (no size/type check, anonymous insert policy, old files never deleted); `onUpload(path)` writes the path into the form's `avatarUrl`, persisted only when the profile form is saved; errors via `alert()` | `POST /api/files/avatar` (multipart, ≤ 2 MB, png/jpeg/webp sniffed, resized to 256 px WebP via sharp, stored on a volume, served by the API; old file removed) | ⬜ |
| ST-02 | Display avatar | `ProfileAvatar.tsx` (Nav, ProfileMenu, BlogAuthor, Developers) and `CustomAvatar.tsx` download the blob with `storage.from('images').download(path)` and create an object URL per instance (no caching, never revoked); fallback = Chakra `Avatar` initials from `avatarName` = `truncate(email)` (first 10 chars + "…") | `<img src="/api/files/avatars/<id>">` with cache headers; initials fallback from username/email | ⬜ |
| ST-03 | Avatar "pulse ring" animation (teal ring, 2.25 s loop) around the avatar in the profile form | Emotion `keyframes` on a `_before` pseudo-element | keep (CSS) | ⬜ |

## 6. Realtime (as-is: Socket.IO, client-driven broadcasts)

| ID | Event | Emitter → receiver | Payload | UI effect | Target | Status |
|---|---|---|---|---|---|---|
| RT-01 | `createPost` → `postBroadcasted` | PostForm after a successful create (`PostForm.tsx:69`) → server rebroadcasts to all other sockets (`app.ts:27-29`) | `{post, username}` | Public feed shows a centred blue "New posts ↓" chip (`ScaleFade`); clicking refetches and hides it (`Posts.tsx:36-43, 73-88`); listener registered without cleanup | SSE channel `posts` published by the server when a post is published | ⬜ |
| RT-02 | `addComment` → `commentBroadcasted` | CommentForm after create (`CommentForm.tsx:49`) → broadcast + **Novu trigger to the post author** (`app.ts:35-40`) | `{post, profile, comment}` | No UI listener for `commentBroadcasted` (only the notification) | server-side: insert notification → NOTIFY → SSE to the author; SSE channel `post:<id>` for live comments (improvement) | ⬜ |
| RT-03 | ✚ `new-user-add` / `get-users` | Signin emits, listens (`Signin.tsx:97-100`); **no server handler** | email | `console.log('users online')` | ➖ drop (never implemented server-side) | ➖ |
| RT-04 | ☠ `createTask` | `pages/admin/WebSocket.tsx` (route commented out, hard-coded `io("http://localhost:8080")`) | `{task, userId}` | none | ➖ dead | ➖ |
| RT-05 | Socket connection | opened at module load for **every** visitor (`constants.ts:29`), CORS wide open | — | — | SSE opened only on pages that need it; same-origin | ⬜ |

## 7. Notifications (as-is: Novu)

| ID | Feature | As-is | Target | Status |
|---|---|---|---|---|
| NT-01 | Subscriber lifecycle | `novu.subscribers.identify(profileId, {email})` on profile create (`profile.ts:52,74`), `subscribers.delete` on profile delete (`profile.ts:98`) | implicit (users table) | ⬜ |
| NT-02 | "Someone commented on your post" | `novu.trigger('comment-template', {to:{subscriberId: postProfileId}, payload:{username: commenterEmail, postId}})` (`commentNotification.ts:5-12`) fired from the socket handler, i.e. **triggerable by any client for any profile**; produced only when the comment is added through the UI (REST + socket emit) | `notifications` row `type='comment'` for the post author (not for self-comments), SSE push, optional e-mail per preference | ⬜ |
| NT-03 | In-app inbox | Navbar bell (`NovuProvider subscriberId={profile.id} applicationIdentifier='vTbMIBFNZdXt'` + `PopoverNotificationCenter`, `Nav.tsx:91-106`), landing Nav only (not in the admin shell), only when signed in: unseen count badge, popover list, click → `/posts/:postId`, dark/light aware, user preferences hidden, no footer | own bell + popover in **both** shells: unread count, paginated list, mark read / mark all read, click-through; preferences page (per type: in-app / e-mail) | ⬜ |
| NT-04 | "New post" notification | commented out (`app.ts:32`) | optional type `new_post` (off by default) — not required for parity | ⬜ (nice-to-have) |
| NT-05 | E-mail notifications | none (Novu templates had no e-mail channel in code) | brief requires SMTP e-mails with templates (verification, reset, magic link, comment notification per preference) | ⬜ |

## 8. Frontend shell, routes and screens (as-is)

Provider nesting: `StrictMode → QueryClientProvider (defaults) → ColorModeScript → ChakraProvider (stock theme, no extendTheme) → BrowserRouter → CookieBanner → AuthProvider → Routes` (`App.tsx`, `index.tsx`). 16 active routes, 3 commented out (`/login`, `/signup`, `/admin/websocket`).

### 8.1 Shell components

| ID | Component | As-is | Status |
|---|---|---|---|
| SH-01 | `LandingLayout` | `PromoBanner` → fixed `Nav` → content with 65 px top padding inside `Limiter` (responsive horizontal padding) → `Footer` | ⬜ |
| SH-02 | `PromoBanner` | gradient banner "We just launched our new product.", closable, **not persisted** (reappears on reload) | ⬜ (keep; make dismissal persistent or drop text → decision at implementation: keep component, configurable text) |
| SH-03 | `Nav` (landing navbar) | left (≥ md): "DevConnector 🚀" → `/`, "Posts", "Developers"; logged-out (≥ md): "Login" ghost + "Register" solid blue (both → `/signin`) + dark-mode icon button; right: Novu bell (signed in) + avatar menu (signed in: avatar, username, "Admin" label, chevron; logged out on mobile: hamburger). Menu signed-in: Profile (`/admin/profile`), Admin (`/admin`), ─, ✚ Home, Posts, Developers, ─, Toggle theme, Logout. Menu logged-out: Toggle theme, ─, Posts, Developers, Login, Register (semibold) | ⬜ |
| SH-04 | `Footer` | tagline "Admin dashboard built with React & ChakraUI"; columns Resources (Live preview → `/admin`, Documentation → `/`, Github → `https://github.com/` external) and Legal (Terms, Privacy, Licence → `/license` **unrouted → 404**); "© 2023 DevConnector. All rights reserved." | ⬜ (fix links: GitHub repo URL, licence page or drop) |
| SH-05 | `AdminLayout` / `AppShell` | 280 px fixed sidebar (drawer below `md` with hamburger in the header): "Home Page" back button; nav items Dashboard (`/admin`), Users (`/admin/users`), Profile (`/admin/profile`), Posts (`/admin/posts`), "404 Page" (`/404` → NotFound), commented "Tasks"; footer `ProfileMenu` (avatar + username + email, menu "Sign out" → `/signin`); content header: `UserSearch` + dark-mode toggle; no active-route highlight; content in `Container maxW 7xl` | ⬜ (drop the "404 Page" demo link) |
| SH-06 | `UserSearch` modal (admin header) | search icon → modal with input "Search the users" (≥ 2 chars), results "First Last / email" → `/admin/users/:id`, "No result found!" — ⚠ mock data | ⬜ (real admin user search) |
| SH-07 | `CookieBanner` | §9 UX-02 | ⬜ |
| SH-08 | Shared primitives | `Page` (fade / slideFade), `Loading` (spinner), `Empty` (warning icon + message), `Result` (alert), `Toolbar`, `Pagination` ("x–y of n", Previous/Next), `Section*`, `Form*` (`FormLine`), `Banner*`, `AddModal` (generic modal form: text fields + date fields + "Current position?" checkbox) | ⬜ |

### 8.2 Screens

| ID | Route → Page | Guard | Data | Actions / content | Status |
|---|---|---|---|---|---|
| UI-01 | `/` → `Home` | public | — | hero: gradient "Dev Connector" + " dashboard", "Connecting with Developers has never been so easy!", buttons "Developers" (`/developers`) and blue "Dashboard" (`/admin`); "Technologies / Built with" grid of 18 check-marked bullets (React, Supabase, Realtime with SocketIO, Notification Provider with Novu, Containerized with Docker, Styled with ChakraUI, Written in TypeScript, Create React App (CRA) as toolchain, Data fetching with React Query, Form handled by React Hook Form, Code hosted on Github, CI/CD with Github actions, Deployed on Fly.io, 100% Responsive, Dark/Light mode support, Theming, Best Practice, Clean code) | ⬜ (bullets updated to the new stack) |
| UI-02 | `/signin` → `Signin` | public | — | Logo; heading "Sign in to your account" ↔ "Register a new account" with toggle link "Sign up" / "Log in" ("Don't have an account?" / "Already a User?"); card with tabs "Username/Password" (email, password with eye toggle, submit "Sign in"/"Register", "or continue with", 3 provider icon buttons GitHub/Google/Twitter) and "Magic Link" (email, "Send magic link", loading text "Sending magic link ..."); flows AU-01..04 | ⬜ (Google/Twitter dropped; add "Forgot password?") |
| UI-03 | `/privacy` → `Privacy` | public | — | prose page: tag "Updated on Apr 12, 2022", title "Privacy Policy", sections What we collect (Creation of an account / Analytics / Social Media), Purpose (4 bullets), Changes, Contact us (placeholder "please contact us at ...") — generic template text | ⬜ (keep structure, truthful content, contact from env) |
| UI-04 | `/terms` → `Terms` | public | — | prose page: "Updated on Apr 12, 2022", "Terms of Service", General, Changes, Contact us (placeholder) | ⬜ |
| UI-05 | `/posts` → public `Posts` feed | public | API-03 | 5 per page (client-side), each: title + random-colour type badge, content, author line (avatar, `username or email - 19th February 2023`), tag chips, like button with count (disabled + tooltip "you must be logged in to like the post" when logged out; "Smash the like button!" when in), comment-count button → detail; "New posts" realtime chip (RT-01); states: Empty "Posts will show up here!", Loading, Result "Oops!" | ⬜ (server pagination, stable badge colours) |
| UI-06 | `/posts/:id` → public `Post` detail | public (comment needs session) | API-05 + API-22 | toolbar "Post {id}" + "Back" → `/posts`; title, content, author line; `CommentForm` (input "write your comment here", rounded, "Add" button, toast "{text} has been added", socket RT-02) when signed in else Empty "You need to login to comment the post"; comments list (text + author line by e-mail + date); no like button here, no edit/delete | ⬜ (author lines show `displayName`, never e-mail — PRIV-01; like button added here too) |
| UI-07 | `/developers` → `Developers` | public | API-09 | card grid (`minmax(300px,1fr)`): avatar, ✚ bold username + green outline badge "Developer" + e-mail (✔ was "username - email" / "company - website" + ⋮ menu button), bio, skill tags, footer button ✚ "Connect" with user-plus icon (✔ "Follow") — **no handler**; states Empty "Developers will show up here!", Loading, Result | ⬜ (public profiles only; **no e-mail — show company/website instead** (PRIV-01); Connect/Follow button dropped — MK-06) |
| UI-08 | `*` → `NotFound` | public | — | theme-aware illustration, "Oops", "Sorry, we couldn't find the page you're looking for.", "Back to home"; rendered without Nav/Footer | ⬜ |
| UI-09 | `/admin` → `Dashboard` | session | ⚠ `fetchUserStats` | stat cards "Total Users" / "Active Users" / "Disabled Users"; card "User Roles" (Member, Guest, Admin with `n/total` + progress bars); card "User Status" (circular progress active %, legend Active/Disabled); lists "Recently Added" / "Recently Updated" (avatar initials, name, email, `formatDistanceToNow`) | ⬜ (real metrics: users, posts, comments, likes, recent sign-ups; roles admin/user) |
| UI-10 | `/admin/profile` → `Profile` | session | API-10, API-17, API-20 | toolbar "Profile"; card "Profile details" with soft-rounded tabs **Profile** (`ProfileForm`), **Password** (`PasswordForm`, AU-08), **Danger Zone** (red tab, AU-09); below: `ExperienceList` and `EducationList` cards | ⬜ |
| UI-10a | `ProfileForm` | | API-10 → API-14 | "Edit profile": User Avatar (CustomAvatar + "Upload" label-button, ST-01), ✚ "Public" switch with note "If you make your profile public it will be visible by everyone", Username, Website, Company (all `required`), Bio textarea (`required`; error message wrongly shows the company error), Programming Languages multi-select (chakra-react-select, DM-10, "Pick programming languages"); "Save" → toast "Your profile has been updated" | ⬜ (website/company optional is an acceptable improvement; keep required username) |
| UI-10b | `ExperienceList` | | API-17 → API-16 | card "Experiences" + "Add" → `AddModal` "Add Experience" (Title, Description, Company, Location text fields + From/To date inputs + "Current position?" checkbox, all required, "Save"); table Title / Description / Company / Location / From - To (`2/19/2023-3/1/2023`) / Current (✅/❌); Empty "Experiences will show up here!"; toast "experience has been added"; **no edit/delete** | ⬜ (add edit/delete; `to` optional when current) |
| UI-10c | `EducationList` | | API-20 → API-19 | same shape: "Education", `AddModal` "Add Education" (School, Description, Degree, Field of study + dates + checkbox); table headers wrongly say Company/Location for Degree/Field of study; toast "education has been added"; Empty "Education will show up here!" | ⬜ (fix headers; add edit/delete) |
| UI-11 | `/admin/users` → `Users` | session | ⚠ `fetchUsers` | toolbar "Users" + "Add User" → `/admin/users/new`; card "Users table": Name, Status (badge Active green / Disabled), Role, Actions (edit → `/admin/users/:id`, delete → `AlertDialog` "Delete User" → toast "{name} has been removed"); 5 per page; Empty "Users will show up here!" | ⬜ (real, **admin-only**; MK-01) |
| UI-12 | `/admin/users/new`, `/admin/users/:id` → `User` | session | ⚠ `fetchUserById` | toolbar "Add user" / "Update user {id}" + "Back"; card "User form" (`UserForm`: First name, Last name required; Role select Admin/Member (mock data also has Guest); checkbox "Tick the box to disable the user"; "Save" → toast "... has been added/updated"); side card "Help" with two inert links ("Read documentation", "Chakra UI documentation") | ⬜ (real admin user form: role admin/user, disabled flag; drop Help card) |
| UI-13 | `/admin/posts` → admin `Posts` | session | API-10 → API-04 | toolbar "Posts" + "Add Post"; card "Posts table": Title (truncated 10 chars), Content (truncated), Status (badge "Public" green / "Private"), Actions edit → `/admin/posts/:id`, delete → `AlertDialog` "Delete Post" → API-08 → toast "Post {id} has been removed"; 5 per page; Empty "Posts will show up here!" | ⬜ |
| UI-14 | `/admin/posts/new`, `/admin/posts/:id` → admin `Post` | session | API-05 | toolbar "Add post" / "Update post {id}" + "Back"; card "Post form" (`PostForm`: header "Add Post" even in edit mode; title `required`, content textarea `required`, checkbox "Tick the box to make the post public", type select (DM-09 order), tags multi-select "Pick post tags" (DM-11); "Save"): create → API-06 (with JWT) → toast "post has been added" → `/admin/posts` + socket RT-01; update → API-07 → toast "{title} {content} has been updated" (stays); side card "Help" (inert) | ⬜ |
| UI-15 | `/admin/websocket` → `WebSocket` | — | — | ☠ todo demo, route commented out | ➖ dead |

## 9. Cross-cutting UX (as-is)

| ID | Feature | As-is | Status |
|---|---|---|---|
| UX-01 | Dark / light mode | Chakra `ColorModeScript` (initial light, no system), toggles in Nav menu ("Toggle theme"), logged-out Nav icon, admin header icon; persisted by Chakra in localStorage; every surface has light/dark colour pairs | ⬜ (system preference + toggle) |
| UX-02 | Cookie consent banner | bottom-right banner with info icon, "We use third-party cookies to deliver our services, to personalize ads, and to analyze traffic. Read our Cookie Policy." (→ `/privacy`), "I agree" stores `cookies-consent=true` in localStorage | ⬜ (keep banner; truthful text — only first-party session cookie) |
| UX-03 | Responsive layout | Chakra breakpoints; sidebar→drawer at `md`; Nav links hidden below `md`; grids collapse to 1 column | ⬜ |
| UX-04 | Toasts | Chakra toasts (bottom, 5 s; some `position: top`) for every mutation; generic error text "Something went wrong! If the problem persists, contact us!" | ⬜ |
| UX-05 | Loading / empty / error states | `Loading`, `Empty` (per-screen messages above), `Result` "Oops!" | ⬜ |
| UX-06 | Pagination | client-side `Pagination` ("1–5 of 11", Previous/Next), 5 per page on feed, admin posts, admin users | ⬜ (server-side, same control) |
| UX-07 | Page transitions | framer-motion `Page` fade (public pages) / slideFade (admin pages, forms); Chakra `Fade`/`ScaleFade`/`Collapse`; Navbar shadow on scroll | ⬜ (CSS transitions acceptable) |
| UX-08 | Theme tokens | stock Chakra theme; 27 references to an undefined `muted` colour and to `primary*`, `surface`, `dark-sm`, `md-dark` tokens that resolve to nothing (design debt, not features) | ⬜ (define semantic tokens: muted, primary, surface) |
| UX-09 | Date formatting | `moment` `Do MMMM YYYY` (feed, detail, comments), `moment` `l` (CV tables), `date-fns` `formatDistanceToNow` (dashboard) | ⬜ (one library; same display formats) |
| UX-10 | PWA leftovers | CRA default `manifest.json` ("React App"/"Create React App Sample"), `serviceWorker.unregister()`, `reportWebVitals()` no-op, `robots.txt`; `index.html` title "DevConnector", non-standard `<meta name="DevConnector">` | ➖ drop service worker; fix manifest/meta/favicons |
| UX-11 | Random badge/tag colours | `getRandomColor()` per render for post-type badges and tag chips | ⬜ (stable colour per type/tag) |
| UX-12 | Icons | `@chakra-ui/icons` + `react-icons` (bi, gi, fi, hi) + custom GitHub/Google/Twitter SVGs | ⬜ (one icon set) |

## 10. Mocked features (must become real or be explicitly dropped)

| ID | Feature | As-is | Decision |
|---|---|---|---|
| MK-01 | Users administration (`/admin/users*`): table, search, create/edit form (first/last name, role, disabled), delete | in-memory array of 11 fake users, `setTimeout` promises; add/update/delete never change the list (`api/userApi.ts`) | ⬜ implement for real, **admin-only**, over the new `users` table (role, disabled flag) — STOP question |
| MK-02 | Dashboard stats (count, by role, by status, recently added/updated) | computed from the fake array ("Recently Added" shows the 3 **oldest**) | ✅ API `/admin/stats` (UI in batch 7) — real counts (users, posts, comments, likes; recent sign-ups) |
| MK-03 | Password update form | fake success after 2 s | ✅ API `PUT /auth/password` (UI in batch 7) |
| MK-04 | `fetchAuthUser` ("John Smith") | never called | ➖ unused |
| MK-05 | Google / Twitter sign-in buttons | `console.log` only | ➖ drop (would need new OAuth apps; brief allows GitHub only) |
| MK-06 | "Follow"/"Connect" button on developer cards | no handler, no backend concept | ➖ drop (no follow model exists; re-add only with a real feature) |
| MK-07 | "Help" cards on admin forms, footer "Documentation"/"Github" generic links, "404 Page" sidebar demo link, "Licence" → `/license` | inert or wrong targets | ➖ drop Help cards and 404 demo link; footer links point at the real repo / licence |
| MK-08 | Hard-coded "Admin" label under the user name | literal text | ⬜ show the real role |

## 11. Dead code (not ported)

`pages/admin/WebSocket.tsx`, `layouts/InnerLayout.tsx`, `components/shared/Brand.tsx`, `components/shared/ColorModeSwitcher.tsx`, `utils/eventBus.ts`, `logo.svg`, `api/emojis.ts` (backend), `fetchAuthUser`, commented `onAuthStateChanged`, unused constants (`DISABLED_PROFILE_TEXT`, `DELETE_BUTTON_TEXT`, `UPLOAD_PICTURE_DISABLED_TEXT`), ✚ `fetchByDateArrow` mount, ✚ `new-user-add`/`get-users`, ✚ unused `PostFormProps` extras. Grep evidence in `appendix/features-frontend.md` §11.

## 12. Operations features (as-is)

| ID | Feature | As-is | Target | Status |
|---|---|---|---|---|
| OPS-01 | Containers | backend `node:16-bullseye-slim` multi-stage, frontend `node:17-alpine` → `nginx:1.19` serving the CRA build with SPA fallback + gzip. **Neither image builds any more** (`appendix/run-as-is.md` §3.4) | `node:26-alpine` multi-arch images, compose for dev and prod | ⬜ |
| OPS-02 | Deployment | Fly.io apps `devconnector-backend` (8080) and `devconnector-frontend` (80), TCP checks, force HTTPS | target-agnostic compose behind Nginx Proxy Manager | ⬜ |
| OPS-03 | CI | GitHub Actions: on every push, path-filtered `flyctl deploy` of backend and/or frontend; no tests | GitHub + Gitea Actions: lint, typecheck, test, build, multi-arch image | ⬜ |
| OPS-04 | DB migrations | Prisma migrate run manually from a laptop against Supabase (README) | versioned SQL migrations run by the API on start (or a one-shot job) | ✅ |
| OPS-05 | Seed | `prisma db seed` | `pnpm db:seed` (dev) | ✅ |
| OPS-06 | Logs / health | `morgan('dev')`, `console.log`; no health endpoint | pino, `/health`, `/ready` | ⬜ |

## 13. Uncommitted feature edits extracted from the WIP snapshot (D-014, `[USER]`-requested)

| ID | WIP edit | Parity item | Status |
|---|---|---|---|
| WIP-01 | Profile "Public" switch + `isPublic` on update | UI-10a, API-14, enforced in API-09 (default public, Q4) | ⬜ |
| WIP-02 | Developers card redesign (bold username + "Developer" badge, wider grid, empty bio fallback) | UI-07 layout (without the e-mail line, PRIV-01; without the Connect button, MK-06) | ⬜ |
| WIP-03 | "Home" entry in the signed-in navbar menu | SH-03 | ⬜ |
| WIP-04 | Duplicate-like guard | API-23 via `PRIMARY KEY (post_id, user_id)` | ⬜ |
| WIP-05 | Idempotent seed (`upsert`) | OPS-05 | ⬜ |
| WIP-06 | Presence socket events, unused `PostForm` props, `fetchByDateArrow` mount, Prisma datasource tweaks | — | ➖ dropped (D-014) |

## 14. Parity summary

| Area | Rows | Keep | Drop (decision) |
|---|---|---|---|
| Data model | DM-01..15 | all entities, both option lists, seed personas | external stores replaced |
| API | API-01..25 | 20 endpoints re-implemented with auth + validation | API-02, 15, 18, 25 |
| Auth flows | AU-01..13 | 10 + 3 new (reset, verification, RBAC) | Google/Twitter buttons |
| Storage | ST-01..03 | 3 | — |
| Realtime | RT-01..05 | 2 behaviours (new-post chip, comment notification) | RT-03, RT-04 |
| Notifications | NT-01..05 | bell/inbox + comment notification; + e-mail + preferences (brief) | — |
| Shell & screens | SH-01..08, UI-01..15 | 14 screens, 8 shell parts | UI-15, Help cards, 404 demo link |
| UX | UX-01..12 | all | service worker |
| Mocked | MK-01..08 | MK-01/02/03/08 become real | MK-04/05/06/07 |

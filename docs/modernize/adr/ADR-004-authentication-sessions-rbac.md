# ADR-004 — Authentication, sessions, CSRF, rate limiting and RBAC (replacing Supabase Auth)

Status: proposed (2026-10-26) · Brief: argon2id, DB-backed sessions in httpOnly/Secure/SameSite cookies, CSRF, login rate limiting, password reset + e-mail verification over SMTP, RBAC admin/user, GitHub login via a GitHub OAuth App, bcrypt hashes from `auth.users` keep working with rehash on next login.

## Context

Today identity is Supabase Auth (email+password, magic link, GitHub), tokens live in `localStorage` (AUDIT SEC-05), the API verifies only a signature and never binds a request to a user (SEC-02/06, ARC-01), profiles are created by the browser (ARC-02, SEC-18), roles do not exist (ARC-04), and there is no rate limiting (SEC-11). Parity requires: email+password sign-up/sign-in, magic link, GitHub, sign-out, account deletion, "signed in/out" toasts; the brief adds verification, reset, RBAC.

## Decision

### Library choice: hand-rolled on small, audited primitives

| Need | Choice | Why not the alternatives |
|---|---|---|
| Password hashing | `@node-rs/argon2` (napi-rs; prebuilt for linux x64/arm64, gnu+musl) — **argon2id**, OWASP-recommended parameters `memoryCost 19456 KiB, timeCost 2, parallelism 1` | `argon2` (node-gyp) needs a C toolchain in multi-arch Docker builds; Node's built-in `scrypt` is fine but the brief says argon2id |
| Legacy bcrypt verification | `bcryptjs` (pure JS) | zero native risk for a path used once per migrated user; hash prefix `$2a$/$2b$` vs `$argon2id$` selects the verifier; on success the password is rehashed with argon2id and the row updated |
| Session ids / tokens | `crypto.randomBytes(32)` base64url; **only the SHA-256 of the token is stored** | DB leak does not yield usable sessions/links |
| OAuth (GitHub) | `arctic` 3.x (GitHub provider, PKCE/state helpers) | `better-auth`/`lucia`-style frameworks add a second data model and their own migrations; `lucia` itself is deprecated in favour of "write it yourself" guides, which is what we do |
| Cookies | `hono/cookie` with `httpOnly; Secure; SameSite=Lax; Path=/` (`Secure` governed by `COOKIE_SECURE`, true in prod) | — |
| CSRF | `hono/csrf` (rejects state-changing requests whose `Origin`/`Sec-Fetch-Site` is not our origin) **plus** SameSite=Lax cookies **plus** JSON-only bodies for mutations (multipart only on the avatar route, still Origin-checked) | A synchronizer token is unnecessary for a same-origin SPA API; this layered approach is what OWASP recommends for Lax cookies. If the SPA is ever served from another origin, add a double-submit token (one middleware). |
| Rate limiting | in-process sliding window keyed by `ip` and by `ip+email` for `/auth/*` (login 10/min/IP, 5 failures/15 min/account → 429 with `Retry-After`; register 5/h/IP; reset & magic-link requests 3/15 min/e-mail); generic 300 req/min/IP on `/api`; behind a trusted proxy the client IP comes from `X-Forwarded-For` only when `TRUST_PROXY=true` | single-node deployment (ADR-010); the limiter is behind an interface so a Postgres-table or Redis store can replace it if the app is ever scaled out |
| E-mail | `nodemailer` 10 over the user's SMTP (`SMTP_*` env); dev uses Mailpit from compose | brief |

### Data model

- `users(id, email citext unique, email_verified_at, password_hash null, role enum('admin','user') default 'user', disabled_at, legacy_auth_id uuid null, created_at, updated_at)`
- `sessions(id text pk = sha256(token), user_id, created_at, expires_at, last_seen_at, ip, user_agent)` — absolute lifetime 30 days, sliding renewal when older than 1 day; `last_seen_at` updated at most once per 5 minutes.
- `oauth_accounts(provider, provider_user_id, user_id, created_at, pk(provider, provider_user_id))`
- `auth_tokens(id, user_id, kind enum('verify_email','reset_password','magic_link'), token_hash unique, expires_at, used_at, created_at)` — verify 24 h, reset 1 h, magic link 15 min; single use; issuing a new token of a kind invalidates older ones of that kind.

### Flows

| Flow | Design |
|---|---|
| Register | `POST /auth/register {email, password}` → create `users` + `profiles` in one transaction → send verification mail → 201 `{needsVerification}`. Password rule: 8–128 chars (NIST 800-63B, no composition rules); checked against the e-mail/local-part. Response is identical whether or not the e-mail already existed (anti-enumeration), the mail says "you already have an account" in that case. |
| Verify e-mail | mail link `/auth/verify?token=…` → SPA page → `POST /auth/verify-email {token}` (no side effects on GET so mail scanners cannot consume it) → sets `email_verified_at`, logs the user in. `AUTH_REQUIRE_EMAIL_VERIFICATION=true` (default, mirrors Supabase "Confirm email") blocks login until verified; `POST /auth/resend-verification` is rate-limited. |
| Login | `POST /auth/login` → constant-time failure path (a dummy argon2 verify when the user does not exist), bcrypt→argon2id rehash on first success, disabled users refused, session created, cookie set, returns `me`. Generic error "Invalid e-mail or password". |
| Logout | `POST /auth/logout` deletes the session row and clears the cookie; `POST /auth/logout-all` deletes every session of the user (new, cheap). |
| Me | `GET /auth/me` → `{user, profile}` or 401; the SPA calls it on boot. |
| Magic link | `POST /auth/magic-link {email}` → token mail (always 202); link `/auth/magic?token=…` → SPA → `POST /auth/magic-link/consume` → session. Creates **no** profile for unknown e-mails (fixes SEC-18): unknown e-mail → the mail says "no account yet, register here". (Supabase's OTP sign-up-on-first-use semantics are not kept; sign-up has its own form.) |
| Forgot / reset | `POST /auth/forgot-password {email}` (always 202) → mail → `/auth/reset?token=…` → `POST /auth/reset-password {token, password}` → sets hash, deletes **all** sessions of the user. |
| Change password | `PUT /auth/password {current, next}` (session required; re-verifies current; keeps the current session, deletes the others). |
| GitHub | `GET /auth/github` → arctic authorization URL with `state` in a signed, short-lived cookie → GitHub → `GET /auth/github/callback?code&state` → exchange → fetch `/user` and `/user/emails` (primary **verified** e-mail required) → link to the existing user with that e-mail or create user+profile (verified) → session → redirect to the SPA. Disabled unless `GITHUB_CLIENT_ID/SECRET` are set (the button hides itself via `GET /auth/providers`). Requires the user to create one GitHub OAuth App (callback `${APP_URL}/api/v1/auth/github/callback`). |
| Delete account | `DELETE /me {password?}` → in one transaction delete the user (cascades profile, posts, comments, likes, sessions, tokens, notifications), remove avatar files; GitHub-only accounts confirm by re-typing their e-mail. |
| RBAC | `role` on `users`; `requireAuth` and `requireRole('admin')` middlewares; admins may edit/delete any post or comment, manage users (ADR/TARGET §5). First admin: `pnpm admin:promote <email>` or `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` on first boot of an empty database. |

### Frontend consequences

No token handling in the SPA at all: `credentials: 'same-origin'` fetches; `GET /auth/me` drives the auth context; 401 → redirect to `/signin?redirect=…` (pathname-only, same as today). The "Signed in"/"Signed out" toasts are kept.

## Alternatives considered

- **Keep Supabase Auth self-hosted (GoTrue container)**: removes the SaaS but keeps a second service, a second schema and JWT-in-browser semantics the brief explicitly rejects.
- **`better-auth`**: complete and popular, but it owns the user/session schema and migrations and brings many features we do not need; a hand-rolled implementation is ~600 lines, fully tested, and easier to reason about for an audit.
- **JWT access tokens with refresh rotation**: stateless but reintroduces token storage in the browser and revocation complexity; opaque DB sessions are simpler and are what the brief asks for.
- **Keeping Supabase's "OTP creates the account" semantics for magic links**: rejected — it is the root of SEC-18 (profile squatting).

## Security notes

- All comparisons of secrets use `crypto.timingSafeEqual` on hashes.
- Session cookie name `dc_session`; no session data in the cookie.
- `Secure` requires HTTPS at Nginx Proxy Manager; the app also honours `X-Forwarded-Proto` when `TRUST_PROXY=true` to decide cookie flags and absolute URLs in e-mails (`APP_URL` is authoritative).
- E-mail templates never include the password; links carry only the token.

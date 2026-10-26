# DevConnector 🚀

A self-hosted social network for developers: profiles with skills, experience and education, a
developers directory, posts with comments and likes, in-app and e-mail notifications, and an
administration area with owner / admin / member roles. **Zero SaaS**: PostgreSQL, SMTP and a
local volume are the only dependencies — one container image runs the API and the web app.

## Try it in three commands

```sh
git clone https://github.com/daniellaera/admin-dashboard.git && cd admin-dashboard
docker compose up --build -d --wait
open http://localhost:8080          # Mailpit (every e-mail the app sends): http://localhost:8025
```

Sign in as the owner `owner@devconnector.local` / `Owner1234!` (first-boot bootstrap, local demo
values from `compose.yml`). Demo personas and posts: `docker compose exec app node dist/scripts/seed.js`
— every persona signs in with `Password123!`.

## Stack

| Layer              | Choice                                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime / language | Node 26 · TypeScript 6 (strict, ESM, `.ts` imports) · pnpm 12 workspaces                                                                                                                                                                   |
| API                | Hono 4 · Zod 4 · Drizzle ORM + SQL migrations · PostgreSQL 18 · pino                                                                                                                                                                       |
| Auth               | argon2id passwords (legacy bcrypt rehashed on login), opaque DB sessions in an httpOnly cookie, e-mail verification, magic links, password reset, GitHub OAuth (optional), owner / admin / member roles, sudo mode, invitations, audit log |
| Realtime & mail    | Server-sent events over Postgres `LISTEN/NOTIFY` · SMTP outbox worker (nodemailer)                                                                                                                                                         |
| Files              | Avatars re-encoded with sharp to WebP on a local volume                                                                                                                                                                                    |
| Web                | React 19 · Vite 8 · TanStack Router + Query · Mantine 9 · react-hook-form                                                                                                                                                                  |
| Quality            | ESLint 10 (type-aware) · Prettier · Vitest 5 (unit + Testcontainers integration) · Playwright · knip · gitleaks · `pnpm audit`                                                                                                             |
| Delivery           | Multi-stage Docker image (amd64 + arm64) · GitHub Actions → GHCR · pull-based compose deployment                                                                                                                                           |

## Local development

```sh
nvm install                          # Node 26 (.nvmrc)
npm i -g pnpm@12                     # Node 26 ships without Corepack
pnpm install
cp .env.example .env                 # defaults match compose.yml
docker compose up -d db mailpit      # PostgreSQL 18 + Mailpit
pnpm db:seed                         # schema + demo data (owner, admin, 4 personas, posts)
pnpm dev                             # API http://localhost:3000, web http://localhost:5173 (proxies /api and /files)
```

| Script                                                                   | What it does                                                                                             |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build`                                                | both apps in watch mode / production bundles (`apps/api/dist`, `apps/web/dist`)                          |
| `pnpm check`                                                             | lint + format check + typecheck + all tests                                                              |
| `pnpm test`, `pnpm test:unit`, `pnpm test:integration`                   | Vitest; integration tests start a PostgreSQL container (or use `TEST_DATABASE_URL`)                      |
| `pnpm test:e2e`                                                          | Playwright against the dev stack (`db` + `mailpit` must be up); `E2E_BASE_URL=…` targets a running image |
| `pnpm knip`                                                              | unused files, dependencies and exports                                                                   |
| `pnpm db:migrate` / `db:seed` / `db:reset` / `db:generate` / `db:studio` | migrations, demo data, drop-and-reseed (dev only), new migration from schema changes, Drizzle Studio     |
| `pnpm owner:create <email> <password>`                                   | create or promote the single owner account (once)                                                        |
| `pnpm import:supabase -- --source <url>`                                 | import a restored Supabase dump — see [MIGRATION.md](docs/modernize/MIGRATION.md)                        |

## Configuration

Everything is environment-driven; [`.env.example`](.env.example) documents every variable with its
default. The important ones:

| Variable                                                    | Purpose                                                                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `APP_URL`                                                   | public URL — links in e-mails, cookie `Secure` flag, OAuth callback                            |
| `DATABASE_URL`, `MIGRATE_ON_START`                          | PostgreSQL connection; migrations run on boot by default                                       |
| `AUTH_SECRET`                                               | signs OAuth state cookies (`openssl rand -base64 48`)                                          |
| `AUTH_REQUIRE_EMAIL_VERIFICATION`                           | block sign-in until the address is confirmed (default on)                                      |
| `OWNER_EMAIL`, `OWNER_PASSWORD`                             | first boot only: creates the owner when none exists                                            |
| `SMTP_*`, `MAIL_FROM`                                       | your SMTP server (Mailpit in development)                                                      |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`                  | GitHub OAuth App (callback `${APP_URL}/api/v1/auth/github/callback`); button hidden when unset |
| `UPLOADS_DIR`, `MAX_UPLOAD_MB`                              | avatar storage                                                                                 |
| `TRUST_PROXY`, `COOKIE_SECURE`, `LOG_LEVEL`, `RATE_LIMIT_*` | reverse-proxy and operations knobs                                                             |

Registration mode (open / invite-only), the skills and tags catalog and notification preferences
are managed in the app, not in the environment.

## Deployment

The image `ghcr.io/daniellaera/admin-dashboard` is published on every push to `main` (tags
`<sha>` and `main`). Production runs [`compose.prod.yml`](compose.prod.yml) next to a `.env`;
a systemd timer pulls and restarts when the image changes. Step by step — Proxmox LXC, Nginx
Proxy Manager, backups, rollback: [**DEPLOY.md**](docs/modernize/DEPLOY.md). Moving the data
out of Supabase: [**MIGRATION.md**](docs/modernize/MIGRATION.md).

## HTTP API

`/api/v1` — JSON, RFC 9457 problem details on errors, same-origin CSRF protection, per-IP rate
limits. Public: `GET /posts`, `/posts/:id`, `/posts/:id/comments`, `/profiles`, `/profiles/:id`,
`/catalog`, `/config`, `/health`, `/ready`. Session: `/auth/*`, `/me/*`, `POST /posts…`,
`/notifications/*`, `GET /events` (SSE). Staff: `/admin/*`. Request and response shapes live in
[`packages/shared`](packages/shared/src) and are enforced on both sides.

## Repository layout

```
apps/api          Hono HTTP API — serves apps/web/dist in production (WEB_DIST)
apps/web          Vite + React single-page application
packages/shared   Zod schemas, constants and DTO types shared by both
packages/config   TypeScript presets
e2e               Playwright suite
docs/modernize    audit, target architecture, ADRs, decision log, DEPLOY.md, MIGRATION.md, REPORT.md
```

## Security notes

- No secrets in the repository: `.env` is ignored, CI scans the full history with gitleaks
  (custom rule for Postgres URIs) and fails on high/critical `pnpm audit` findings.
- E-mail addresses are never exposed by public endpoints or pages; only the owner and admins
  see them.
- Sessions are revoked on password change, role change and account disabling; role changes
  require the owner's password confirmation and are written to the audit log.

## License

MIT — see [LICENSE](LICENSE).

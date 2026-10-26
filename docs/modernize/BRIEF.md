# Mission brief (verbatim copy of the user's instructions, 2026-10-26)

> Kept here so the mission survives context compaction and new sessions. Do not edit; log deviations in `DECISIONS.md`.

# Mission: full audit + ground-up rebuild of admin-dashboard (DevConnector)

Repo: https://github.com/daniellaera/admin-dashboard, cloned here (current directory).
Current stack: React (front) + Express (back) + Supabase + Prisma + Postgres, Docker, deployed on Fly, GitHub Actions CI.
Goal: bring this app up to 2026 state of the art, remove all SaaS dependencies, and deliver an app that runs fully self-hosted.

## Working mode: autonomous
- You ask me NO questions, except at the single STOP point defined below.
- For every other decision, pick the simplest reversible option and log it in docs/modernize/DECISIONS.md (context, options, choice, rationale).
- You verify every step yourself: lint, typecheck, tests, build, and docker compose up with a smoke test. I don't validate anything for you.
- Keep your state in docs/modernize/ so you can resume after a /compact or a new session. Use subagents to parallelize the audit.

## Hard rules
- Never push to main and never force push. All work happens on the `modernize/2026` branch, in atomic conventional commits.
- Never deploy. Never touch the production app on Fly or the existing Supabase project.
- No secrets in the repo: a documented .env.example, with real .env files in .gitignore.
- No third-party service that requires me to create a new account. Open source libraries are fine, SaaS is not.
  Accounts I already have and you may use: GitHub (including an OAuth App if needed), self-hosted Gitea, and an SMTP server I'll provide through env variables.

## Phase 0: reconnaissance (read-only)
1. Run `git fetch` and `git status`, then check that the local copy matches origin/main. If it doesn't, log it.
2. Build a full inventory: structure, versions of every dependency (front and back), scripts, Dockerfiles, CI workflows, Fly config, Prisma schema, and exactly how Supabase is used (auth? storage? realtime? RLS? direct calls from the front?). Also look for any trace of Novu.
3. Write docs/modernize/FEATURES.md: an exhaustive functional inventory (screens, API routes, roles, flows). This is the parity checklist, and no feature may silently disappear.
4. Run a secret scan over the entire git history (gitleaks via brew or docker). Any key found (Supabase anon/service_role, DB URL, JWT secret, etc.) goes into the audit as critical severity, marked "must be revoked".
5. Try to run the app as-is and document what breaks.

## Phase 1: audit → docs/modernize/AUDIT.md
Cover these sections: architecture, security (OWASP Top 10: authn/authz, IDOR, input validation, CORS, rate limiting, headers, session handling), dependencies (outdated, EOL, vulnerable, with npm audit), code quality and TypeScript strictness, tests, performance, accessibility, DX, CI/CD, infra and deployment.
Each finding includes: severity (critical/high/medium/low), evidence (file:line), impact, and proposed fix.
End with a blunt verdict: what's worth keeping, and what must be rewritten.

## Phase 2: target architecture → docs/modernize/TARGET.md + ADRs in docs/modernize/adr/
Propose a justified target. Below are my constraints and default leanings, which you can challenge if you have something better:
- Runtime: check which Node version is the active LTS today, don't assume it. Monorepo with workspaces (front, back, shared packages for types and validation schemas).
- Front: React 19 + Vite + strict TypeScript. Pick routing, data fetching, forms, and UI library, and justify each choice. Keep visual and functional parity first, then improve.
- Back: Express 5, Fastify, or Hono, decided in an ADR. Input validation with a schema shared between front and back.
- Database: Postgres (latest stable) in Docker. Prisma is removed, replaced by Drizzle or Kysely (compare them in an ADR), with versioned SQL migrations and a seed.
- Homemade auth, replacing Supabase Auth: argon2id, DB-backed sessions in httpOnly/Secure/SameSite cookies (no JWT in localStorage), CSRF protection, login rate limiting, password reset and email verification over SMTP, RBAC (admin/user). If the current app has GitHub login, reimplement it with a GitHub OAuth App.
- Homemade storage, replacing Supabase Storage: local volume served by the backend with access control, type and size validation, and image resizing if the app uses images. Only add self-hosted S3-compatible storage if it's genuinely justified.
- Homemade notifications, replacing Novu: a notifications table, in-app inbox (read/unread, pagination), real-time delivery via SSE driven by Postgres LISTEN/NOTIFY, SMTP email (nodemailer) with templates, per-user notification preferences. If Supabase Realtime is used elsewhere, replace it with the same SSE mechanism.
- Tests: Vitest for unit tests, Supertest and Testcontainers (Postgres) for API integration tests, Playwright for E2E on critical paths.
- Observability: structured logs (pino), /health and /ready endpoints, centralized error handling.
- Infra: docker-compose for dev and a separate prod compose. Multi-arch images (amd64 + arm64), since I develop on an ARM Mac. Deployment target is a Proxmox LXC behind Nginx Proxy Manager, or a VPS: the app must be target-agnostic and configured only through env variables. Remove Fly.
- CI: one workflow compatible with both GitHub Actions and Gitea Actions (same syntax) that runs lint, typecheck, tests, and the image build.
- Data migration: write an optional import script from a Supabase dump (pg_dump). The bcrypt hashes from auth.users must keep working, with a rehash to argon2id on next login.

## ⛔ SINGLE STOP: end of Phase 2
Give me a short summary: the top 10 findings, the target stack as a table, and at most 5 decisions where my input genuinely changes something, each with your default recommendation.
End the summary with exactly this line:
"⏸ Waiting. Switch to /effort xhigh, then reply GO with your decisions (or GO alone to accept all defaults)."
Then stop completely. Do not write code, do not start Phase 3, and do not continue on your own, even if a turn passes with no message. You resume ONLY when you receive a message starting with "GO".
When GO arrives, log my decisions in DECISIONS.md (anything I didn't address = your default), then run Phases 3 and 4 without stopping, except for a blocking anomaly or an irreversible decision.

## Phase 3: execution in batches
On the `modernize/2026` branch, in this order, and each batch must be 100% green before moving to the next:
1. Tooling: monorepo, strict TS, lint and format, scripts.
2. DB: schema, migrations, seed.
3. Auth and RBAC.
4. API with full parity against FEATURES.md.
5. Storage.
6. Notifications (in-app, SSE, email).
7. Front: migrate every screen.
8. Playwright E2E tests on the compose stack.
9. Multi-arch Docker and CI.
10. README (local setup in 3 commands), docs/modernize/DEPLOY.md (Proxmox LXC + NPM), and MIGRATION.md (data).
Tick off FEATURES.md as you go.

## Phase 4: final verification → docs/modernize/REPORT.md
Start from a clean clone and run `docker compose up`, then the full suite (unit, integration, E2E). npm audit must report zero high or critical vulnerabilities. Check FEATURES.md parity at 100%.
The report covers: what was done, what remains, accepted deviations, secrets to revoke, and the exact commands to deploy.

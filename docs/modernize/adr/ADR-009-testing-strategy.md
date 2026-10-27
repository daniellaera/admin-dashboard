# ADR-009 — Testing strategy: Vitest, Testcontainers Postgres, Hono `app.request` (+ Supertest where useful), Playwright

Status: proposed (2026-10-26) · Brief: "Vitest for unit tests, Supertest and Testcontainers (Postgres) for API integration tests, Playwright for E2E on critical paths."

## Context

Today: 4 backend tests on hello routes, 1 frontend test that cannot run, CI runs nothing (AUDIT TST-01..04).

## Decision

| Layer | Tooling | Scope / conventions |
|---|---|---|
| Unit (api, shared, web) | **Vitest 5** workspace at the root (one command, per-project configs) | pure functions: password policy, token hashing, template rendering, pagination math, schema edge cases, SSE event routing, date formatting helpers |
| API integration | Vitest + **`@testcontainers/postgresql`** (`postgres:18-alpine`) started once per worker, migrations applied by the real migrator, DB truncated between tests; requests via **`app.request()`** (no port) and, for cookie-jar flows across requests, **Supertest** against `@hono/node-server` on an ephemeral port — both are used, Supertest where the Node HTTP layer matters (cookies, multipart, SSE streaming) | every endpoint: happy path, validation errors, **authorization matrix** (anonymous / owner / other user / admin) for every mutation — the class of bug that defines the current app; mail outbox assertions; LISTEN/NOTIFY → SSE delivery |
| Component (web) | Vitest + Testing Library + `happy-dom` + **MSW** | forms (validation messages), bell popover, feed chip on SSE event, route guards |
| E2E | **Playwright 1.6x** against the **compose stack** (`compose.yml` with Mailpit; mails read through Mailpit's REST API) | critical paths: register → verify (link from Mailpit) → login → edit profile + avatar → create post (draft → publish) → second user comments → first user sees notification (SSE) → like → admin disables user → password reset; dark mode toggle; 404. Runs on Chromium in CI, all three engines locally on demand |
| Static | `tsc --noEmit` per package, ESLint type-checked, `knip`, `pnpm audit --prod`, gitleaks | CI gate |
| Coverage | `@vitest/coverage-v8`; thresholds enforced on `apps/api` services (≥ 80 % lines) | no vanity targets for UI |

CI portability: integration tests honour `TEST_DATABASE_URL`; when set, Testcontainers is skipped and that database is used (GitHub/Gitea `services: postgres` container) — Testcontainers remains the local default so developers need only Docker.

## Alternatives considered

- **Jest**: slower, ESM pain (the exact failure in TST-02); Vitest shares Vite's config.
- **Mocking the database** in API tests: fast but blind to SQL/constraint bugs (CQ-01/02 would have passed). Rejected; Testcontainers makes real Postgres cheap.
- **Cypress**: Playwright is faster, multi-engine, and has first-class API request helpers.

## Consequences

- Docker is required for the local integration suite (already required for the app itself).
- Test data factories live in `apps/api/test/factories.ts` and are reused by the seed.

# ADR-011 — CI: one workflow for GitHub Actions and Gitea Actions

Status: proposed (2026-10-26) · Brief: "one workflow compatible with both GitHub Actions and Gitea Actions (same syntax) that runs lint, typecheck, tests, and the image build."

## Context

The current workflow deploys to production on every push of every branch with no checks and floating action refs (AUDIT CI-01..04). Gitea Actions executes the GitHub Actions syntax from `.gitea/workflows/` **or** `.github/workflows/` via `act_runner`, with a few differences: `ubuntu-latest` must be mapped to an image in the runner config, actions are fetched from github.com by default (`DEFAULT_ACTIONS_URL`), `GITHUB_*` env vars exist, Docker-in-Docker depends on how the runner is deployed, and `services:` containers work when the runner has Docker.

## Decision

- **One file**: `.github/workflows/ci.yml` (Gitea reads it too; no duplicate under `.gitea/`). Triggers: `pull_request`, `push` to `main` and tags `v*`, `workflow_dispatch`. Concurrency group per ref (cancel in progress).
- **Jobs**
  1. `check` — `actions/checkout@v5`, `pnpm/action-setup@v4`, `actions/setup-node@v5` (Node 26, pnpm cache) → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test:unit` → `pnpm --filter web build` (artifact `web-dist`).
  2. `api-integration` — `services: postgres:18-alpine` (healthcheck) → `TEST_DATABASE_URL=postgres://…@localhost:5432/test pnpm test:integration` (Testcontainers skipped when the URL is set, ADR-009). Works identically on GitHub and on a Gitea runner with Docker.
  3. `e2e` — needs `check`; `docker compose -f compose.yml up -d --build --wait` → `pnpm --filter web exec playwright install --with-deps chromium` → `pnpm test:e2e` → upload Playwright report on failure → `compose down -v`.
  4. `security` — `pnpm audit --prod --audit-level=high` (fails on high/critical, brief), `gitleaks` via the official container image with the repo's `.gitleaks.toml` (adds the Postgres-URI rule) and full history (`fetch-depth: 0`).
  5. `image` — on `main`/tags only, needs 1–4: `docker/setup-qemu-action@v3`, `docker/setup-buildx-action@v3`, `docker/metadata-action@v5`, `docker/login-action@v3`, `docker/build-push-action@v6` with `platforms: linux/amd64,linux/arm64`, GHA cache. **Registry selection by host**: when `${{ github.server_url }}` is `https://github.com` → `ghcr.io/${{ github.repository }}` with `GITHUB_TOKEN`; otherwise → the Gitea instance's registry (`<gitea-host>/<owner>/<repo>`) with `secrets.REGISTRY_USER/REGISTRY_TOKEN` (a Gitea access token the user creates — allowed, existing account). Deploy is **not** part of CI (manual `compose pull && up -d`, DEPLOY.md).
- **Pinning**: actions pinned to major tags (`@v5`), optionally to SHAs later via Renovate; no `@master` refs.
- **Gitea runner notes** (documented in DEPLOY.md): label `ubuntu-latest:docker://node:26-bookworm` or `catthehacker/ubuntu:act-latest`; mount `/var/run/docker.sock` for the `e2e`/`image` jobs or run those on GitHub only via `if: github.server_url == 'https://github.com'` — the workflow carries this guard so a socket-less Gitea runner still runs `check`, `api-integration` (services need Docker too — guarded the same way) and `security`.

## Alternatives considered

- **Separate `.gitea/workflows/ci.yml`**: duplicates logic; Gitea already reads `.github/workflows`.
- **Woodpecker/Drone for Gitea**: different syntax; brief wants one.
- **Deploy from CI** (SSH into the LXC): tempting but the brief forbids deploying and the user may prefer pull-based updates; left as a documented optional job template.

## Consequences

- CI is the single gate; local hooks are optional (ADR-001).
- First run on Gitea requires registering a runner with Docker access for the full matrix.

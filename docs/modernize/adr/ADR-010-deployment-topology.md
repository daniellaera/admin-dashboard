# ADR-010 — Deployment topology: one multi-arch app image + Postgres, compose for dev and prod, behind Nginx Proxy Manager

Status: proposed (2026-10-26) · Brief: docker-compose for dev and a separate prod compose; multi-arch images (amd64 + arm64); target Proxmox LXC behind Nginx Proxy Manager or a VPS; target-agnostic, env-only configuration; remove Fly.

## Context

Today two Fly apps (nginx SPA + Express API) on different origins force CORS (AUDIT SEC-07, INF-06), EOL images that no longer build (INF-01, REC-06), migrations from a laptop (INF-04), no compose, no health checks, amd64 only.

## Decision

### Topology

```
Internet ─TLS─▶ Nginx Proxy Manager (user's) ─http─▶ app:8080 ─┬─▶ /api/v1/*   (Hono)
                                                              ├─▶ /api/v1/events (SSE, buffering off)
                                                              ├─▶ /files/*    (avatars from volume)
                                                              └─▶ /*          (SPA dist, index.html fallback)
                                                 postgres:18 ◀─┘  (compose network only)
```

- **One application image** (`ghcr.io/daniellaera/devconnector:<tag>`): the Hono server serves the built SPA (`apps/web/dist`) with immutable cache headers for hashed assets and `no-cache` for `index.html`, the API under `/api/v1`, files under `/files`. Same origin ⇒ no CORS in production, `SameSite=Lax` cookies just work, one upstream in NPM. A separate nginx/static container buys nothing at this scale and doubles the config surface; the option stays open (the SPA is a plain `dist/` folder).
- **Postgres 18** as a compose service with a named volume; never exposed outside the compose network in prod.
- **Volumes**: `pgdata`, `uploads` (`/data/uploads`).
- **Config = environment only** (`.env` next to the compose file, documented in `.env.example`): `APP_URL`, `PORT`, `DATABASE_URL`, `AUTH_SECRET` (signs OAuth state cookies), `COOKIE_SECURE`, `TRUST_PROXY`, `SMTP_*`, `MAIL_FROM`, `GITHUB_CLIENT_ID/SECRET`, `UPLOADS_DIR`, `MAX_UPLOAD_MB`, `LOG_LEVEL`, `MIGRATE_ON_START`, `AUTH_REQUIRE_EMAIL_VERIFICATION`, `SEED_ADMIN_EMAIL/PASSWORD` (first boot only). No file-based config, no target-specific code paths.

### Files

- `compose.yml` (dev / demo, `docker compose up --build`): `db` (postgres:18-alpine, port 5432 published on localhost for tooling), `mailpit` (SMTP 1025, UI 8025), `app` (built from the repo, `MIGRATE_ON_START=true`, `SMTP_HOST=mailpit`, port 8080). Hot-reload development instead runs `docker compose up -d db mailpit` + `pnpm dev` (Vite on 5173 proxying `/api` and `/files` to the API on 3000 — same-origin in dev too).
- `compose.prod.yml`: `db` (no published port, healthcheck, `shm_size`), `app` (image from the registry, `restart: unless-stopped`, healthcheck on `/health`, `depends_on: db: condition: service_healthy`, read-only root FS with `tmpfs /tmp`, non-root), optional `backup` sidecar (`prodrigestivill/postgres-backup-local`-style nightly `pg_dump` to a volume — open source, no account) — or the documented cron `pg_dump` in DEPLOY.md if the sidecar is not wanted.
- `Dockerfile` (root, multi-stage): `node:26-alpine` + `corepack enable` → `pnpm fetch` (lockfile-only layer) → `pnpm install --offline --frozen-lockfile` → build `packages/shared`, `apps/web`, `apps/api` → `pnpm --filter api deploy --prod /out` → runtime `node:26-alpine`, `USER node`, copies `/out`, `apps/web/dist`, `drizzle/` migrations; `HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/health`; `ENTRYPOINT ["node", "dist/server.js"]`. Native deps (`sharp`, `@node-rs/argon2`) resolve per-platform prebuilt binaries at install → no compiler in the image.
- **Multi-arch**: `docker buildx build --platform linux/amd64,linux/arm64` (CI, ADR-011; the local `multiarch-builder` already exists on this Mac). Images are tagged `sha-<short>`, `<version>` and `latest` on main.

### Operations (DEPLOY.md will detail)

Proxmox LXC (Debian 13, nesting enabled) or any VPS: install Docker, clone or copy `compose.prod.yml` + `.env`, `docker compose -f compose.prod.yml up -d`, create a Proxy Host in NPM → `http://<lxc-ip>:8080` with WebSocket support off (not needed) and **proxy buffering off** for `/api/v1/events` (SSE) — or rely on the app's `X-Accel-Buffering: no` which NPM's nginx honours. Backups: nightly `pg_dump` + `uploads` rsync; restore procedure documented. Updates: `docker compose pull && up -d`; migrations run on start.

## Alternatives considered

- **Two images (nginx + api)**: see above; rejected for single-origin simplicity. Reversible.
- **Kubernetes / k3s**: out of proportion for one app on an LXC.
- **Caddy inside compose for TLS**: NPM already terminates TLS for the user; adding Caddy would duplicate it. DEPLOY.md mentions Caddy for the no-NPM VPS case.
- **Keeping Fly**: forbidden by the brief.

## Consequences

- A single `docker compose up` on a clean clone produces a working app with mail capture — the Phase 4 acceptance test.
- Horizontal scaling would require shared uploads (ADR-005 interface) and a shared rate-limit store (ADR-004); both are deliberate non-goals today.

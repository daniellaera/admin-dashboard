# syntax=docker/dockerfile:1.7
# DevConnector — one image: the Hono API serves the built web app (ADR-010).
# Built natively per architecture in CI and merged into a multi-arch manifest (D-016).

ARG NODE_VERSION=26.12.1
ARG PNPM_VERSION=12.15.0

# ── Base: Node + pnpm (Node 26 ships without corepack) ───────────────────────
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app

# ── Dependencies: lockfile-only layer, then the workspace ────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --offline --frozen-lockfile

# ── Build: web (Vite) + API (tsup bundle), then a production-only API tree ───
FROM deps AS build
RUN pnpm --filter "./apps/*" build \
 && pnpm --filter @devconnector/api deploy --prod /out

# ── Runtime: non-root, read-only friendly, no toolchain ──────────────────────
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    WEB_DIST=/app/web \
    UPLOADS_DIR=/data/uploads \
    MIGRATE_ON_START=true
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /out/drizzle ./drizzle
COPY --from=build --chown=node:node /app/apps/web/dist ./web
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 8080
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/v1/health >/dev/null || exit 1
CMD ["node", "dist/server.js"]

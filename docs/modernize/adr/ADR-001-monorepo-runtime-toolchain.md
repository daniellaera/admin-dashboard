# ADR-001 — Monorepo, runtime and toolchain

Status: proposed (2026-10-26) · Decides: repo layout, package manager, Node and TypeScript versions, lint/format.

## Context

Two unrelated npm projects (`backend/`, `frontend/`) with hand-copied types (AUDIT ARC-05), no root manifest, no Node pin, two Prettier configs, legacy ESLint, CRLF drift (REC-01, DX-03). The brief asks for a monorepo with workspaces and a shared package for types and validation schemas, built on the Node version that is Active LTS today.

## Decision

| Concern | Choice | Why |
|---|---|---|
| Runtime | **Node.js 26** (`.nvmrc`, `engines`, `node:26-alpine` images) | Active LTS from 2026-10-28 (verified against `nodejs/Release/schedule.json`; v24 is already in Maintenance). Native TypeScript type-stripping lets dev scripts run `node --watch src/server.ts` without a loader. See D-006. |
| Language | **TypeScript 6.0.x**, `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `isolatedModules`, `erasableSyntaxOnly` | 7.x (native compiler) is not yet supported by `typescript-eslint` (peer `<6.1.0`), see D-007. `erasableSyntaxOnly` guarantees the API source stays runnable by Node's type stripping (no enums/namespaces/parameter properties). |
| Modules | ESM everywhere (`"type": "module"`), `module`/`moduleResolution` = `nodenext` (API, shared) and `esnext`/`bundler` (web) | Current ecosystem default; CommonJS interop no longer needed by any chosen dependency. |
| Package manager | **pnpm 12** via Corepack (`packageManager` field) with workspaces | Strict node_modules (no phantom deps), fast, content-addressable store, `pnpm fetch`/`pnpm deploy` make Docker layers cacheable. Corepack ships with Node → nothing to install, no account. |
| Workspace layout | `apps/api` (Hono), `apps/web` (Vite/React), `packages/shared` (Zod schemas, types, constants), `packages/config` (tsconfig/eslint/prettier presets) | Shared contract compiled once, consumed by both apps and by tests. |
| Task runner | plain `pnpm -r` / `pnpm --filter` scripts | Two apps and one library do not justify Turborepo/Nx; can be added later without restructuring. |
| Lint / format | **ESLint 10 flat config** + `typescript-eslint` (type-checked rules) + `eslint-plugin-react-hooks` 7 + `eslint-plugin-jsx-a11y` + `eslint-config-prettier`; **Prettier 3** single root config; `knip` for unused files/exports/deps | Type-aware rules (`no-floating-promises`, `no-misused-promises`) catch exactly the async-handler bugs found in the audit (CQ-04). Biome 2 was considered: faster and single-tool, but its type-aware coverage is still partial and it has no jsx-a11y equivalent yet; revisit when it does. |
| Repo hygiene | root `.gitignore`, `.gitattributes` (`* text=auto eol=lf`), `.editorconfig`, `.nvmrc`, `.env.example`, `lint-staged` + a `prepare`-less Git hook via `simple-git-hooks` (opt-in) | Prevents the CRLF incident and secret commits; hooks never block CI (CI is the gate). |
| Dependency security | `pnpm audit --prod` gate in CI (fail on high/critical), `gitleaks` in CI with a custom Postgres-URI rule | Brief requirement; the one leak in history was missed by default rules. |

## Alternatives considered

- **npm workspaces**: available without Corepack, but hoisting hides phantom dependencies and Docker layer caching is worse. Rejected.
- **Turborepo / Nx**: remote caching and task graphs are overkill for 3 packages; adds config surface. Deferred.
- **Bun / Deno runtimes**: fast, but the brief fixes Node LTS and some chosen native deps (sharp, argon2) are best supported on Node. Rejected.
- **Biome instead of ESLint+Prettier**: see table. Deferred.
- **TypeScript 7**: see D-007. Deferred.

## Consequences

- One `pnpm install` at the root installs everything; `pnpm dev` starts db+mail via compose and both apps with hot reload.
- CI matrix is a single Node version (26). Node 24 still works (no 26-only API used) but is not tested.
- Developers need `corepack enable` once (documented in README); no global pnpm install.

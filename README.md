# DevConnector 🚀

A self-hosted social network for developers: profiles with skills, experience and education,
posts with comments and likes, a developers directory, in-app and e-mail notifications.

> **Rebuild in progress** on the `modernize/2026` branch — see [`docs/modernize/STATE.md`](docs/modernize/STATE.md).
> The previous Supabase/Fly/Novu version lives on `main`.

## Stack

Node 26 · TypeScript 6 · pnpm workspaces · Hono API · PostgreSQL 18 + Drizzle · React 19 + Vite ·
TanStack Router/Query · Mantine · Vitest · Playwright · Docker Compose.

## Local development

```sh
corepack disable 2>/dev/null; npm i -g pnpm@12   # once (Node 26 ships without Corepack)
pnpm install
pnpm dev
```

Full setup, environment variables and deployment: coming in the final README (Phase 3, batch 10).

## Repository layout

```
apps/api          Hono HTTP API (serves the built web app in production)
apps/web          Vite + React single-page application
packages/shared   Zod schemas, constants and DTO types shared by both
packages/config   TypeScript presets
docs/modernize    audit, target architecture, ADRs, decision log
```

## License

MIT — see [LICENSE](LICENSE).

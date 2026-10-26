# ADR-002 — Backend framework: Hono (over Fastify and Express 5)

Status: proposed (2026-10-26) · Brief: "Express 5, Fastify, or Hono, decided in an ADR".

## Context

The current Express 4 API has no validation, no authorization, async handlers that leak rejections (AUDIT CQ-04), ad-hoc errors (SEC-10) and client-authoritative realtime (ARC-03). The replacement must: validate every input with Zod schemas shared with the frontend (ADR-008), expose typed routes to the SPA, serve SSE streams (ADR-006), set cookies and security headers, serve the built SPA from the same origin (ADR-010), be trivially testable without opening sockets, and run on Node 26.

## Options

| Criterion | Express 5.3 | Fastify 5.12 | **Hono 4.13** |
|---|---|---|---|
| Async errors handled natively | yes (since 5) | yes | yes |
| Request validation | none built in; `zod-express-middleware`-style community wrappers | JSON-Schema core; Zod via `fastify-type-provider-zod` (7.x) | `@hono/zod-validator` first-party; validated types flow into handlers |
| End-to-end typed client for the SPA | no | no (OpenAPI → codegen) | **`hono/client` RPC**: `hc<AppType>()` infers paths, params, bodies and responses from the route definitions — zero codegen |
| SSE | manual `res.write` | manual / plugin | `streamSSE()` helper in `hono/streaming` |
| Cookies / signed cookies | `cookie-parser` | `@fastify/cookie` | `hono/cookie` (`getSignedCookie`/`setSignedCookie`) |
| Security headers, CSRF, CORS | helmet, csurf (deprecated) | `@fastify/helmet`, `@fastify/csrf-protection` | `hono/secure-headers`, `hono/csrf` (Origin/Sec-Fetch-Site check), `hono/cors` |
| Static files | `express.static` | `@fastify/static` | `serveStatic` from `@hono/node-server/serve-static` |
| Testing without a socket | supertest (opens port per request) | `app.inject()` | `app.request(new Request(...))` — pure Web API, no port |
| Logging | morgan / pino-http | pino built in | `hono/logger` basic; pino via `hono-pino` or a 20-line middleware |
| Performance (Node) | baseline | fastest of the three | close to Fastify; far above Express |
| OpenAPI | manual | plugins | `@hono/zod-openapi` (optional) |
| Portability | Node only | Node only | Web-standard `Request`/`Response`: same code on Node, Bun, Deno, workers |
| Ecosystem size | largest, oldest | large, Node-centric | smaller but first-party middleware covers every need listed above |
| Rate limiting | `express-rate-limit` | `@fastify/rate-limit` | `hono-rate-limiter` (community) or in-house (trivial on Web API) |

## Decision

**Hono 4.x on `@hono/node-server`.** The deciding factors are (1) the RPC client that gives the SPA a typed API without an OpenAPI codegen step, (2) first-party Zod validation that fits the shared-schema requirement, (3) SSE and cookie helpers out of the box, and (4) socket-free tests (`app.request()`) that make the Vitest integration suite fast and deterministic.

Fastify is the runner-up and would be the choice if the API were expected to grow into a large plugin-heavy service with JSON-Schema contracts; its Zod story is adequate but second-class. Express 5 fixes async errors but brings nothing else from the list and its ecosystem for validation/CSRF is fragmented.

## Structure (apps/api)

```
src/
  server.ts            # @hono/node-server bootstrap, graceful shutdown
  app.ts               # createApp(): middleware chain + routes; exported AppType for hono/client
  env.ts               # Zod-validated process.env (fails fast)
  db/                  # drizzle client, schema, migrator (ADR-003)
  modules/<feature>/   # routes.ts (Hono sub-app + zod validators), service.ts (business rules), repo.ts (drizzle queries)
  lib/                 # errors (problem+json), logger (pino), mailer, events (LISTEN/NOTIFY bus), rate-limit, files
```

Conventions: handlers never touch `req.body` untyped — `zValidator('json', schema)` from `packages/shared`; services receive the authenticated `user` from context (`c.get('user')`), never an id from the client; every error is an `AppError` mapped by one `app.onError` to RFC 9457 `application/problem+json`; `app.notFound` returns the same shape; no stack traces leave the process.

## Consequences

- The web app imports only `type AppType` from the API package (types erased at build) and calls `hc<AppType>('/api')`; a route change that breaks the client fails `tsc` in CI.
- Observability: `pino` with request ids via a small middleware; `GET /health` (liveness) and `GET /ready` (DB ping + uploads dir writable).
- Static SPA serving from the API process is sufficient at this scale (ADR-010); assets get immutable cache headers, `index.html` no-cache.

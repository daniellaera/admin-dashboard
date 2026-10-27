# ADR-008 — Shared validation contract: Zod 4 schemas in `packages/shared`, typed API via Hono RPC

Status: proposed (2026-10-26) · Brief: "Input validation with a schema shared between front and back."

## Context

Frontend types are hand-copied from the Prisma schema and already drifted (`isPublic`), request bodies are untyped on the server, and forms send whole objects (AUDIT ARC-05, SEC-08, CQ-11).

## Decision

- **`packages/shared`** exports, per domain: Zod schemas for every request body and query string (`RegisterInput`, `LoginInput`, `PostCreateInput`, `PostUpdateInput`, `ProfileUpdateInput`, `ExperienceInput`, `PaginationQuery`…), response DTO schemas where the shape is not trivially inferred (`PublicProfile`, `PostSummary`, `Notification`), **constants** (`POST_TYPES` with labels/order, `PROGRAMMING_LANGUAGES` (15), `POST_TAGS` (14), limits such as `TITLE_MAX`), and `z.infer` types. Zod **4** (`z.email()`, tree-shakable `zod/mini` not needed).
- **API**: every route validates with `@hono/zod-validator` using those schemas; a failed parse → 400 problem+json with field errors (`errors: [{path, message}]`). Query params are coerced (`z.coerce.number().int().min(1)`), unknown keys are stripped (`.strict()` where mass assignment matters: profile and post updates).
- **Web**: forms use the same schema via `zodResolver`; the typed client (`hc<AppType>`) enforces request shapes at compile time, so a schema change breaks `tsc` on both sides in CI.
- **Response types** flow from the server to the client through the RPC type; DTO schemas exist for (a) runtime parsing of SSE payloads and (b) documentation; `@hono/zod-openapi` can later publish an OpenAPI document from the same schemas (not in scope).
- **Drizzle types** stay internal to the API: the DB row shape is mapped to DTOs in services (no DB columns leak to the browser — fixes SEC-09 structurally).

## Alternatives considered

- **Valibot**: smaller bundles, but Zod 4 closed most of the gap and has the broader resolver/validator ecosystem.
- **tRPC**: excellent typing but couples the client to a non-REST protocol; Hono RPC gives the same inference over plain REST that `curl`, Playwright and Testcontainers tests can hit.
- **OpenAPI-first codegen**: adds a generation step and drift risk between spec and code; can be layered on later from the same Zod schemas.

## Consequences

- One source of truth for validation messages; UI shows the server's field errors in the same shape it validates locally.
- `packages/shared` must stay framework-free (no React, no Hono imports) so both apps and tests can import it.

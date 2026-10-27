# ADR-006 — Notifications and realtime: notifications table + SSE over Postgres LISTEN/NOTIFY + SMTP outbox (replacing Novu and Socket.IO)

Status: proposed (2026-10-26) · Brief: notifications table, in-app inbox (read/unread, pagination), real-time delivery via SSE driven by Postgres LISTEN/NOTIFY, SMTP e-mail (nodemailer) with templates, per-user notification preferences; replace Supabase Realtime (not used) / Socket.IO with the same SSE mechanism.

## Context

Today a comment triggers a Novu workflow from a **client-emitted socket event** (any client can notify any user, AUDIT ARC-03/SEC-16), the bell is Novu's widget, and the public feed shows a "New posts" chip when another client broadcasts `createPost`. Realtime parity = (1) comment notification to the post author with a bell/popover deep-linking to the post, (2) "New posts" chip on the feed. Everything else is new per the brief.

## Decision

### Data

- `notifications(id bigserial, user_id, type enum('comment','like','new_post','system'), actor_id null, post_id null, comment_id null, data jsonb, read_at null, created_at)`; index `(user_id, created_at desc)` and partial `(user_id) where read_at is null`.
- `notification_preferences(user_id, type, in_app bool default true, email bool default false, pk(user_id,type))`; absent row = defaults. `system` cannot be disabled in-app.
- `email_outbox(id, to_email, subject, html, text, created_at, sent_at null, attempts int, last_error)` — durable queue; one in-process worker polls every 5 s (`FOR UPDATE SKIP LOCKED`), exponential backoff, 5 attempts.

### Producing events

Services (never clients) create notifications inside the same transaction as the domain write (`comments.create` → notify post author unless self; `likes.add` → notify author unless self; `posts.publish` → feed event, optional `new_post` notification for users who opted in). After commit, the service calls `events.publish(channel, payload)` which runs `SELECT pg_notify('app_events', $1)` with a compact JSON `{channel, type, id, userId?, postId?}` (payload ≤ 8 kB limit respected: ids only, consumers refetch).

### Fan-out

A single dedicated `pg.Client` per API process executes `LISTEN app_events` (auto-reconnect with backoff; on reconnect, SSE clients are told to refetch). Incoming notifications are dispatched to an in-process `EventEmitter` keyed by channel: `user:<id>` (notification created/read), `posts` (post published/unpublished/deleted), `post:<id>` (comment created). Because fan-out goes through Postgres, running two API replicas later still delivers to every connected client — the reason for LISTEN/NOTIFY over a purely in-memory bus.

### Delivery to browsers: SSE

`GET /api/v1/events` (session optional): Hono `streamSSE`; subscribes to `posts` always and to `user:<me>` when authenticated; `post:<id>` via `?post=<id>`. Heartbeat comment every 25 s (keeps Nginx Proxy Manager/NPM idle timeouts away), `Last-Event-ID` supported for notification ids (client refetches unread count on reconnect anyway), `X-Accel-Buffering: no`, `Cache-Control: no-cache`. Browser side: native `EventSource` wrapped in a tiny hook that invalidates TanStack Query keys (`['notifications']`, `['posts','feed']`, `['posts', id, 'comments']`) — the UI stays query-driven, SSE only says "something changed". Connection is opened only on routes that need it (feed, post detail, any authenticated page for the bell) — fixing PERF-03.

### Inbox API

`GET /notifications?cursor&limit=20` (keyset by id desc) · `GET /notifications/unread-count` · `POST /notifications/:id/read` · `POST /notifications/read-all` · `DELETE /notifications/:id` · `GET|PUT /notifications/preferences`. Bell popover: unread badge, list with actor/post excerpt and relative time, "Mark all read", click → `/posts/:id` (parity with Novu's `onNotificationClick`) — shown in **both** shells (today only in the landing navbar).

### E-mail

`nodemailer` transport from `SMTP_HOST/PORT/USER/PASS/SECURE`, `MAIL_FROM`. Templates are TypeScript functions in `apps/api/src/mail/templates/*.ts` producing `{subject, html, text}` from typed props with one shared responsive layout (no template engine: typed, testable, zero deps). Transactional mails (verify, reset, magic link, "account exists") are always sent; notification mails respect `notification_preferences.email` (default **off**); a digest is out of scope. Dev: Mailpit (`compose.yml`) captures everything at `http://localhost:8025`; tests assert on the outbox table and on rendered templates.

## Alternatives considered

- **WebSockets (ws / Socket.IO)**: bidirectional, but nothing here needs client→server messaging; SSE works through any HTTP proxy (NPM) without upgrade configuration, auto-reconnects, and is trivial to test. Brief prefers SSE.
- **Polling**: simplest, but 20 s staleness and constant load; SSE is barely more code.
- **Self-hosted Novu**: 8+ containers (Mongo, Redis, workers); absurd for one notification type.
- **Sending e-mail inline in the request**: slow requests and lost mails on SMTP hiccups; the outbox table costs one worker loop and gives retries and auditability.
- **Redis pub/sub**: another service; Postgres already provides the bus.

## Consequences

- One extra DB connection per API process (the listener) — negligible.
- Notification payloads are ids; the SPA refetches — simpler invalidation, no stale data.
- E-mail delivery is eventually consistent (seconds); acceptable for all mail types here.

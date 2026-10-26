import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { AppEvent, EventBus } from '../../lib/events.ts';
import { validate } from '../../lib/validate.ts';
import type { AppEnv } from '../../types.ts';

const HEARTBEAT_MS = 25_000;

/**
 * `GET /events?post=<id>` — Server-Sent Events (ADR-006). Everyone receives the `posts` channel;
 * a signed-in user also receives `user:<id>`; `?post=` adds that post's comment events.
 * Payloads carry ids only; clients refetch what changed.
 */
export function eventRoutes(events: EventBus, heartbeatMs = HEARTBEAT_MS) {
  return new Hono<AppEnv>().get(
    '/',
    validate('query', z.object({ post: z.coerce.number().int().positive().optional() })),
    (c) => {
      const user = c.get('user');
      const { post } = c.req.valid('query');
      const channels = new Set<string>(['posts']);
      if (user) channels.add(`user:${user.id}`);
      if (post) channels.add(`post:${post}`);

      c.header('Cache-Control', 'no-cache, no-transform');
      c.header('X-Accel-Buffering', 'no'); // disable proxy buffering (nginx / NPM)

      return streamSSE(c, async (stream) => {
        let counter = 0;
        const queue: AppEvent[] = [];
        let wake: (() => void) | null = null;
        const unsubscribe = events.subscribe((event) => {
          if (!channels.has(event.channel)) return;
          queue.push(event);
          wake?.();
        });
        let open = true;
        stream.onAbort(() => {
          open = false;
          unsubscribe();
          wake?.();
        });

        await stream.writeSSE({
          event: 'ready',
          data: JSON.stringify({ channels: [...channels] }),
        });
        while (open) {
          const next = queue.shift();
          if (next) {
            counter += 1;
            await stream.writeSSE({
              id: String(counter),
              event: next.event.type,
              data: JSON.stringify(next.event),
            });
            continue;
          }
          const woke = await new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => {
              wake = null;
              resolve(false);
            }, heartbeatMs);
            wake = () => {
              clearTimeout(timer);
              wake = null;
              resolve(true);
            };
          });
          if (!woke && open)
            await stream.writeSSE({ event: 'ping', data: JSON.stringify({ type: 'ping' }) });
        }
      });
    },
  );
}

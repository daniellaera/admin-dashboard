import pg from 'pg';
import type { Logger } from 'pino';
import type { AppEvent, EventBus, EventListener } from './events.ts';

const { Client } = pg;
const CHANNEL = 'app_events';

export interface PgEventBus extends EventBus {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Event bus over PostgreSQL LISTEN/NOTIFY (ADR-006). Publishing goes through `pg_notify`, so
 * every API process — and therefore every connected SSE client — receives every event. A single
 * dedicated client listens and reconnects with backoff when the connection drops.
 */
export function createPgEventBus(options: {
  connectionString: string;
  pool: pg.Pool;
  logger: Logger;
}): PgEventBus {
  const { connectionString, pool, logger } = options;
  const listeners = new Set<EventListener>();
  let client: pg.Client | null = null;
  let stopped = false;
  let reconnectDelay = 1_000;

  function dispatch(raw: string): void {
    let event: AppEvent;
    try {
      event = JSON.parse(raw) as AppEvent;
    } catch {
      logger.warn({ raw: raw.slice(0, 200) }, 'ignoring malformed app event');
      return;
    }
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (err) {
        logger.error({ err }, 'event listener failed');
      }
    }
  }

  async function connect(): Promise<void> {
    if (stopped) return;
    const next = new Client({ connectionString });
    next.on('notification', (msg) => {
      if (msg.channel === CHANNEL && msg.payload) dispatch(msg.payload);
    });
    next.on('error', (err) => {
      logger.warn({ err }, 'event listener connection error');
    });
    next.on('end', () => {
      if (client === next) client = null;
      if (!stopped) {
        logger.warn({ reconnectDelay }, 'event listener disconnected; reconnecting');
        setTimeout(() => {
          connect().catch((err: unknown) => {
            logger.error({ err }, 'event listener reconnect failed');
          });
        }, reconnectDelay).unref();
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      }
    });
    await next.connect();
    await next.query(`LISTEN ${CHANNEL}`);
    client = next;
    reconnectDelay = 1_000;
    logger.info('listening for application events on postgres');
  }

  return {
    async start() {
      stopped = false;
      await connect();
    },
    async stop() {
      stopped = true;
      const current = client;
      client = null;
      await current?.end().catch(() => undefined);
    },
    async publish(event) {
      await pool.query('select pg_notify($1, $2)', [CHANNEL, JSON.stringify(event)]);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

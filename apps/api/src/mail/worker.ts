import { and, asc, isNull, lt, lte, sql } from 'drizzle-orm';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Logger } from 'pino';
import type { Db } from '../db/client.ts';
import { emailOutbox } from '../db/schema.ts';
import type { Env } from '../env.ts';

const MAX_ATTEMPTS = 5;
const BATCH = 20;

export interface OutboxWorker {
  start(): void;
  stop(): Promise<void>;
  /** Processes one batch now (used by tests and the shutdown drain). Returns sent count. */
  runOnce(): Promise<number>;
}

export function createMailTransport(env: Env): Transporter {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } } : {}),
  });
}

/**
 * Delivers queued e-mails (mail/outbox.ts) with retries and exponential backoff. Rows are
 * claimed with `FOR UPDATE SKIP LOCKED`, so several API processes can share the queue.
 */
export function createOutboxWorker(options: {
  db: Db;
  transport: Transporter;
  from: string;
  logger: Logger;
  intervalMs?: number;
}): OutboxWorker {
  const { db, transport, from, logger } = options;
  const intervalMs = options.intervalMs ?? 5_000;
  let timer: NodeJS.Timeout | null = null;
  let running: Promise<number> | null = null;

  async function runOnce(): Promise<number> {
    let sent = 0;
    await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(emailOutbox)
        .where(
          and(
            isNull(emailOutbox.sentAt),
            lte(emailOutbox.nextAttemptAt, sql`now()`),
            lt(emailOutbox.attempts, MAX_ATTEMPTS),
          ),
        )
        .orderBy(asc(emailOutbox.id))
        .limit(BATCH)
        .for('update', { skipLocked: true });
      for (const row of rows) {
        try {
          await transport.sendMail({
            from,
            to: row.toEmail,
            subject: row.subject,
            text: row.text,
            html: row.html,
          });
          await tx
            .update(emailOutbox)
            .set({ sentAt: new Date(), attempts: row.attempts + 1, lastError: null })
            .where(sql`${emailOutbox.id} = ${row.id}`);
          sent += 1;
        } catch (err) {
          const attempts = row.attempts + 1;
          const delayMs = Math.min(2 ** attempts * 30_000, 6 * 60 * 60_000);
          await tx
            .update(emailOutbox)
            .set({
              attempts,
              nextAttemptAt: new Date(Date.now() + delayMs),
              lastError: err instanceof Error ? err.message.slice(0, 500) : String(err),
            })
            .where(sql`${emailOutbox.id} = ${row.id}`);
          logger.warn({ err, mailId: row.id, attempts }, 'e-mail delivery failed');
        }
      }
    });
    if (sent > 0) logger.info({ sent }, 'e-mails delivered');
    return sent;
  }

  function tick(): void {
    if (running) return;
    running = runOnce()
      .catch((err: unknown) => {
        logger.error({ err }, 'outbox worker cycle failed');
        return 0;
      })
      .finally(() => {
        running = null;
      });
  }

  return {
    runOnce,
    start() {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
      timer.unref();
      tick();
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
      await running;
    },
  };
}

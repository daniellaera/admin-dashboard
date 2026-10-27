import type { Db } from '../db/client.ts';
import { emailOutbox } from '../db/schema.ts';
import type { MailContent } from './templates.ts';

/**
 * Durable e-mail queue: rows are inserted in the same transaction as the business write and
 * delivered by the outbox worker (mail/worker.ts), so an SMTP outage never fails a request.
 */
export async function enqueueMail(db: Db, to: string, content: MailContent): Promise<void> {
  await db.insert(emailOutbox).values({
    toEmail: to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

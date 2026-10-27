import { MAILPIT_URL } from './env.ts';

interface MailpitSummary {
  ID: string;
  Subject: string;
  Created: string;
}
interface MailpitMessage extends MailpitSummary {
  Text: string;
  HTML: string;
}

export async function purgeMail(): Promise<void> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Mailpit purge failed: ${String(res.status)}`);
}

async function searchMail(to: string): Promise<MailpitSummary[]> {
  const url = `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}&limit=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mailpit search failed: ${String(res.status)}`);
  const body = (await res.json()) as { messages: MailpitSummary[] };
  return body.messages;
}

async function readMail(id: string): Promise<MailpitMessage> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
  if (!res.ok) throw new Error(`Mailpit message ${id} failed: ${String(res.status)}`);
  return (await res.json()) as MailpitMessage;
}

/**
 * Waits for the newest mail to `to` whose text body contains `needle` (the outbox worker
 * polls every 5 s, so allow for that).
 */
export async function waitForMail(
  to: string,
  needle: string,
  timeoutMs = 25_000,
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const summary of await searchMail(to)) {
      const mail = await readMail(summary.ID);
      if (mail.Text.includes(needle)) return mail;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`no mail to ${to} containing "${needle}" within ${String(timeoutMs)} ms`);
}

/** The one-time-token link of a given path (`/auth/verify`, `/auth/reset`, `/auth/magic`, `/invite`). */
export async function mailLink(to: string, path: string): Promise<string> {
  const mail = await waitForMail(to, `${path}?token=`);
  const pattern = new RegExp(
    `https?://[^\\s"'<>]+${path.replaceAll('/', '\\/')}\\?token=[A-Za-z0-9_-]+`,
  );
  const match = pattern.exec(mail.Text);
  if (!match) throw new Error(`mail to ${to} has no ${path} link:\n${mail.Text}`);
  return match[0];
}

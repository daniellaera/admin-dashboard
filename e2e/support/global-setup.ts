import { execFileSync } from 'node:child_process';
import { API_ENV, MAILPIT_URL } from './env.ts';
import { purgeMail } from './mailpit.ts';

/**
 * Runs once before the suite: a fresh, seeded database and an empty Mailpit inbox so every run
 * starts from the same state. `E2E_SKIP_RESET=1` keeps the current data (debugging).
 */
export default async function globalSetup(): Promise<void> {
  if (!process.env.E2E_SKIP_RESET) {
    execFileSync('pnpm', ['--filter', '@devconnector/api', 'exec', 'tsx', 'src/scripts/reset.ts'], {
      stdio: 'inherit',
      env: { ...process.env, ...API_ENV, LOG_LEVEL: 'warn' },
    });
  }
  try {
    await purgeMail();
  } catch (error) {
    throw new Error(
      `Mailpit is not reachable at ${MAILPIT_URL} — start it with \`docker compose up -d db mailpit\``,
      { cause: error },
    );
  }
}

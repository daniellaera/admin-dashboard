import { eq } from 'drizzle-orm';
import { createDatabase } from '../db/client.ts';
import { users } from '../db/schema.ts';
import { loadEnv } from '../env.ts';

// Usage: pnpm admin:promote <email> [--demote]
const [, , rawEmail, flag] = process.argv;
if (!rawEmail) {
  console.error('usage: pnpm admin:promote <email> [--demote]');
  process.exit(2);
}
const email = rawEmail.trim().toLowerCase();
const role = flag === '--demote' ? 'user' : 'admin';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
try {
  const updated = await database.db
    .update(users)
    .set({ role })
    .where(eq(users.email, email))
    .returning({ id: users.id });
  if (updated.length === 0) {
    console.error(`no user with e-mail ${email}`);
    process.exit(1);
  }
  console.error(`user ${updated[0]?.id} is now ${role}`);
} finally {
  await database.close();
}

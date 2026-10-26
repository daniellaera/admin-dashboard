import { sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { Db } from '../../db/client.ts';
import { profiles, users } from '../../db/schema.ts';
import type { Env } from '../../env.ts';
import { hashPassword } from '../../lib/password.ts';

/**
 * First boot of an empty database: create the admin account from SEED_ADMIN_EMAIL /
 * SEED_ADMIN_PASSWORD. Does nothing when users already exist or the variables are unset.
 */
export async function bootstrapAdmin(db: Db, env: Env, log: Logger): Promise<void> {
  const seedEmail = env.SEED_ADMIN_EMAIL;
  const seedPassword = env.SEED_ADMIN_PASSWORD;
  if (!seedEmail || !seedPassword) return;
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  if ((row?.count ?? 0) > 0) return;
  const email = seedEmail.toLowerCase();
  await db.transaction(async (tx) => {
    const [admin] = await tx
      .insert(users)
      .values({
        email,
        passwordHash: await hashPassword(seedPassword),
        emailVerifiedAt: new Date(),
        role: 'admin',
      })
      .returning({ id: users.id });
    if (!admin) throw new Error('could not create the admin user');
    await tx.insert(profiles).values({ userId: admin.id, username: 'Admin', isPublic: false });
  });
  log.warn('created the first admin account from SEED_ADMIN_EMAIL; remove the variable afterwards');
}

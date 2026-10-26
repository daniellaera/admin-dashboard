import { eq, sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { Db } from '../../db/client.ts';
import { profiles, users } from '../../db/schema.ts';
import { hashPassword } from '../../lib/password.ts';

export class OwnerExistsError extends Error {
  constructor() {
    super('An owner account already exists; ownership cannot be created twice or transferred');
    this.name = 'OwnerExistsError';
  }
}

/**
 * Creates the single OWNER account (ADR-013). Refuses when one exists. If a regular account
 * with that e-mail exists it is promoted to owner (bootstrap after an import).
 */
export async function createOwner(
  db: Db,
  input: { email: string; password: string },
  log?: Logger,
): Promise<number> {
  const [existingOwner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'owner'))
    .limit(1);
  if (existingOwner) throw new OwnerExistsError();

  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const id = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing) {
      await tx
        .update(users)
        .set({
          role: 'owner',
          passwordHash,
          emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
          disabledAt: null,
        })
        .where(eq(users.id, existing.id));
      return existing.id;
    }
    const [created] = await tx
      .insert(users)
      .values({ email, passwordHash, emailVerifiedAt: new Date(), role: 'owner' })
      .returning({ id: users.id });
    if (!created) throw new Error('could not create the owner user');
    await tx.insert(profiles).values({ userId: created.id, username: 'Owner', isPublic: false });
    return created.id;
  });
  log?.warn({ userId: id }, 'owner account created');
  return id;
}

/**
 * First boot: create the owner from OWNER_EMAIL / OWNER_PASSWORD when no owner exists yet.
 * Silent no-op otherwise, so the variables can stay in place harmlessly (removing them is advised).
 */
export async function bootstrapOwner(
  db: Db,
  env: { OWNER_EMAIL?: string | undefined; OWNER_PASSWORD?: string | undefined },
  log: Logger,
): Promise<void> {
  if (!env.OWNER_EMAIL || !env.OWNER_PASSWORD) return;
  try {
    await createOwner(db, { email: env.OWNER_EMAIL, password: env.OWNER_PASSWORD }, log);
    log.warn('owner created from OWNER_EMAIL; you can remove OWNER_EMAIL/OWNER_PASSWORD now');
  } catch (err) {
    if (!(err instanceof OwnerExistsError)) throw err;
  }
}

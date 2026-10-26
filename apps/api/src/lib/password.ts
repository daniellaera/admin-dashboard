import { hash, verify } from '@node-rs/argon2';
import bcrypt from 'bcryptjs';

/**
 * OWASP-recommended argon2id parameters (19 MiB, 2 iterations, 1 lane).
 * `algorithm: 2` is `Algorithm.Argon2id` — the enum is an ambient `const enum`, which cannot
 * be imported under `verbatimModuleSyntax`.
 */
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const BCRYPT_PREFIX = /^\$2[abxy]\$/;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export interface PasswordCheck {
  ok: boolean;
  /** True when the stored hash is a legacy bcrypt hash that should be replaced by argon2id. */
  needsRehash: boolean;
}

/**
 * Verifies a password against an argon2id hash or a legacy bcrypt hash imported from
 * Supabase `auth.users.encrypted_password` (ADR-012). bcrypt `$2y$` hashes (PHP flavour) are
 * equivalent to `$2a$` for bcryptjs.
 */
export async function verifyPassword(storedHash: string, password: string): Promise<PasswordCheck> {
  if (storedHash.startsWith('$argon2')) {
    return { ok: await verify(storedHash, password), needsRehash: false };
  }
  if (BCRYPT_PREFIX.test(storedHash)) {
    const normalised = storedHash.replace(/^\$2[xy]\$/, '$2a$');
    const ok = await bcrypt.compare(password, normalised);
    return { ok, needsRehash: ok };
  }
  return { ok: false, needsRehash: false };
}

let dummyHashPromise: Promise<string> | undefined;

/**
 * Runs a real argon2 verification against a throw-away hash so that login attempts for
 * unknown accounts take as long as attempts for existing ones (anti user-enumeration).
 */
export async function wasteTimeLikeAVerification(password: string): Promise<void> {
  dummyHashPromise ??= hash('not-the-password-you-are-looking-for', ARGON2_OPTIONS);
  await verify(await dummyHashPromise, password);
}

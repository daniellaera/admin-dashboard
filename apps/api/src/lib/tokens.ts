import { createHash, randomBytes } from 'node:crypto';

/** 256-bit random token, URL-safe (43 chars). Sent to the client; never stored. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** What is stored in the database: SHA-256 of the token, hex encoded. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

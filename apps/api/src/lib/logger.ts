import pino, { type Logger } from 'pino';
import type { Env } from '../env.ts';

export type { Logger };

/**
 * Structured JSON logger. Pretty-printed in development. Sensitive fields are redacted so
 * cookies, credentials and e-mail addresses never reach the logs (AUDIT SEC-19).
 */
export function createLogger(env: Pick<Env, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
    level: env.LOG_LEVEL,
    base: { service: 'devconnector-api' },
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'res.headers["set-cookie"]',
        '*.password',
        '*.newPassword',
        '*.currentPassword',
        '*.token',
        '*.email',
        'email',
      ],
      censor: '[redacted]',
    },
    ...(env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
          },
        }
      : {}),
  });
}

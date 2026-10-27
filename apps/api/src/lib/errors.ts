import type { ProblemDetails } from '@devconnector/shared';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ZodError } from 'zod';
import type { AppEnv } from '../types.ts';

const PROBLEM_TYPE_BASE = 'https://devconnector.dev/problems/';

/**
 * Application error carried to the central handler, rendered as RFC 9457 problem details.
 * Only `AppError`s expose their message to clients; anything else becomes a generic 500.
 */
export class AppError extends Error {
  readonly status: number;
  readonly title: string;
  readonly type: string;
  readonly errors: ProblemDetails['errors'] | undefined;
  readonly headers: Record<string, string>;

  constructor(
    status: number,
    title: string,
    options: {
      detail?: string;
      type?: string;
      errors?: ProblemDetails['errors'];
      headers?: Record<string, string>;
      cause?: unknown;
    } = {},
  ) {
    super(
      options.detail ?? title,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'AppError';
    this.status = status;
    this.title = title;
    this.type = `${PROBLEM_TYPE_BASE}${options.type ?? slug(title)}`;
    this.errors = options.errors;
    this.headers = options.headers ?? {};
  }

  toProblem(instance: string, requestId: string): ProblemDetails {
    const problem: ProblemDetails = {
      type: this.type,
      title: this.title,
      status: this.status,
      instance,
      requestId,
    };
    if (this.message !== this.title) problem.detail = this.message;
    if (this.errors && this.errors.length > 0) problem.errors = this.errors;
    return problem;
  }
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export class ValidationError extends AppError {
  constructor(errors: ProblemDetails['errors'], detail = 'The request is invalid') {
    super(400, 'Validation failed', { detail, errors, type: 'validation' });
  }

  static fromZod(error: ZodError, detail?: string): ValidationError {
    return new ValidationError(
      error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
      detail,
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(detail = 'Authentication required') {
    super(401, 'Unauthorized', { detail, type: 'unauthorized' });
  }
}

export class ForbiddenError extends AppError {
  constructor(detail = 'You are not allowed to do that') {
    super(403, 'Forbidden', { detail, type: 'forbidden' });
  }
}

export class NotFoundError extends AppError {
  constructor(detail = 'Resource not found') {
    super(404, 'Not found', { detail, type: 'not-found' });
  }
}

export class ConflictError extends AppError {
  constructor(detail: string) {
    super(409, 'Conflict', { detail, type: 'conflict' });
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(detail = 'The uploaded file is too large') {
    super(413, 'Payload too large', { detail, type: 'payload-too-large' });
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(detail = 'Unsupported file type') {
    super(415, 'Unsupported media type', { detail, type: 'unsupported-media-type' });
  }
}

export class RateLimitedError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(429, 'Too many requests', {
      detail: `Try again in ${retryAfterSeconds} seconds`,
      type: 'rate-limited',
      headers: { 'Retry-After': String(retryAfterSeconds) },
    });
  }
}

function sendProblem(c: Context<AppEnv>, error: AppError): Response {
  const problem = error.toProblem(c.req.path, c.get('requestId'));
  const headers = new Headers({ 'Content-Type': 'application/problem+json; charset=utf-8' });
  for (const [k, v] of Object.entries(error.headers)) headers.set(k, v);
  return new Response(JSON.stringify(problem), { status: error.status, headers });
}

const STATUS_TITLES: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  405: 'Method not allowed',
  413: 'Payload too large',
  415: 'Unsupported media type',
  429: 'Too many requests',
};

/** Central error handler: AppError → problem+json with its status; anything else → 500 without details. */
export function errorHandler(err: Error, c: Context<AppEnv>): Response {
  if (err instanceof AppError) {
    if (err.status >= 500) c.get('log').error({ err }, err.title);
    return sendProblem(c, err);
  }
  // Errors raised by Hono's own middleware (CSRF, body limit, ...).
  if (err instanceof HTTPException) {
    const title = STATUS_TITLES[err.status] ?? 'Request rejected';
    return sendProblem(c, new AppError(err.status, title, { detail: err.message || title }));
  }
  c.get('log').error({ err }, 'Unhandled error');
  return sendProblem(
    c,
    new AppError(500, 'Internal server error', {
      detail: 'Something went wrong on our side. The request id can be used to find the cause.',
      type: 'internal',
    }),
  );
}

export function notFoundHandler(c: Context<AppEnv>): Response {
  return sendProblem(c, new NotFoundError(`No route for ${c.req.method} ${c.req.path}`));
}

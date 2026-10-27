import type { ProblemDetails } from '@devconnector/shared';

export const API_BASE = '/api/v1';

/** Error thrown for non-2xx responses; carries the RFC 9457 problem details when present. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | null;

  constructor(status: number, problem: ProblemDetails | null, fallback: string) {
    super(problem?.detail ?? problem?.title ?? fallback);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }

  /** Field-level messages keyed by path, for forms. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of this.problem?.errors ?? []) if (!(e.path in out)) out[e.path] = e.message;
    return out;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** Raw body (FormData) — sent as-is, no JSON header. */
  formData?: FormData;
  signal?: AbortSignal;
}

function toSearch(query: Query | undefined): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }
  const res = await fetch(`${API_BASE}${path}${toSearch(options.query)}`, {
    method,
    headers,
    body: body ?? null,
    credentials: 'same-origin',
    ...(options.signal ? { signal: options.signal } : {}),
  });
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('json');
  if (!res.ok) {
    const problem = isJson ? ((await res.json().catch(() => null)) as ProblemDetails | null) : null;
    throw new ApiError(res.status, problem, `Request failed with status ${res.status}`);
  }
  return (isJson ? await res.json() : await res.text()) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

/** Human-readable message for toasts. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong! If the problem persists, contact us!';
}

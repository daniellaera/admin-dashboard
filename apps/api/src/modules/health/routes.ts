import { Hono } from 'hono';
import type { AppDeps, AppEnv } from '../../types.ts';

export function healthRoutes(deps: Pick<AppDeps, 'readiness' | 'version'>) {
  const startedAt = Date.now();
  return (
    new Hono<AppEnv>()
      // Liveness: the process answers.
      .get('/health', (c) =>
        c.json({
          status: 'ok' as const,
          version: deps.version,
          uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        }),
      )
      // Readiness: every dependency probe passes (database, uploads directory, ...).
      .get('/ready', async (c) => {
        const entries = await Promise.all(
          Object.entries(deps.readiness).map(async ([name, probe]) => {
            try {
              return [name, await probe()] as const;
            } catch {
              return [name, false] as const;
            }
          }),
        );
        const checks = Object.fromEntries(entries);
        const ready = entries.every(([, ok]) => ok);
        return c.json(
          { status: ready ? ('ready' as const) : ('not-ready' as const), checks },
          ready ? 200 : 503,
        );
      })
  );
}

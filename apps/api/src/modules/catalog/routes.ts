import { Hono } from 'hono';
import type { AppEnv } from '../../types.ts';
import type { CatalogService } from './service.ts';

/** Public read of the skills/tags catalog (drives the selects in the web app). */
export function catalogRoutes(catalog: CatalogService) {
  return new Hono<AppEnv>().get('/', async (c) => c.json(await catalog.all()));
}

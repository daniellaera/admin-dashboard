import {
  adminUsersQuerySchema,
  adminUserUpdateSchema,
  auditQuerySchema,
  catalogItemSchema,
  catalogItemUpdateSchema,
  catalogKindParamSchema,
  catalogValueParamSchema,
  idParamSchema,
  invitationCreateSchema,
  settingsUpdateSchema,
} from '@devconnector/shared';
import { Hono } from 'hono';
import { clientIp } from '../../lib/request-meta.ts';
import { validate } from '../../lib/validate.ts';
import type { AppEnv } from '../../types.ts';
import type { AuditService } from '../audit/service.ts';
import { currentUser, hasSudo, requireRole, SudoRequiredError } from '../auth/middleware.ts';
import type { CatalogService } from '../catalog/service.ts';
import type { InvitationsService } from '../invitations/service.ts';
import type { SettingsService } from '../settings/service.ts';
import type { AdminService } from './service.ts';

export interface AdminRouteDeps {
  admin: AdminService;
  invitations: InvitationsService;
  settings: SettingsService;
  audit: AuditService;
  catalog: CatalogService;
}

/**
 * Admin area (OWNER and ADMIN). Role changes and admin invitations additionally require sudo
 * mode (ADR-013); the services enforce who may act on whom.
 */
export function adminRoutes({ admin, invitations, settings, audit, catalog }: AdminRouteDeps) {
  return (
    new Hono<AppEnv>()
      .use(requireRole('owner', 'admin'))
      .get('/stats', async (c) => c.json(await admin.stats()))

      // ── users ──────────────────────────────────────────────────────────────────
      .get('/users', validate('query', adminUsersQuerySchema), async (c) =>
        c.json(await admin.listUsers(c.req.valid('query'))),
      )
      .get('/users/:id', validate('param', idParamSchema), async (c) =>
        c.json(await admin.getUser(c.req.valid('param').id)),
      )
      .patch(
        '/users/:id',
        validate('param', idParamSchema),
        validate('json', adminUserUpdateSchema),
        async (c) => {
          const input = c.req.valid('json');
          const actor = currentUser(c);
          if (input.role !== undefined && !hasSudo(actor)) throw new SudoRequiredError();
          return c.json(await admin.updateUser(c.req.valid('param').id, actor, input, clientIp(c)));
        },
      )
      .delete('/users/:id', validate('param', idParamSchema), async (c) => {
        await admin.deleteUser(c.req.valid('param').id, currentUser(c), clientIp(c));
        return c.body(null, 204);
      })

      // ── invitations ────────────────────────────────────────────────────────────
      .get('/invitations', async (c) => c.json(await invitations.listPending()))
      .post('/invitations', validate('json', invitationCreateSchema), async (c) => {
        const input = c.req.valid('json');
        const actor = currentUser(c);
        if (input.role === 'admin' && !hasSudo(actor)) throw new SudoRequiredError();
        return c.json(await invitations.create(actor, input, clientIp(c)), 201);
      })
      .delete('/invitations/:id', validate('param', idParamSchema), async (c) => {
        await invitations.revoke(c.req.valid('param').id, currentUser(c), clientIp(c));
        return c.body(null, 204);
      })

      // ── settings & audit ───────────────────────────────────────────────────────
      .get('/settings', async (c) => c.json(await settings.get()))
      .put('/settings', validate('json', settingsUpdateSchema), async (c) =>
        c.json(await settings.update(c.req.valid('json'), currentUser(c), clientIp(c))),
      )
      .get('/audit', validate('query', auditQuerySchema), async (c) =>
        c.json(await audit.list(c.req.valid('query'))),
      )

      // ── catalog ────────────────────────────────────────────────────────────────
      .post(
        '/catalog/:kind',
        validate('param', catalogKindParamSchema),
        validate('json', catalogItemSchema),
        async (c) => {
          const { kind } = c.req.valid('param');
          const item = await catalog.create(kind, c.req.valid('json'));
          await audit.record({
            action: 'catalog.create',
            actorId: currentUser(c).id,
            data: { kind, ...item },
            ip: clientIp(c),
          });
          return c.json(item, 201);
        },
      )
      .patch(
        '/catalog/:kind/:value',
        validate('param', catalogValueParamSchema),
        validate('json', catalogItemUpdateSchema),
        async (c) => {
          const { kind, value } = c.req.valid('param');
          const item = await catalog.update(kind, value, c.req.valid('json').label);
          await audit.record({
            action: 'catalog.update',
            actorId: currentUser(c).id,
            data: { kind, ...item },
            ip: clientIp(c),
          });
          return c.json(item);
        },
      )
      .delete('/catalog/:kind/:value', validate('param', catalogValueParamSchema), async (c) => {
        const { kind, value } = c.req.valid('param');
        await catalog.remove(kind, value);
        await audit.record({
          action: 'catalog.delete',
          actorId: currentUser(c).id,
          data: { kind, value },
          ip: clientIp(c),
        });
        return c.body(null, 204);
      })
  );
}

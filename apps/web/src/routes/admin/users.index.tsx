import { ROLES } from '@devconnector/shared';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { UsersPage } from '@/features/admin/UsersPage.tsx';
import { requireStaff } from '@/lib/guards.ts';

export const Route = createFileRoute('/admin/users/')({
  beforeLoad: ({ context }) => ({ me: requireStaff(context.me) }),
  validateSearch: (s) =>
    z
      .object({
        page: z.coerce.number().int().min(1).optional(),
        q: z.string().optional(),
        role: z.enum(ROLES).optional(),
        status: z.enum(['active', 'disabled']).optional(),
      })
      .parse(s),
  component: RouteComponent,
});

function RouteComponent() {
  return <UsersPage me={Route.useRouteContext().me} search={Route.useSearch()} />;
}

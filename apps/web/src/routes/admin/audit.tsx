import { AUDIT_ACTIONS } from '@devconnector/shared';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AuditPage } from '@/features/admin/StaffPages.tsx';
import { requireStaff } from '@/lib/guards.ts';

export const Route = createFileRoute('/admin/audit')({
  beforeLoad: ({ context }) => ({ me: requireStaff(context.me) }),
  validateSearch: (s) =>
    z
      .object({
        page: z.coerce.number().int().min(1).optional(),
        action: z.enum(AUDIT_ACTIONS).optional(),
      })
      .parse(s),
  component: RouteComponent,
});

function RouteComponent() {
  return <AuditPage search={Route.useSearch()} />;
}

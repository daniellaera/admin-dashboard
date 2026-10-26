import { createFileRoute } from '@tanstack/react-router';
import { InvitationsPage } from '@/features/admin/StaffPages.tsx';
import { requireStaff } from '@/lib/guards.ts';

export const Route = createFileRoute('/admin/invitations')({
  beforeLoad: ({ context }) => ({ me: requireStaff(context.me) }),
  component: RouteComponent,
});

function RouteComponent() {
  return <InvitationsPage me={Route.useRouteContext().me} />;
}

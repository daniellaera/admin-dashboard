import { createFileRoute } from '@tanstack/react-router';
import { UserDetailPage } from '@/features/admin/UsersPage.tsx';
import { requireStaff } from '@/lib/guards.ts';

export const Route = createFileRoute('/admin/users/$userId')({
  beforeLoad: ({ context }) => ({ me: requireStaff(context.me) }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <UserDetailPage me={Route.useRouteContext().me} userId={Number(Route.useParams().userId)} />
  );
}

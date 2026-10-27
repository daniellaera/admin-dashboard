import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/features/admin/DashboardPage.tsx';

export const Route = createFileRoute('/admin/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <DashboardPage me={Route.useRouteContext().me} />;
}

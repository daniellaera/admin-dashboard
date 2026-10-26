import { createFileRoute } from '@tanstack/react-router';
import { ProfilePage } from '@/features/profile/ProfilePage.tsx';

export const Route = createFileRoute('/admin/profile')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProfilePage me={Route.useRouteContext().me} />;
}

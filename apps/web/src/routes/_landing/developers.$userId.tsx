import { createFileRoute } from '@tanstack/react-router';
import { DeveloperPage } from '@/features/profiles/DeveloperPage.tsx';

export const Route = createFileRoute('/_landing/developers/$userId')({
  component: RouteComponent,
});

function RouteComponent() {
  return <DeveloperPage userId={Number(Route.useParams().userId)} />;
}

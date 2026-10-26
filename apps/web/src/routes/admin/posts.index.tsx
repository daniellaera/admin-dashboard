import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { MyPostsPage } from '@/features/posts/MyPostsPage.tsx';

export const Route = createFileRoute('/admin/posts/')({
  validateSearch: (s) => z.object({ page: z.coerce.number().int().min(1).optional() }).parse(s),
  component: RouteComponent,
});

function RouteComponent() {
  return <MyPostsPage page={Route.useSearch().page ?? 1} />;
}

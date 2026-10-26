import { createFileRoute } from '@tanstack/react-router';
import { PostFormPage } from '@/features/posts/MyPostsPage.tsx';

export const Route = createFileRoute('/admin/posts/new')({
  component: RouteComponent,
});

function RouteComponent() {
  return <PostFormPage />;
}

import { createFileRoute } from '@tanstack/react-router';
import { PostPage } from '@/features/posts/PostPage.tsx';

export const Route = createFileRoute('/_landing/posts/$postId')({
  component: RouteComponent,
});

function RouteComponent() {
  return <PostPage postId={Number(Route.useParams().postId)} />;
}

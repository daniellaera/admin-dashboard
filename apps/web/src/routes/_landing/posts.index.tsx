import { POST_TYPES } from '@devconnector/shared';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { FeedPage } from '@/features/posts/FeedPage.tsx';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  type: z.enum(POST_TYPES).optional(),
  tag: z.string().optional(),
});

export const Route = createFileRoute('/_landing/posts/')({
  validateSearch: (s) => searchSchema.parse(s),
  component: RouteComponent,
});

function RouteComponent() {
  return <FeedPage search={Route.useSearch()} />;
}

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { MagicLinkPage } from '@/features/auth/TokenPages.tsx';

export const Route = createFileRoute('/_landing/auth/magic')({
  validateSearch: (s) => z.object({ token: z.string().optional() }).parse(s),
  component: RouteComponent,
});

function RouteComponent() {
  return <MagicLinkPage token={Route.useSearch().token} />;
}

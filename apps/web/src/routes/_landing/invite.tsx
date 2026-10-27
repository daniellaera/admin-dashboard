import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InvitePage } from '@/features/auth/TokenPages.tsx';

export const Route = createFileRoute('/_landing/invite')({
  validateSearch: (s) => z.object({ token: z.string().optional() }).parse(s),
  component: RouteComponent,
});

function RouteComponent() {
  return <InvitePage token={Route.useSearch().token} />;
}

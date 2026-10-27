import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { VerifyEmailPage } from '@/features/auth/TokenPages.tsx';

export const Route = createFileRoute('/_landing/auth/verify')({
  validateSearch: (s) => z.object({ token: z.string().optional() }).parse(s),
  component: RouteComponent,
});

function RouteComponent() {
  return <VerifyEmailPage token={Route.useSearch().token} />;
}

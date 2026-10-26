import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ResetPasswordPage } from '@/features/auth/TokenPages.tsx';

export const Route = createFileRoute('/_landing/auth/reset')({
  validateSearch: (s) => z.object({ token: z.string().optional() }).parse(s),
  component: RouteComponent,
});

function RouteComponent() {
  return <ResetPasswordPage token={Route.useSearch().token} />;
}

import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { SigninPage } from '@/features/auth/SigninPage.tsx';
import { safeRedirect } from '@/lib/guards.ts';

const searchSchema = z.object({
  mode: z.enum(['login', 'register']).optional(),
  redirect: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute('/_landing/signin')({
  validateSearch: (search) => searchSchema.parse(search),
  // Signed-in visitors never see the sign-in page (the original app allowed it).
  beforeLoad: ({ context, search }) => {
    if (context.me) throw redirect({ to: safeRedirect(search.redirect, '/admin') });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <SigninPage search={Route.useSearch()} />;
}

import { createFileRoute, redirect } from '@tanstack/react-router';
import { AdminShell } from '@/features/shell/AdminShell.tsx';

/** The dev area: requires a session; staff-only pages add their own role guard. */
export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context, location }) => {
    if (!context.me) {
      throw redirect({ to: '/signin', search: { redirect: location.href } });
    }
    return { me: context.me };
  },
  component: AdminShell,
});

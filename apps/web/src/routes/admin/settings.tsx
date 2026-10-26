import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/features/admin/StaffPages.tsx';
import { requireStaff } from '@/lib/guards.ts';

export const Route = createFileRoute('/admin/settings')({
  beforeLoad: ({ context }) => ({ me: requireStaff(context.me) }),
  component: SettingsPage,
});

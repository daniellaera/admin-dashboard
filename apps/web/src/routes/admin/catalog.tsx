import { createFileRoute } from '@tanstack/react-router';
import { CatalogPage } from '@/features/admin/StaffPages.tsx';
import { requireStaff } from '@/lib/guards.ts';

export const Route = createFileRoute('/admin/catalog')({
  beforeLoad: ({ context }) => ({ me: requireStaff(context.me) }),
  component: CatalogPage,
});

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DevelopersPage } from '@/features/profiles/DevelopersPage.tsx';

export const Route = createFileRoute('/_landing/developers/')({
  validateSearch: (s) =>
    z
      .object({ page: z.coerce.number().int().min(1).optional(), q: z.string().optional() })
      .parse(s),
  component: RouteComponent,
});

function RouteComponent() {
  return <DevelopersPage search={Route.useSearch()} />;
}

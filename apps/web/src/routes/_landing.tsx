import { createFileRoute } from '@tanstack/react-router';
import { LandingShell } from '@/features/shell/LandingShell.tsx';

/** Pathless layout: public pages share the landing navbar, banners and footer. */
export const Route = createFileRoute('/_landing')({
  component: LandingShell,
});

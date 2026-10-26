import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/features/home/HomePage.tsx';

export const Route = createFileRoute('/_landing/')({
  component: HomePage,
});

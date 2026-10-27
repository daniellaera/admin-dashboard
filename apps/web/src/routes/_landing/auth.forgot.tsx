import { createFileRoute } from '@tanstack/react-router';
import { ForgotPasswordPage } from '@/features/auth/TokenPages.tsx';

export const Route = createFileRoute('/_landing/auth/forgot')({
  component: ForgotPasswordPage,
});

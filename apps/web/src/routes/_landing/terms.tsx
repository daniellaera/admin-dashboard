import { createFileRoute } from '@tanstack/react-router';
import { TermsPage } from '@/features/legal/LegalPages.tsx';

export const Route = createFileRoute('/_landing/terms')({ component: TermsPage });

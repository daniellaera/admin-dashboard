import { createFileRoute } from '@tanstack/react-router';
import { PrivacyPage } from '@/features/legal/LegalPages.tsx';

export const Route = createFileRoute('/_landing/privacy')({ component: PrivacyPage });

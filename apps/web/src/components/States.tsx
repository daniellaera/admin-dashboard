import { Alert, Button, Center, Loader, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconInbox } from '@tabler/icons-react';
import { useEffect } from 'react';
import { errorMessage } from '@/lib/api.ts';

export function PageLoader() {
  return (
    <Center py={64} role="status" aria-live="polite">
      <Loader />
    </Center>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Stack align="center" py={48} gap="sm">
      <ThemeIcon variant="light" size={48} radius="xl" color="gray" aria-hidden>
        <IconInbox size={28} />
      </ThemeIcon>
      <Text c="dimmed">{message}</Text>
    </Stack>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  return (
    <Alert
      color="red"
      variant="light"
      title="Oops!"
      icon={<IconAlertTriangle size={18} />}
      role="alert"
    >
      <Stack gap="sm" align="flex-start">
        <Text size="sm">
          {error
            ? errorMessage(error)
            : 'Something went wrong! If the problem persists, contact us!'}
        </Text>
        {onRetry && (
          <Button size="xs" variant="default" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

/** Sets `document.title` per page (the original app never did). */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · DevConnector` : 'DevConnector';
    return () => {
      document.title = previous;
    };
  }, [title]);
}

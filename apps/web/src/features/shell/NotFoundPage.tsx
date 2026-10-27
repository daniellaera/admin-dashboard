import { Button, Container, Stack, Text, Title } from '@mantine/core';
import { IconError404 } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

export function NotFoundPage() {
  return (
    <Container size="sm" py={96}>
      <Stack align="center" gap="md">
        <IconError404 size={120} stroke={1.2} aria-hidden />
        <Title order={1} fw={800}>
          Oops
        </Title>
        <Text c="dimmed" ta="center">
          Sorry, we couldn’t find the page you’re looking for.
        </Text>
        <Button component={Link} to="/" variant="default">
          Back to home
        </Button>
      </Stack>
    </Container>
  );
}

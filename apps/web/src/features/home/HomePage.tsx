import { Button, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

/** "Built with" bullets — the original list, updated to the new stack. */
export const FEATURES = [
  'React 19 + Vite',
  'Self-hosted PostgreSQL',
  'Realtime with Server-Sent Events',
  'In-app and e-mail notifications',
  'Containerized with Docker',
  'Styled with Mantine',
  'Written in TypeScript',
  'Hono API with Zod validation',
  'Data fetching with TanStack Query',
  'Forms handled by React Hook Form',
  'Code hosted on GitHub',
  'CI with GitHub Actions',
  'Deploys anywhere with Docker Compose',
  '100% Responsive',
  'Dark/Light mode support',
  'Theming',
  'Best Practice',
  'Clean code',
];

export function HomePage() {
  return (
    <Container size="lg" py={{ base: 64, md: 96 }}>
      <Stack align="center" gap="xl">
        <Title order={1} ta="center" fw={800} style={{ letterSpacing: '-0.02em' }} maw={720}>
          <Text
            component="span"
            inherit
            variant="gradient"
            gradient={{ from: '#2193b0', to: '#6dd5ed', deg: 90 }}
          >
            Dev Connector
          </Text>{' '}
          dashboard
        </Title>
        <Text c="dimmed" size="xl" ta="center" maw={560}>
          Connecting with Developers has never been so easy!
        </Text>
        <Group justify="center">
          <Button component={Link} to="/developers" size="lg" variant="default">
            Developers
          </Button>
          <Button component={Link} to="/admin" size="lg">
            Dashboard
          </Button>
        </Group>
      </Stack>

      <Stack align="center" gap="xs" mt={96} mb="xl">
        <Text c="blue" fw={600}>
          Technologies
        </Text>
        <Title order={2} fw={800}>
          Built with
        </Title>
      </Stack>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing={{ base: 'sm', md: 'xl' }}>
        {FEATURES.map((feature) => (
          <Group key={feature} gap="sm" wrap="nowrap">
            <ThemeIcon color="green" variant="light" radius="xl" size="sm" aria-hidden>
              <IconCheck size={14} />
            </ThemeIcon>
            <Text c="dimmed">{feature}</Text>
          </Group>
        ))}
      </SimpleGrid>
    </Container>
  );
}

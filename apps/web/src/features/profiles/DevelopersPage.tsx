import { labelOf, type PublicProfile } from '@devconnector/shared';
import {
  Badge,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { PaginationBar } from '@/components/PaginationBar.tsx';
import { EmptyState, ErrorState, PageLoader, usePageTitle } from '@/components/States.tsx';
import { AnchorLink } from '@/components/links.tsx';
import { UserAvatar } from '@/components/UserAvatar.tsx';
import { colorFor } from '@/lib/format.ts';
import { catalogQuery, directoryQuery } from './api.ts';

export interface DevelopersSearch {
  page?: number | undefined;
  q?: string | undefined;
}

export function SkillChips({ skills }: { skills: string[] }) {
  const catalog = useQuery(catalogQuery);
  if (skills.length === 0) return null;
  return (
    <Group gap={6}>
      {skills.map((s) => (
        <Badge key={s} variant="light" color={colorFor(s)} size="sm">
          {catalog.data ? labelOf(catalog.data.skills, s) : s}
        </Badge>
      ))}
    </Group>
  );
}

function DeveloperCard({ profile }: { profile: PublicProfile }) {
  return (
    <Card component="article" h="100%">
      <Stack gap="sm" h="100%">
        <Group wrap="nowrap">
          <UserAvatar card={profile} size="lg" />
          <div>
            <Group gap={6}>
              <AnchorLink
                to="/developers/$userId"
                params={{ userId: String(profile.id) }}
                fw={700}
                c="inherit"
              >
                {profile.displayName}
              </AnchorLink>
              <Badge variant="outline" color="green" size="xs">
                Developer
              </Badge>
            </Group>
            {(Boolean(profile.company) || Boolean(profile.website)) && (
              <Text size="sm" c="dimmed">
                {[profile.company, profile.website?.replace(/^https?:\/\//, '')]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}
          </div>
        </Group>
        {profile.bio && <Text size="sm">{profile.bio}</Text>}
        <SkillChips skills={profile.skills} />
      </Stack>
    </Card>
  );
}

const PAGE_SIZE = 12;

export function DevelopersPage({ search }: { search: DevelopersSearch }) {
  usePageTitle('Developers');
  const navigate = useNavigate();
  const page = search.page ?? 1;
  const [draft, setDraft] = useState(search.q ?? '');
  const query = useQuery(directoryQuery({ page, ...(search.q ? { q: search.q } : {}) }));
  const applySearch = useDebouncedCallback((q: string) => {
    const trimmed = q.trim();
    void navigate({ to: '/developers', search: trimmed ? { page: 1, q: trimmed } : { page: 1 } });
  }, 300);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Title order={1} size="h2">
            Developers
          </Title>
          <TextInput
            aria-label="Search developers"
            placeholder="Search by name or company"
            leftSection={<IconSearch size={16} />}
            value={draft}
            onChange={(e) => {
              setDraft(e.currentTarget.value);
              applySearch(e.currentTarget.value);
            }}
            w={{ base: '100%', sm: 320 }}
          />
        </Group>
        {query.isPending ? (
          <PageLoader />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState message="Developers will show up here!" />
        ) : (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {query.data.items.map((p) => (
                <DeveloperCard key={p.id} profile={p} />
              ))}
            </SimpleGrid>
            <PaginationBar
              page={page}
              limit={PAGE_SIZE}
              total={query.data.total}
              onChange={(p) =>
                void navigate({ to: '/developers', search: (prev) => ({ ...prev, page: p }) })
              }
            />
          </>
        )}
      </Stack>
    </Container>
  );
}

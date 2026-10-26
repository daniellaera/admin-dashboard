import type { EducationDto, ExperienceDto } from '@devconnector/shared';
import {
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { EmptyState, ErrorState, PageLoader, usePageTitle } from '@/components/States.tsx';
import { UserAvatar } from '@/components/UserAvatar.tsx';
import { isApiError } from '@/lib/api.ts';
import { shortDate } from '@/lib/format.ts';
import { profileQuery } from './api.ts';
import { SkillChips } from './DevelopersPage.tsx';

export function period(item: {
  startedOn: string;
  endedOn: string | null;
  isCurrent: boolean;
}): string {
  return `${shortDate(item.startedOn)} – ${item.isCurrent || !item.endedOn ? 'present' : shortDate(item.endedOn)}`;
}

export function ExperienceTable({ items }: { items: ExperienceDto[] }) {
  if (items.length === 0) return <EmptyState message="Experiences will show up here!" />;
  return (
    <Table.ScrollContainer minWidth={600}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Title</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Company</Table.Th>
            <Table.Th>Location</Table.Th>
            <Table.Th>From – To</Table.Th>
            <Table.Th>Current</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((e) => (
            <Table.Tr key={e.id}>
              <Table.Td fw={500}>{e.title}</Table.Td>
              <Table.Td>{e.description}</Table.Td>
              <Table.Td>{e.company}</Table.Td>
              <Table.Td>{e.location}</Table.Td>
              <Table.Td>{period(e)}</Table.Td>
              <Table.Td>{e.isCurrent ? 'Yes' : 'No'}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export function EducationTable({ items }: { items: EducationDto[] }) {
  if (items.length === 0) return <EmptyState message="Education will show up here!" />;
  return (
    <Table.ScrollContainer minWidth={600}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>School</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Degree</Table.Th>
            <Table.Th>Field of study</Table.Th>
            <Table.Th>From – To</Table.Th>
            <Table.Th>Current</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((e) => (
            <Table.Tr key={e.id}>
              <Table.Td fw={500}>{e.school}</Table.Td>
              <Table.Td>{e.description}</Table.Td>
              <Table.Td>{e.degree}</Table.Td>
              <Table.Td>{e.fieldOfStudy}</Table.Td>
              <Table.Td>{period(e)}</Table.Td>
              <Table.Td>{e.isCurrent ? 'Yes' : 'No'}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

/** Public profile page (new: the original app had cards only). */
export function DeveloperPage({ userId }: { userId: number }) {
  const profile = useQuery(profileQuery(userId));
  usePageTitle(profile.data?.displayName ?? 'Developer');
  if (profile.isPending) return <PageLoader />;
  if (profile.isError) {
    return (
      <Container size="md" py="xl">
        {isApiError(profile.error, 404) ? (
          <EmptyState message="This profile is private or does not exist." />
        ) : (
          <ErrorState error={profile.error} />
        )}
      </Container>
    );
  }
  const p = profile.data;
  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Button
          component={Link}
          to="/developers"
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          w="fit-content"
        >
          All developers
        </Button>
        <Card>
          <Group align="flex-start" wrap="nowrap">
            <UserAvatar card={p} size={96} />
            <Stack gap={6} style={{ flex: 1 }}>
              <Group gap="sm">
                <Title order={1} size="h2">
                  {p.displayName}
                </Title>
                <Badge variant="outline" color="green">
                  Developer
                </Badge>
              </Group>
              {p.company && <Text c="dimmed">{p.company}</Text>}
              {p.website && (
                <Anchor href={p.website} target="_blank" rel="noopener noreferrer nofollow ugc">
                  {p.website.replace(/^https?:\/\//, '')}
                </Anchor>
              )}
              {p.bio && <Text>{p.bio}</Text>}
              <SkillChips skills={p.skills} />
              <Text size="sm" c="dimmed">
                {p.postCount} published post{p.postCount === 1 ? '' : 's'}
              </Text>
            </Stack>
          </Group>
        </Card>
        <Card>
          <Title order={2} size="h4" mb="sm">
            Experiences
          </Title>
          <ExperienceTable items={p.experiences} />
        </Card>
        <Card>
          <Title order={2} size="h4" mb="sm">
            Education
          </Title>
          <EducationTable items={p.educations} />
        </Card>
      </Stack>
    </Container>
  );
}

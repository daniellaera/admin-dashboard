import type { Me } from '@devconnector/shared';
import {
  Card,
  Group,
  List,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconBell, IconCheck, IconCircleDashed, IconMessage, IconUsers } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { ButtonLink } from '@/components/links.tsx';
import { ErrorState, PageLoader, usePageTitle } from '@/components/States.tsx';
import { UserAvatar } from '@/components/UserAvatar.tsx';
import { unreadCountQuery } from '@/features/notifications/api.ts';
import { myPostsQuery } from '@/features/posts/api.ts';
import { myProfileQuery } from '@/features/profiles/api.ts';
import { timeAgo } from '@/lib/format.ts';
import { isStaff } from '@/lib/guards.ts';
import { statsQuery } from './api.ts';
import { RoleBadge, Toolbar } from './common.tsx';

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fz={32} fw={700} lh={1.1}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Card>
  );
}

export function DashboardPage({ me }: { me: Me }) {
  usePageTitle('Dashboard');
  return isStaff(me) ? <StaffDashboard /> : <MemberDashboard me={me} />;
}

function StaffDashboard() {
  const stats = useQuery(statsQuery);
  if (stats.isPending) return <PageLoader />;
  if (stats.isError) return <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />;
  const s = stats.data;
  const activePct = s.users.total === 0 ? 0 : Math.round((s.users.active / s.users.total) * 100);
  return (
    <>
      <Toolbar title="Dashboard" />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Stat label="Total Users" value={s.users.total} hint={`${s.users.verified} verified`} />
        <Stat label="Active Users" value={s.users.active} />
        <Stat label="Disabled Users" value={s.users.disabled} />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md" mt="md">
        <Card>
          <Text fw={600} mb="sm">
            Content
          </Text>
          <Stack gap="sm">
            {[
              ['Posts', s.posts.total, `${s.posts.published} published`],
              ['Comments', s.comments, ''],
              ['Likes', s.likes, ''],
              ['Pending invitations', s.pendingInvitations, ''],
            ].map(([label, value, hint]) => (
              <Group key={String(label)} justify="space-between">
                <Text c="dimmed">{label}</Text>
                <Text fw={600}>
                  {value}{' '}
                  {hint ? (
                    <Text component="span" size="xs" c="dimmed">
                      ({hint})
                    </Text>
                  ) : null}
                </Text>
              </Group>
            ))}
            <Group justify="space-between">
              <Text c="dimmed">Staff accounts</Text>
              <Text fw={600}>
                {s.users.admins}/{s.users.total}
              </Text>
            </Group>
            <Progress value={s.users.total ? (s.users.admins / s.users.total) * 100 : 0} />
          </Stack>
        </Card>
        <Card>
          <Text fw={600} mb="sm">
            User Status
          </Text>
          <Group>
            <RingProgress
              size={160}
              thickness={16}
              roundCaps
              sections={[{ value: activePct, color: 'blue' }]}
              label={
                <Text ta="center" fw={700}>
                  {activePct}%
                </Text>
              }
            />
            <Stack gap={4}>
              <Group gap="xs">
                <ThemeIcon size={12} radius="xl" color="blue" />
                <Text size="sm">Active</Text>
              </Group>
              <Group gap="xs">
                <ThemeIcon size={12} radius="xl" color="gray" />
                <Text size="sm">Disabled</Text>
              </Group>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>
      <Card mt="md">
        <Text fw={600} mb="sm">
          Recently Added
        </Text>
        <List spacing="sm" listStyleType="none">
          {s.recentUsers.map((u) => (
            <List.Item key={u.id} icon={<UserAvatar card={u} size="sm" />}>
              <Group gap="sm">
                <Text fw={500}>{u.displayName}</Text>
                <Text size="sm" c="dimmed">
                  {u.email}
                </Text>
                <RoleBadge role={u.role} />
                <Text size="xs" c="dimmed">
                  {timeAgo(u.createdAt)}
                </Text>
              </Group>
            </List.Item>
          ))}
        </List>
      </Card>
    </>
  );
}

function MemberDashboard({ me }: { me: Me }) {
  const posts = useQuery(myPostsQuery({ page: 1, limit: 1 }));
  const unread = useQuery(unreadCountQuery);
  const profile = useQuery(myProfileQuery);
  const checks = profile.data
    ? [
        ['Username', Boolean(profile.data.username)],
        ['Bio', Boolean(profile.data.bio)],
        ['Skills', profile.data.skills.length > 0],
        ['Avatar', Boolean(profile.data.avatarUrl)],
        ['Experience', profile.data.experiences.length > 0],
      ]
    : [];
  const done = checks.filter(([, ok]) => ok).length;
  return (
    <>
      <Toolbar title={`Welcome back, ${me.profile.displayName}`} />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Stat label="My posts" value={posts.data?.total ?? '…'} />
        <Stat label="Unread notifications" value={unread.data?.unread ?? '…'} />
        <Stat
          label="Profile completeness"
          value={checks.length ? `${Math.round((done / checks.length) * 100)}%` : '…'}
        />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
        <Card>
          <Text fw={600} mb="sm">
            Complete your profile
          </Text>
          <List spacing="xs">
            {checks.map(([label, ok]) => (
              <List.Item
                key={String(label)}
                icon={
                  <ThemeIcon size={20} radius="xl" color={ok ? 'green' : 'gray'} variant="light">
                    {ok ? <IconCheck size={12} /> : <IconCircleDashed size={12} />}
                  </ThemeIcon>
                }
              >
                {label}
              </List.Item>
            ))}
          </List>
          <ButtonLink to="/admin/profile" mt="md" variant="light">
            Edit profile
          </ButtonLink>
        </Card>
        <Card>
          <Text fw={600} mb="sm">
            Shortcuts
          </Text>
          <Stack>
            <ButtonLink
              to="/admin/posts/new"
              leftSection={<IconMessage size={16} />}
              variant="default"
            >
              Write a post
            </ButtonLink>
            <ButtonLink to="/developers" leftSection={<IconUsers size={16} />} variant="default">
              Browse developers
            </ButtonLink>
            <ButtonLink
              to="/admin/notifications"
              leftSection={<IconBell size={16} />}
              variant="default"
            >
              Notifications
            </ButtonLink>
          </Stack>
        </Card>
      </SimpleGrid>
    </>
  );
}

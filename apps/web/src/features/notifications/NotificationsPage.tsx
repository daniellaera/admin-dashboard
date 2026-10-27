import type {
  CONFIGURABLE_NOTIFICATION_TYPES,
  NotificationDto,
  NotificationPreferenceDto,
  NotificationPreferenceInput,
} from '@devconnector/shared';
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Stack,
  Switch,
  Table,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { EmptyState, ErrorState, PageLoader, usePageTitle } from '@/components/States.tsx';
import { UserAvatar } from '@/components/UserAvatar.tsx';
import { Toolbar } from '@/features/admin/common.tsx';
import { notificationText } from '@/features/shell/NotificationBell.tsx';
import { timeAgo } from '@/lib/format.ts';
import { toast } from '@/lib/notify.ts';
import {
  notificationsQuery,
  preferencesQuery,
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
  useSavePreferences,
} from './api.ts';

const TYPE_LABEL: Record<(typeof CONFIGURABLE_NOTIFICATION_TYPES)[number], string> = {
  comment: 'Someone comments on my post',
  like: 'Someone likes my post',
  new_post: 'A new post is published',
};

export function NotificationsPage() {
  usePageTitle('Notifications');
  const list = useInfiniteQuery(notificationsQuery);
  const markAll = useMarkAllRead();
  const markRead = useMarkRead();
  const remove = useDeleteNotification();
  const navigate = useNavigate();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  const open = (n: NotificationDto) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.postId) void navigate({ to: '/posts/$postId', params: { postId: String(n.postId) } });
  };

  return (
    <>
      <Toolbar title="Notifications">
        <Button
          variant="default"
          onClick={() => {
            markAll.mutate(undefined, {
              onError: (e) => {
                toast.error(e);
              },
            });
          }}
          disabled={!items.some((n) => !n.readAt)}
        >
          Mark all read
        </Button>
      </Toolbar>
      <Card>
        <Text fw={600} mb="sm">
          Inbox
        </Text>
        {list.isPending ? (
          <PageLoader />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState message="Nothing new yet" />
        ) : (
          <Stack gap={0}>
            {items.map((n) => (
              <Group
                key={n.id}
                justify="space-between"
                wrap="nowrap"
                py="sm"
                style={{
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  opacity: n.readAt ? 0.65 : 1,
                }}
              >
                <UnstyledButton
                  onClick={() => {
                    open(n);
                  }}
                  style={{ flex: 1 }}
                >
                  <Group gap="sm" wrap="nowrap">
                    {n.actor ? <UserAvatar card={n.actor} size="sm" /> : null}
                    <div>
                      <Text size="sm" fw={n.readAt ? 400 : 600}>
                        {notificationText(n)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {timeAgo(n.createdAt)}
                      </Text>
                    </div>
                  </Group>
                </UnstyledButton>
                <Group gap={4} wrap="nowrap">
                  {!n.readAt && (
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      onClick={() => {
                        markRead.mutate(n.id);
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Delete notification"
                    onClick={() => {
                      remove.mutate(n.id, {
                        onError: (e) => {
                          toast.error(e);
                        },
                      });
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            ))}
            {list.hasNextPage && (
              <Button
                variant="default"
                mt="md"
                onClick={() => void list.fetchNextPage()}
                loading={list.isFetchingNextPage}
              >
                Load more
              </Button>
            )}
          </Stack>
        )}
      </Card>
      <Preferences />
    </>
  );
}

function Preferences() {
  const prefs = useQuery(preferencesQuery);
  if (!prefs.data) return null;
  // Keyed on the saved state so a fresh fetch resets the draft without an effect.
  return <PreferencesForm key={JSON.stringify(prefs.data)} saved={prefs.data} />;
}

const toInput = (list: NotificationPreferenceDto[]): NotificationPreferenceInput[] =>
  list.map((p) => ({
    type: p.type as NotificationPreferenceInput['type'],
    inApp: p.inApp,
    email: p.email,
  }));

function PreferencesForm({ saved }: { saved: NotificationPreferenceDto[] }) {
  const save = useSavePreferences();
  const [draft, setDraft] = useState<NotificationPreferenceInput[]>(() => toInput(saved));
  const set = (
    type: NotificationPreferenceInput['type'],
    key: 'inApp' | 'email',
    value: boolean,
  ) => {
    setDraft(draft.map((p) => (p.type === type ? { ...p, [key]: value } : p)));
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(toInput(saved));
  return (
    <Card mt="md">
      <Group justify="space-between" mb="sm">
        <Text fw={600}>Preferences</Text>
        <Button
          size="xs"
          disabled={!dirty}
          loading={save.isPending}
          onClick={() => {
            // The form is keyed on the saved state and remounts after the save: per-mutate
            // callbacks would be skipped once the component is gone, so toast from the promise.
            save.mutateAsync(draft).then(
              () => {
                toast.success('Preferences saved');
              },
              (e: unknown) => {
                toast.error(e);
              },
            );
          }}
        >
          Save
        </Button>
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>When…</Table.Th>
            <Table.Th>In-app</Table.Th>
            <Table.Th>E-mail</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {draft.map((p) => (
            <Table.Tr key={p.type}>
              <Table.Td>{TYPE_LABEL[p.type]}</Table.Td>
              <Table.Td>
                <Switch
                  aria-label={`In-app: ${TYPE_LABEL[p.type]}`}
                  checked={p.inApp}
                  onChange={(e) => {
                    set(p.type, 'inApp', e.currentTarget.checked);
                  }}
                />
              </Table.Td>
              <Table.Td>
                <Switch
                  aria-label={`E-mail: ${TYPE_LABEL[p.type]}`}
                  checked={p.email}
                  onChange={(e) => {
                    set(p.type, 'email', e.currentTarget.checked);
                  }}
                />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed" mt="sm">
        Security notices (role changes, password changes) are always delivered.
      </Text>
    </Card>
  );
}

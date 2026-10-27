import type { NotificationDto } from '@devconnector/shared';
import {
  ActionIcon,
  Anchor,
  Button,
  Divider,
  Group,
  Indicator,
  Popover,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBell } from '@tabler/icons-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { UserAvatar } from '@/components/UserAvatar.tsx';
import {
  notificationsQuery,
  unreadCountQuery,
  useMarkAllRead,
  useMarkRead,
} from '@/features/notifications/api.ts';
import { timeAgo } from '@/lib/format.ts';

export function notificationText(n: NotificationDto): string {
  const who = n.actor?.displayName ?? 'Someone';
  const title = typeof n.data.postTitle === 'string' ? `"${n.data.postTitle}"` : 'your post';
  switch (n.type) {
    case 'comment':
      return `${who} commented on ${title}`;
    case 'like':
      return `${who} liked ${title}`;
    case 'new_post':
      return `${who} published ${title}`;
    case 'system':
      return n.data.event === 'role_changed'
        ? `Your role is now ${String(n.data.role)}`
        : 'System notification';
  }
}

/** Bell with unread badge and a popover of the latest notifications (parity with the Novu widget). */
export function NotificationBell() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const unread = useQuery(unreadCountQuery);
  const list = useInfiniteQuery({ ...notificationsQuery, enabled: opened });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const navigate = useNavigate();
  const count = unread.data?.unread ?? 0;
  const items = list.data?.pages.flatMap((p) => p.items).slice(0, 8) ?? [];

  const open = (n: NotificationDto) => {
    if (!n.readAt) markRead.mutate(n.id);
    close();
    if (n.postId) void navigate({ to: '/posts/$postId', params: { postId: String(n.postId) } });
    else void navigate({ to: '/admin/notifications' });
  };

  return (
    <Popover
      opened={opened}
      onChange={(o) => {
        if (!o) close();
      }}
      position="bottom-end"
      width={360}
      shadow="md"
    >
      <Popover.Target>
        <Indicator
          label={count > 99 ? '99+' : count}
          size={16}
          disabled={count === 0}
          color="red"
          offset={4}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
            onClick={toggle}
          >
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group justify="space-between" px="md" py="xs">
          <Text fw={600}>Notifications</Text>
          <Button
            size="compact-xs"
            variant="subtle"
            disabled={count === 0}
            onClick={() => {
              markAll.mutate();
            }}
          >
            Mark all read
          </Button>
        </Group>
        <Divider />
        <ScrollArea.Autosize mah={360}>
          {items.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="lg">
              Nothing new yet
            </Text>
          ) : (
            <Stack gap={0}>
              {items.map((n) => (
                <UnstyledButton
                  key={n.id}
                  onClick={() => {
                    open(n);
                  }}
                  px="md"
                  py="sm"
                  style={{ opacity: n.readAt ? 0.6 : 1 }}
                >
                  <Group gap="sm" wrap="nowrap" align="flex-start">
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
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>
        <Divider />
        <Group justify="center" py="xs">
          <Anchor component={Link} to="/admin/notifications" size="sm" onClick={close}>
            All notifications &amp; preferences
          </Anchor>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

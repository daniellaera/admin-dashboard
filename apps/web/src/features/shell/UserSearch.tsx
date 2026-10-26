import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Spotlight, spotlight } from '@mantine/spotlight';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { UserAvatar } from '@/components/UserAvatar.tsx';
import { usersQuery } from '@/features/admin/api.ts';

const MIN_CHARS = 2;

/** Staff-only quick search over the real users table (⌘K / Ctrl+K), replacing the mocked `UserSearch` modal. */
export function UserSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query.trim(), 250);
  const enabled = debounced.length >= MIN_CHARS;
  const results = useQuery({ ...usersQuery({ q: debounced, page: 1 }), enabled });
  const items = results.data?.items ?? [];

  return (
    <>
      <Tooltip label="Search users (⌘K)" withArrow>
        <ActionIcon variant="default" size="lg" aria-label="Search users" onClick={spotlight.open}>
          <IconSearch size={18} />
        </ActionIcon>
      </Tooltip>
      <Spotlight.Root
        query={query}
        onQueryChange={setQuery}
        shortcut={['mod + K']}
        scrollable
        maxHeight={400}
      >
        <Spotlight.Search placeholder="Search the users" leftSection={<IconSearch size={18} />} />
        <Spotlight.ActionsList>
          {enabled && items.length > 0 ? (
            items.map((u) => (
              <Spotlight.Action
                key={u.id}
                onClick={() => {
                  void navigate({ to: '/admin/users/$userId', params: { userId: String(u.id) } });
                }}
              >
                <Group wrap="nowrap" gap="sm">
                  <UserAvatar card={u} size="sm" />
                  <div>
                    <Text size="sm" fw={500}>
                      {u.displayName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {u.email}
                    </Text>
                  </div>
                </Group>
              </Spotlight.Action>
            ))
          ) : (
            <Spotlight.Empty>
              {enabled
                ? results.isPending
                  ? 'Searching…'
                  : 'No result found!'
                : `Type at least ${String(MIN_CHARS)} characters`}
            </Spotlight.Empty>
          )}
        </Spotlight.ActionsList>
      </Spotlight.Root>
    </>
  );
}

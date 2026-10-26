import type { AuthorCard } from '@devconnector/shared';
import { Group, Text } from '@mantine/core';
import { longDate } from '@/lib/format.ts';
import { AnchorLink } from './links.tsx';
import { UserAvatar } from './UserAvatar.tsx';

/** `avatar  name · 19th February 2023` — the author line of posts and comments. */
export function AuthorLine({
  author,
  date,
  link = true,
}: {
  author: AuthorCard;
  date: string;
  link?: boolean;
}) {
  return (
    <Group gap="xs" wrap="nowrap">
      <UserAvatar card={author} size="sm" />
      <Text size="sm" c="dimmed">
        {link ? (
          <AnchorLink
            to="/developers/$userId"
            params={{ userId: String(author.id) }}
            fw={500}
            c="inherit"
          >
            {author.displayName}
          </AnchorLink>
        ) : (
          <Text component="span" fw={500} inherit>
            {author.displayName}
          </Text>
        )}{' '}
        · {longDate(date)}
      </Text>
    </Group>
  );
}

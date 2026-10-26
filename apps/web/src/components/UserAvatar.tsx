import type { AuthorCard } from '@devconnector/shared';
import { Avatar, type AvatarProps } from '@mantine/core';

/** Avatar image when set, otherwise coloured initials of the display name (never the e-mail). */
export function UserAvatar({
  card,
  ...props
}: { card: Pick<AuthorCard, 'displayName' | 'avatarUrl'> } & Omit<AvatarProps, 'src' | 'name'>) {
  return (
    <Avatar
      src={card.avatarUrl}
      name={card.displayName}
      color="initials"
      alt={card.displayName}
      {...props}
    />
  );
}

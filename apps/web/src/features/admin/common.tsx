import type { Role } from '@devconnector/shared';
import { Badge, Group, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', admin: 'Admin', user: 'Member' };
const ROLE_COLOR: Record<Role, string> = { owner: 'grape', admin: 'blue', user: 'gray' };

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge color={ROLE_COLOR[role]} variant="light">
      {ROLE_LABEL[role]}
    </Badge>
  );
}

export function StatusBadge({ disabled }: { disabled: boolean }) {
  return disabled ? (
    <Badge color="red" variant="light">
      Disabled
    </Badge>
  ) : (
    <Badge color="green" variant="light">
      Active
    </Badge>
  );
}

/** Page header of the dev area: title on the left, actions on the right. */
export function Toolbar({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Group justify="space-between" align="center" mb="lg" wrap="wrap">
      <Title order={1} size="h2">
        {title}
      </Title>
      {children ? <Group>{children}</Group> : null}
    </Group>
  );
}

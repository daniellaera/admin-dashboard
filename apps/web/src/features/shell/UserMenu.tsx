import type { Me } from '@devconnector/shared';
import {
  Box,
  Group,
  Menu,
  Text,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconChevronDown,
  IconHome,
  IconLayoutDashboard,
  IconLogout,
  IconMessages,
  IconMoon,
  IconSun,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { UserAvatar } from '@/components/UserAvatar.tsx';
import { useLogout } from '@/features/auth/api.ts';
import { toast } from '@/lib/notify.ts';

const ROLE_LABEL: Record<Me['role'], string> = { owner: 'Owner', admin: 'Admin', user: 'Member' };

/** Avatar + name menu of the navbars (profile, dev area, public pages, theme, logout). */
export function UserMenu({ me }: { me: Me }) {
  const logout = useLogout();
  const navigate = useNavigate();
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');

  const signOut = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.info('Signed out');
        void navigate({ to: '/' });
      },
      onError: (error) => {
        toast.error(error);
      },
    });
  };

  return (
    <Menu position="bottom-end" width={220} shadow="md">
      <Menu.Target>
        <UnstyledButton aria-label="Account menu" style={{ borderRadius: 999 }}>
          <Group gap="xs" wrap="nowrap">
            <UserAvatar card={me.profile} size="sm" />
            <Box visibleFrom="md">
              <Text size="sm" fw={500} lh={1.2}>
                {me.profile.displayName}
              </Text>
              <Text size="xs" c="dimmed" lh={1.2}>
                {ROLE_LABEL[me.role]}
              </Text>
            </Box>
            <IconChevronDown size={16} aria-hidden />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item component={Link} to="/admin/profile" leftSection={<IconUser size={16} />}>
          Profile
        </Menu.Item>
        <Menu.Item component={Link} to="/admin" leftSection={<IconLayoutDashboard size={16} />}>
          Dashboard
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item component={Link} to="/" leftSection={<IconHome size={16} />}>
          Home
        </Menu.Item>
        <Menu.Item component={Link} to="/posts" leftSection={<IconMessages size={16} />}>
          Posts
        </Menu.Item>
        <Menu.Item component={Link} to="/developers" leftSection={<IconUsers size={16} />}>
          Developers
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          closeMenuOnClick={false}
          leftSection={scheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
          onClick={() => {
            setColorScheme(scheme === 'dark' ? 'light' : 'dark');
          }}
        >
          Toggle theme
        </Menu.Item>
        <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={signOut}>
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

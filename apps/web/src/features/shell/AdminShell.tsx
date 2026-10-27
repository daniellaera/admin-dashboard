import {
  Anchor,
  AppShell,
  Burger,
  Container,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowLeft,
  IconBell,
  IconBook2,
  IconClipboardList,
  IconLayoutDashboard,
  IconMailForward,
  IconMessageCircle,
  IconSettings,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { Link, Outlet, useRouteContext, useRouterState } from '@tanstack/react-router';
import { isStaff } from '@/lib/guards.ts';
import { useLiveEvents } from '@/lib/sse.ts';
import { NotificationBell } from './NotificationBell.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { UserMenu } from './UserMenu.tsx';
import { UserSearch } from './UserSearch.tsx';

const USER_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: IconLayoutDashboard, exact: true },
  { to: '/admin/profile', label: 'Profile', icon: IconUser },
  { to: '/admin/posts', label: 'Posts', icon: IconMessageCircle },
  { to: '/admin/notifications', label: 'Notifications', icon: IconBell },
] as const;

const STAFF_LINKS = [
  { to: '/admin/users', label: 'Users', icon: IconUsers },
  { to: '/admin/invitations', label: 'Invitations', icon: IconMailForward },
  { to: '/admin/catalog', label: 'Catalog', icon: IconBook2 },
  { to: '/admin/audit', label: 'Audit log', icon: IconClipboardList },
  { to: '/admin/settings', label: 'Settings', icon: IconSettings },
] as const;

/** The dev area shell: sidebar (drawer on mobile), header with bell, theme and account menu. */
export function AdminShell() {
  const { me } = useRouteContext({ from: '/admin' });
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useLiveEvents();

  const staff = isStaff(me);
  const links = staff ? [...USER_LINKS, ...STAFF_LINKS] : [...USER_LINKS];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'md', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="md"
              size="sm"
              aria-label="Toggle navigation"
            />
            <Anchor component={Link} to="/" fw={700} c="inherit" underline="never">
              DevConnector 🚀
            </Anchor>
          </Group>
          <Group gap="xs" wrap="nowrap">
            {staff && <UserSearch />}
            <ThemeToggle />
            <NotificationBell />
            <UserMenu me={me} />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" component="nav" aria-label="Dev area">
        <AppShell.Section>
          <NavLink
            component={Link}
            to="/"
            label="Home page"
            leftSection={<IconArrowLeft size={16} />}
            onClick={close}
          />
          <Divider my="xs" />
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              component={Link}
              to={l.to}
              label={l.label}
              leftSection={<l.icon size={18} />}
              active={'exact' in l ? pathname === l.to : pathname.startsWith(l.to)}
              onClick={close}
            />
          ))}
        </AppShell.Section>
        <AppShell.Section>
          <Divider my="xs" />
          <Text size="xs" c="dimmed" px="sm">
            Signed in as {me.profile.displayName}
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl" px={{ base: 0, sm: 'md' }}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

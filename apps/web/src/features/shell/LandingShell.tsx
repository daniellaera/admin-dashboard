import {
  Anchor,
  Box,
  Burger,
  Button,
  CloseButton,
  Container,
  Divider,
  Drawer,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { IconInfoCircle } from '@tabler/icons-react';
import { Link, Outlet, useRouteContext } from '@tanstack/react-router';
import { AnchorLink, ButtonLink } from '@/components/links.tsx';
import { useLiveEvents } from '@/lib/sse.ts';
import { NotificationBell } from './NotificationBell.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { UserMenu } from './UserMenu.tsx';

const REPO_URL = 'https://github.com/daniellaera/admin-dashboard';

const NAV_LINKS = [
  { to: '/posts', label: 'Posts' },
  { to: '/developers', label: 'Developers' },
] as const;

export function LandingShell() {
  const { me } = useRouteContext({ from: '__root__' });
  useLiveEvents();
  return (
    <>
      <PromoBanner />
      <Nav />
      <Box component="main" pt={72} mih="70vh">
        <Outlet />
      </Box>
      <Footer />
      <CookieBanner />
      {me ? null : null}
    </>
  );
}

function Nav() {
  const { me } = useRouteContext({ from: '__root__' });
  const [opened, { toggle, close }] = useDisclosure(false);
  return (
    <Box
      component="header"
      pos="fixed"
      top={0}
      left={0}
      w="100%"
      style={{
        zIndex: 200,
        borderBottom: '1px solid var(--mantine-color-default-border)',
        background: 'var(--mantine-color-body)',
      }}
    >
      <Container size="xl" h={60}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="xl" wrap="nowrap">
            <Anchor component={Link} to="/" fw={700} c="inherit" underline="never">
              DevConnector 🚀
            </Anchor>
            <Group gap="lg" visibleFrom="md" component="nav" aria-label="Main">
              {NAV_LINKS.map((l) => (
                <Anchor key={l.to} component={Link} to={l.to} c="inherit" underline="hover">
                  {l.label}
                </Anchor>
              ))}
            </Group>
          </Group>
          <Group gap="sm" wrap="nowrap">
            {me ? (
              <>
                <NotificationBell />
                <UserMenu me={me} />
              </>
            ) : (
              <Group gap="sm" visibleFrom="md">
                <Button component={Link} to="/signin" variant="subtle" color="gray">
                  Login
                </Button>
                <ButtonLink to="/signin" search={{ mode: 'register' }}>
                  Register
                </ButtonLink>
                <ThemeToggle />
              </Group>
            )}
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="md"
              aria-label="Open navigation"
              size="sm"
            />
          </Group>
        </Group>
      </Container>
      <Drawer opened={opened} onClose={close} position="right" title="Menu" size="xs">
        <Stack>
          <Anchor component={Link} to="/" onClick={close}>
            Home
          </Anchor>
          {NAV_LINKS.map((l) => (
            <Anchor key={l.to} component={Link} to={l.to} onClick={close}>
              {l.label}
            </Anchor>
          ))}
          <Divider />
          {me ? (
            <>
              <Anchor component={Link} to="/admin" onClick={close}>
                Dashboard
              </Anchor>
              <Anchor component={Link} to="/admin/profile" onClick={close}>
                Profile
              </Anchor>
            </>
          ) : (
            <>
              <Anchor component={Link} to="/signin" onClick={close}>
                Login
              </Anchor>
              <AnchorLink to="/signin" search={{ mode: 'register' }} onClick={close} fw={600}>
                Register
              </AnchorLink>
            </>
          )}
          <Group>
            <ThemeToggle />
            <Text size="sm" c="dimmed">
              Toggle theme
            </Text>
          </Group>
        </Stack>
      </Drawer>
    </Box>
  );
}

function PromoBanner() {
  const [dismissed, setDismissed] = useLocalStorage({
    key: 'promo-dismissed',
    defaultValue: false,
  });
  if (dismissed) return null;
  return (
    <Box
      pos="fixed"
      top={60}
      left={0}
      w="100%"
      style={{
        zIndex: 190,
        background:
          'linear-gradient(90deg, var(--mantine-color-blue-6), var(--mantine-color-teal-6))',
      }}
      c="white"
      py={6}
    >
      <Container size="xl">
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" fw={500}>
            We just launched our new, fully self-hosted version. 🎉
          </Text>
          <CloseButton
            aria-label="Dismiss announcement"
            c="white"
            onClick={() => {
              setDismissed(true);
            }}
          />
        </Group>
      </Container>
    </Box>
  );
}

function Footer() {
  return (
    <Box
      component="footer"
      mt={80}
      py="xl"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <Container size="lg">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
          <Text c="dimmed" size="sm">
            Admin dashboard built with React &amp; Mantine.
          </Text>
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Resources
            </Text>
            <Anchor component={Link} to="/admin" size="sm">
              Live preview
            </Anchor>
            <Anchor href={`${REPO_URL}#readme`} target="_blank" rel="noopener noreferrer" size="sm">
              Documentation
            </Anchor>
            <Anchor href={REPO_URL} target="_blank" rel="noopener noreferrer" size="sm">
              GitHub
            </Anchor>
          </Stack>
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Legal
            </Text>
            <Anchor component={Link} to="/terms" size="sm">
              Terms
            </Anchor>
            <Anchor component={Link} to="/privacy" size="sm">
              Privacy
            </Anchor>
            <Anchor
              href={`${REPO_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
            >
              Licence (MIT)
            </Anchor>
          </Stack>
        </SimpleGrid>
        <Divider my="lg" />
        <Text ta="center" size="sm" c="dimmed">
          © {new Date().getFullYear()} DevConnector. All rights reserved.
        </Text>
      </Container>
    </Box>
  );
}

function CookieBanner() {
  const [accepted, setAccepted] = useLocalStorage({ key: 'cookies-consent', defaultValue: false });
  if (accepted) return null;
  return (
    <Paper
      shadow="lg"
      radius="md"
      p="md"
      withBorder
      pos="fixed"
      bottom={16}
      right={16}
      maw={520}
      style={{ zIndex: 300 }}
      role="region"
      aria-label="Cookie notice"
    >
      <Group align="flex-start" wrap="nowrap">
        <IconInfoCircle size={24} aria-hidden />
        <Text size="sm">
          This site uses a single first-party cookie to keep you signed in. No tracking, no third
          parties.{' '}
          <Anchor component={Link} to="/privacy" fw={600}>
            Read our Privacy Policy.
          </Anchor>
        </Text>
        <Button
          size="xs"
          onClick={() => {
            setAccepted(true);
          }}
        >
          I agree
        </Button>
      </Group>
    </Paper>
  );
}

import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';

export function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');
  const next = scheme === 'dark' ? 'light' : 'dark';
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="lg"
      aria-label={`Switch to ${next} mode`}
      onClick={() => {
        setColorScheme(next);
      }}
    >
      {scheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
    </ActionIcon>
  );
}

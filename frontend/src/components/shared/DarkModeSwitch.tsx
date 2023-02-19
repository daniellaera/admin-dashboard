import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { IconButton, IconButtonProps, useColorMode } from "@chakra-ui/react";

type DarkModeSwitchProps = Omit<
  IconButtonProps,
  "aria-label" | "icon" | "onClick"
>;

function DarkModeSwitch({ ...rest }: DarkModeSwitchProps) {
  const { colorMode, toggleColorMode } = useColorMode();
  const Icon = colorMode === "light" ? MoonIcon : SunIcon;

  return (
    <IconButton
      {...rest}
      aria-label="Dark mode"
      icon={<Icon color="muted" />}
      onClick={toggleColorMode}
      variant="ghost"
    />
  );
}

export { DarkModeSwitch };

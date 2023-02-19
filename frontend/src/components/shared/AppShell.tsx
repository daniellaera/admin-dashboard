import { HamburgerIcon } from "@chakra-ui/icons";
import {
  Box,
  BoxProps,
  Container,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  IconButton,
  Spacer,
  useBreakpointValue,
  useColorModeValue,
  useDisclosure
} from "@chakra-ui/react";
import { ReactNode, useMemo } from "react";
import { createCtx } from "../../utils/contextUtils";
import { Navbar } from "./Navbar";

interface AppShellContextValue {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

const sidebarWidth = 280;

const [useAppShell, AppShellProvider] = createCtx<AppShellContextValue>();

type AppShellContentProps = BoxProps & {
  children: ReactNode;
};

function AppShellContent({ children, ...rest }: AppShellContentProps) {
  const bg = useColorModeValue("gray.100", "gray.900");
  const { isMobile } = useAppShell();
  return (
    <Box bg={bg} minHeight="100vh" ml={isMobile ? 0 : sidebarWidth} {...rest}>
      {children}
    </Box>
  );
}

type AppShellContentBodyProps = {
  children: ReactNode;
};

function AppShellContentBody({ children }: AppShellContentBodyProps) {
  return (
    <Container maxW="7xl" px={{ base: "4", sm: "8" }} py="8">
      {children}
    </Container>
  );
}

type AppShellContentHeaderProps = {
  children: ReactNode;
};

function AppShellContentHeader({ children }: AppShellContentHeaderProps) {
  const { isMobile, onOpen } = useAppShell();
  const bg = useColorModeValue("gray.100", "gray.900");
  return (
    <Navbar bg={bg}>
      {isMobile && (
        <IconButton
          aria-label="Open menu"
          icon={<HamburgerIcon />}
          ml="-2"
          onClick={onOpen}
          variant="ghost"
        />
      )}
      <Spacer />
      {children}
    </Navbar>
  );
}

type AppShellSidebarHeaderProps = BoxProps & {
  children: ReactNode;
};

function AppShellSidebarHeader({
  children,
  ...rest
}: AppShellSidebarHeaderProps) {
  const { isMobile } = useAppShell();
  return isMobile ? (
    <DrawerHeader {...rest}>{children}</DrawerHeader>
  ) : (
    <Box as="header" py={4} px={6} {...rest}>
      {children}
    </Box>
  );
}

type AppShellSidebarBodyProps = BoxProps & {
  children: ReactNode;
};

function AppShellSidebarBody({ children, ...rest }: AppShellSidebarBodyProps) {
  const { isMobile } = useAppShell();
  return isMobile ? (
    <DrawerBody {...rest}>{children}</DrawerBody>
  ) : (
    <Box flexGrow={1} py={2} px={6} {...rest}>
      {children}
    </Box>
  );
}

type AppShellSidebarFooterProps = BoxProps & {
  children: ReactNode;
};

function AppShellSidebarFooter({
  children,
  ...rest
}: AppShellSidebarFooterProps) {
  const { isMobile } = useAppShell();
  return isMobile ? (
    <DrawerFooter display="block" {...rest}>
      {children}
    </DrawerFooter>
  ) : (
    <Box as="footer" py={4} px={6} {...rest}>
      {children}
    </Box>
  );
}

type AppShellSidebarProps = {
  children: ReactNode;
};

function AppShellSidebar({ children }: AppShellSidebarProps) {
  const shadow = useColorModeValue("sm", "dark-sm");
  const { isMobile, isOpen, onClose } = useAppShell();

  return isMobile ? (
    <Drawer isOpen={isOpen!} placement="left" onClose={onClose!}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        {children}
      </DrawerContent>
    </Drawer>
  ) : (
    <Flex
      direction="column"
      height="100vh"
      left={0}
      overflowY="auto"
      position="fixed"
      top={0}
      shadow={shadow}
      width={sidebarWidth}
    >
      {children}
    </Flex>
  );
}

type AppShellProps = {
  children: ReactNode;
};

function AppShell({ children }: AppShellProps) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { isOpen, onOpen, onClose } = useDisclosure();

  const value = useMemo(
    () => ({
      isMobile,
      isOpen,
      onClose,
      onOpen
    }),
    [isMobile, isOpen, onClose, onOpen]
  );

  return <AppShellProvider value={value}>{children}</AppShellProvider>;
}

export {
  AppShell,
  AppShellContent,
  AppShellContentBody,
  AppShellContentHeader,
  AppShellSidebar,
  AppShellSidebarBody,
  AppShellSidebarFooter,
  AppShellSidebarHeader
};

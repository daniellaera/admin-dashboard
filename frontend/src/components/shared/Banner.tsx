import {
    Box,
    BoxProps,
    CloseButton,
    Square,
    SquareProps,
    Stack,
    StackProps,
    useColorModeValue
  } from "@chakra-ui/react";
  
  type BannerProps = BoxProps & {
    closable?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
  };
  
  function Banner({ children, closable, onClose, ...rest }: BannerProps) {
    const bg = useColorModeValue("white", "gray.700");
    return (
      <Box
        bg={bg}
        boxShadow="lg"
        position="relative"
        px="4"
        py="3"
        w="100%"
        {...rest}
      >
        {closable && (
          <CloseButton onClick={onClose} position="absolute" right="2" top="2" />
        )}
        <Stack
          direction={{ base: "column", sm: "row" }}
          align="center"
          justify="space-between"
          pr={closable ? "8" : "0"}
          spacing="4"
        >
          {children}
        </Stack>
      </Box>
    );
  }
  
  type BannerActionsProps = StackProps;
  
  function BannerActions({ ...rest }: BannerActionsProps) {
    return (
      <Stack direction={{ base: "column", md: "row" }} spacing="2" {...rest} />
    );
  }
  
  type BannerAvatarProps = SquareProps;
  
  function BannerAvatar({ ...rest }: BannerAvatarProps) {
    const bg = useColorModeValue("gray.200", "whiteAlpha.200");
    return (
      <Square
        alignItems="center"
        bg={bg}
        borderRadius="md"
        d="flex"
        justify="center"
        size="12"
        {...rest}
      />
    );
  }
  
  type BannerBodyProps = StackProps;
  
  function BannerBody({ ...rest }: BannerBodyProps) {
    return (
      <Stack
        spacing="4"
        direction={{ base: "column", md: "row" }}
        align={{ base: "start", md: "center" }}
        fontSize="sm"
        {...rest}
      />
    );
  }
  
  export { Banner, BannerActions, BannerAvatar, BannerBody };
  
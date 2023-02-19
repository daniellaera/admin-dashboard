import { WarningIcon } from "@chakra-ui/icons";
import { Stack, StackProps, Text } from "@chakra-ui/react";

type EmptyProps = StackProps & {
  message: string;
};

function Empty({ message, ...rest }: EmptyProps) {
  return (
    <Stack
      align="center"
      justify="center"
      spacing="4"
      textAlign="center"
      py="12"
      {...rest}
    >
      <WarningIcon boxSize="32px" />
      <Text>{message}</Text>
    </Stack>
  );
}

export { Empty };

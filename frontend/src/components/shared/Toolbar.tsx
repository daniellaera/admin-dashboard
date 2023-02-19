import { Heading, Stack } from "@chakra-ui/react";
import { ReactNode } from "react";

type ToolbarProps = {
  children: ReactNode;
};

function Toolbar({ children }: ToolbarProps) {
  return (
    <Stack direction={{ base: "column", sm: "row" }} justify="space-between">
      {children}
    </Stack>
  );
}

type ToolbarActionsProps = {
  children: ReactNode;
};

function ToolbarActions({ children }: ToolbarActionsProps) {
  return (
    <Stack direction={{ base: "column", sm: "row" }} spacing={4}>
      {children}
    </Stack>
  );
}

type ToolbarTitleProps = {
  children: ReactNode;
};

function ToolbarTitle({ children }: ToolbarTitleProps) {
  return (
    <Heading as="h2" size="lg">
      {children}
    </Heading>
  );
}

export { Toolbar, ToolbarActions, ToolbarTitle };

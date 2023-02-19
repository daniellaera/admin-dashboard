import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Box,
  Container,
  Divider,
  Link,
  SimpleGrid,
  Stack,
  Text
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { Brand } from "./Brand";

const columns = [
  {
    label: "Resources",
    links: [
      { label: "Live preview", to: "/admin" },
      { label: "Documentation", to: "/" },
      { label: "Github", isExternal: true, to: "https://github.com/" }
    ]
  },
  {
    label: "Legal",
    links: [
      { label: "Terms", to: "/terms" },
      { label: "Privacy", to: "/privacy" },
      { label: "Licence", to: "/license" }
    ]
  }
];

function Footer() {
  return (
    <Box as="footer" pt="10" style={{ marginTop: '10vh'}}>
      <Divider />
      <Container maxWidth="5xl">
        <Stack
          direction={{ base: "column", lg: "row" }}
          justify="space-between"
          py={{ base: "12", sm: "16" }}
          spacing="8"
        >
          <Stack spacing="8">
            <Brand />
            <Text color="muted" maxWidth="xs">
              Admin dashboard built with React & ChakraUI
            </Text>
          </Stack>
          <SimpleGrid columns={{ base: 2 }} gap={{ base: "5", sm: "8" }}>
            {columns.map((column) => (
              <Stack key={column.label} minW="36" spacing="4">
                <Text color="muted" fontSize="sm" fontWeight="semibold">
                  {column.label}
                </Text>
                <Stack spacing="3" shouldWrapChildren>
                  {column.links.map((link) =>
                    link.isExternal ? (
                      <Link href={link.to} isExternal key={link.label}>
                        {link.label} <ExternalLinkIcon mx="2px" />
                      </Link>
                    ) : (
                      <Link as={RouterLink} key={link.label} to={link.to}>
                        {link.label}
                      </Link>
                    )
                  )}
                </Stack>
              </Stack>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
      <Divider />
      <Box pt="8" pb="12" textAlign="center">
        <Text color="muted">
          © 2023 DevConnector. All rights reserved.
        </Text>
      </Box>
    </Box>
  );
}

export { Footer };

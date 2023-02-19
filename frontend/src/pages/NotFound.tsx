import { Button, Container, Stack, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { NotFoundImage } from "../components/illustrations/NotFoundImage";
import { Page } from "../components/shared/Page";

export default function NotFound() {
  return (
    <Page>
      <Container maxW="lg" py="16">
        <Stack align="center" spacing="6">
          <NotFoundImage />
          <Stack spacing="3" textAlign="center">
            <Text fontSize="2xl" fontWeight="extrabold">
              Oops
            </Text>
            <Text color="muted">
              Sorry, we couldn’t find the page you’re looking for.
            </Text>
          </Stack>
          <Button as={Link} to="/">
            Back to home
          </Button>
        </Stack>
      </Container>
    </Page>
  );
}

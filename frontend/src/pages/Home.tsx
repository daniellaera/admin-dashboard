import { CheckIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Page } from "../components/shared/Page";
import {
  Section,
  SectionBody,
  SectionHeadings,
  SectionTag,
  SectionTitle
} from "../components/shared/Section";

const features = [
  "React",
  "Supabase",
  "Realtime with SocketIO",
  "Notification Provider with Novu",
  "Containerized with Docker",
  "Styled with ChakraUI",
  "Written in TypeScript",
  "Create React App (CRA) as toolchain",
  "Data fetching with React Query",
  "Form handled by React Hook Form",
  "Code hosted on Github",
  "CI/CD with Github actions",
  "Deployed on Fly.io",
  "100% Responsive",
  "Dark/Light mode support",
  "Theming",
  "Best Practice",
  "Clean code"
];

export default function Home() {
  return (
    <Page>
      <Section>
        <Box textAlign="center">
          <Heading
            letterSpacing="tighter"
            maxWidth="2xl"
            mx="auto"
            fontWeight="extrabold"
            size="4xl"
          >
            <Text
              bgGradient='linear(to-l, #2193b0, #6dd5ed)'
              bgClip='text'
              fontWeight='extrabold'
            >
              Dev Connector
            </Text>{" "}
            dashboard
          </Heading>
          <Text color="muted" fontSize="xl" maxWidth="xl" mx="auto" mt="6">
            Connecting with Developers has never been so easy!
          </Text>
          <Stack
            direction={{ base: "column", sm: "row" }}
            justify="center"
            mt="10"
            spacing={4}
          >
            <Button as={Link} size="lg" to="/developers">
              Developers
            </Button>
            <Button as={Link} colorScheme="blue" size="lg" to="/admin">
              Dashboard
            </Button>
          </Stack>
        </Box>
        <SectionHeadings>
          <SectionTag>Technologies</SectionTag>
          <SectionTitle>Built with</SectionTitle>
        </SectionHeadings>
        <SectionBody>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: "5", md: "8" }}>
            {features.map((feature, index) => (
              <Flex key={index} align="center">
                <CheckIcon color={'green.400'} mr="3" />
                <Text color="muted">{feature}</Text>
              </Flex>
            ))}
          </SimpleGrid>
        </SectionBody>
      </Section>
    </Page>
  );
}

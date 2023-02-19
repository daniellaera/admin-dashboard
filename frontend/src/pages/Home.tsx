import { CheckCircleIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  Image,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  useColorModeValue
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
  "Built with React and Firebase",
  "Styled with ChakraUI",
  "Written in TypeScript",
  "Create React App (CRA) as toolchain",
  "Data fetching with React Query",
  "Form handled by React Hook Form",
  "Unit tests with Jest",
  "E2E tests with Playwright",
  "",
  "Code hosted on Github",
  "CI/CD with Github actions",
  "Deployed on Cloudflare",
  "100% Responsive",
  "Dark mode support",
  "Theming",
  "Best Practice",
  "Clean code",
  "Documention made with Docusaurus"
];

export default function Home() {
  const src = useColorModeValue("/img/hero-light.png", "/img/hero-dark.png");

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
            Connect with other Developers and start sharing stuff with them
          </Text>
          <Stack
            direction={{ base: "column", sm: "row" }}
            justify="center"
            mt="10"
            spacing={4}
          >
            <Button as={Link} size="lg" to="/admin">
              Documentation
            </Button>
            <Button as={Link} colorScheme="blue" size="lg" to="/admin">
              Live preview
            </Button>
          </Stack>
          <Box pos="relative" mt="20">
            <Image
              alt="Hero"
              src={src}
              borderColor="border"
              borderRadius="lg"
              borderStyle="solid"
              borderWidth={1}
              fallback={<Skeleton h={576} />}
              w="full"
            />
            <Box
              pos="absolute"
              bottom={0}
              left={0}
              right={0}
              h="25%"
              bgGradient="linear(to-b, transparent, surface)"
            />
          </Box>
        </Box>
      </Section>

      <Section>
        <SectionHeadings>
          <SectionTag>Features</SectionTag>
          <SectionTitle>What is included</SectionTitle>
        </SectionHeadings>
        <SectionBody>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: "5", md: "8" }}>
            {features.map((feature, index) => (
              <Flex key={index} align="center">
                <CheckCircleIcon color="blue.200" mr="3" />
                <Text color="muted">{feature}</Text>
              </Flex>
            ))}
          </SimpleGrid>
        </SectionBody>
      </Section>

      <Section>
        <Card py="8" variant="outline">
          <CardBody>
            <Stack spacing="8">
              <Stack spacing="4">
                <Heading fontSize="2xl">Ship your next project faster</Heading>
                <Text color="muted" fontSize="lg">
                  With this beautiful and responsive React components you will
                  realize your next project in no time.
                </Text>
              </Stack>
              <Stack direction={{ base: "column", sm: "row" }} spacing="3">
                <Button size="lg">Read more</Button>
                <Button as={Link} colorScheme="blue" size="lg" to="/admin">
                  Live preview
                </Button>
              </Stack>
            </Stack>
          </CardBody>
        </Card>
      </Section>
    </Page>
  );
}

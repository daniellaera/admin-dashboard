import {
    Heading,
    ListItem,
    Stack,
    Text,
    UnorderedList
  } from "@chakra-ui/react";
  import { Page } from "../components/shared/Page";
  import {
    Section,
    SectionBody,
    SectionDescription,
    SectionHeader,
    SectionHeadings,
    SectionTag,
    SectionTitle
  } from "../components/shared/Section";
  
  export default function Privacy() {
    return (
      <Page>
        <Section variant="prose">
          <SectionHeader>
            <SectionHeadings>
              <SectionTag>Updated on Apr 12, 2022</SectionTag>
              <SectionTitle>Privacy Policy</SectionTitle>
            </SectionHeadings>
            <SectionDescription>
              The protection of your personal data is important for us. This is
              the reason we explain, in this document, what we collect and what
              may happen when using this website and related resources.
            </SectionDescription>
          </SectionHeader>
          <SectionBody>
            <Stack spacing="12">
              <Stack as="section" spacing="4">
                <Heading as="h2" fontSize="3xl">
                  What we collect
                </Heading>
                <Heading as="h3" fontSize="md">
                  Creation of an account
                </Heading>
                <Text color="muted">
                  To access our services, you might have to create an account.
                  When you create an account, we collect your email address and
                  password.
                </Text>
                <Heading as="h3" fontSize="md">
                  Analytics
                </Heading>
                <Text color="muted">
                  We may use Google Analytics. It is a web analysis service
                  provided by Google. Google uses the Data collected to track and
                  examine the use of the Services, to prepare reports on its
                  activities, and share them with other Google services. Google
                  may use the Data collected to contextualize and personalize the
                  ads of its own advertising network.
                </Text>
                <Heading as="h3" fontSize="md">
                  Social Media
                </Heading>
                <Text color="muted">
                  We may enable you to integrate certain Social Media features,
                  widgets, and single sign on features, such as “Facebook
                  Connect,” or “Google Sign-in”. These Social Media Features may
                  collect certain Personal Information from your Users-of-Users
                  such as identifiers, including name, alias, unique personal
                  identifier, online identifier, internet protocol address, email
                  address, or other similar identifiers.
                </Text>
              </Stack>
              <Stack as="section" spacing="4">
                <Heading as="h2" fontSize="3xl">
                  Purpose
                </Heading>
                <Text as="div" color="muted">
                  <UnorderedList>
                    <ListItem>To create an account.</ListItem>
                    <ListItem>
                      To ensure quality and improve our services.
                    </ListItem>
                    <ListItem>To fix problems with our services.</ListItem>
                    <ListItem>To monitor and analyze web traffic.</ListItem>
                  </UnorderedList>
                </Text>
              </Stack>
              <Stack as="section" spacing="4">
                <Heading as="h2" fontSize="3xl">
                  Changes
                </Heading>
                <Text color="muted">
                  If we change our Privacy Policy we will post those changes on
                  this page.
                </Text>
              </Stack>
              <Stack as="section" spacing="4">
                <Heading as="h2" fontSize="3xl">
                  Contact us
                </Heading>
                <Text color="muted">
                  If you have any questions or suggestions regarding this Privacy
                  Policy, please contact us at ...
                </Text>
              </Stack>
            </Stack>
          </SectionBody>
        </Section>
      </Page>
    );
  }
  
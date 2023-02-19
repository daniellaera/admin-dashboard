import { Heading, Stack, Text } from "@chakra-ui/react";
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

export default function Terms() {
  return (
    <Page>
      <Section variant="prose">
        <SectionHeader>
          <SectionHeadings>
            <SectionTag>Updated on Apr 12, 2022</SectionTag>
            <SectionTitle>Terms of Service</SectionTitle>
          </SectionHeadings>
          <SectionDescription>
            By using the site, you agree to these terms of service; If you do
            not agree, do not use the site.
          </SectionDescription>
        </SectionHeader>
        <SectionBody>
          <Stack spacing="12">
            <Stack as="section" spacing="4">
              <Heading as="h2" fontSize="3xl">
                General
              </Heading>
              <Text color="muted">
                By accessing the site, you confirm that you are in agreement
                with and bound by the terms and conditions contained in the
                Terms Of Use outlined below. These terms apply to the entire
                website and any email or other type of communication.
              </Text>
              <Text color="muted">
                Under no circumstances shall the site be liable for any direct,
                indirect, special, incidental or consequential damages,
                including, but not limited to, loss of data or profit, arising
                out of the use, or the inability to use, the materials on this
                site.
              </Text>
            </Stack>
            <Stack as="section" spacing="4">
              <Heading as="h2" fontSize="3xl">
                Changes
              </Heading>
              <Text color="muted">
                If we change our terms of use we will post those changes on this
                page.
              </Text>
            </Stack>
            <Stack as="section" spacing="4">
              <Heading as="h2" fontSize="3xl">
                Contact us
              </Heading>
              <Text color="muted">
                If you have any questions or suggestions regarding this Terms,
                please contact us at ...
              </Text>
            </Stack>
          </Stack>
        </SectionBody>
      </Section>
    </Page>
  );
}

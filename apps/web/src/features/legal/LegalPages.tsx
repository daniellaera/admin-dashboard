import { Container, List, Stack, Text, Title } from '@mantine/core';
import { usePageTitle } from '@/components/States.tsx';

const UPDATED = 'Updated on October 26, 2026';

function Prose({
  tag,
  title,
  intro,
  children,
}: {
  tag: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <Container size="sm" py={{ base: 'xl', md: 64 }}>
      <Stack gap="lg">
        <Stack gap={4}>
          <Text c="blue" fw={600} size="sm">
            {tag}
          </Text>
          <Title order={1}>{title}</Title>
          <Text c="dimmed" size="lg">
            {intro}
          </Text>
        </Stack>
        {children}
      </Stack>
    </Container>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <Title order={2} size="h3" mt="md">
    {children}
  </Title>
);

export function PrivacyPage() {
  usePageTitle('Privacy Policy');
  return (
    <Prose
      tag={UPDATED}
      title="Privacy Policy"
      intro="The protection of your personal data matters to us. This page explains what this self-hosted instance collects and why."
    >
      <H>What we collect</H>
      <Text fw={600}>Creation of an account</Text>
      <Text>
        Your e-mail address and a password (stored only as a one-way hash). If you sign in with
        GitHub, we store the identifier of your GitHub account and the verified e-mail address
        GitHub provides.
      </Text>
      <Text fw={600}>What you publish</Text>
      <Text>
        Your profile (username, website, company, bio, skills, avatar), your experiences and
        education, your posts, comments and likes. Your e-mail address is never shown to other
        members; your profile can be hidden from the public directory with the "Public" switch.
      </Text>
      <Text fw={600}>Technical data</Text>
      <Text>
        A single first-party session cookie keeps you signed in. Sessions record the IP address and
        browser they were created from so you can recognise them. Server logs keep request metadata
        without personal data. There is no advertising, no analytics and no third-party tracking.
      </Text>
      <H>Purpose</H>
      <List>
        <List.Item>To create and secure your account.</List.Item>
        <List.Item>To show your public profile and content to other members.</List.Item>
        <List.Item>
          To send transactional e-mails (confirmation, password reset, sign-in links, invitations)
          and the notification e-mails you opt into.
        </List.Item>
        <List.Item>To keep the service reliable and detect abuse.</List.Item>
      </List>
      <H>Your rights</H>
      <Text>
        You can edit everything from your profile page, export nothing but read everything, and
        delete your account at any time from the "Danger zone" — this removes your data immediately.
      </Text>
      <H>Changes</H>
      <Text>If we change this policy we will post the changes on this page.</Text>
      <H>Contact</H>
      <Text>
        Contact the administrator of this instance through the channel they gave you when inviting
        you or on the project's GitHub page.
      </Text>
    </Prose>
  );
}

export function TermsPage() {
  usePageTitle('Terms of Service');
  return (
    <Prose
      tag={UPDATED}
      title="Terms of Service"
      intro="By using the site you agree to these terms. If you do not agree, do not use the site."
    >
      <H>General</H>
      <Text>
        DevConnector is a community space for developers. You are responsible for what you publish:
        keep it lawful, respectful and yours. Administrators may remove content or disable accounts
        that break these terms.
      </Text>
      <Text>
        The service is provided as is, without warranty. The operator is not liable for any damages
        arising from its use, to the extent permitted by law.
      </Text>
      <H>Accounts</H>
      <Text>
        One account per person. Keep your password private; you are responsible for activity on your
        account. You may delete your account at any time.
      </Text>
      <H>Changes</H>
      <Text>If we change these terms we will post the changes on this page.</Text>
      <H>Contact</H>
      <Text>
        Contact the administrator of this instance or open an issue on the project's GitHub page.
      </Text>
    </Prose>
  );
}

import { Card, CardBody, CardHeader, Tab, TabList, TabPanel, TabPanels, Tabs, Text } from "@chakra-ui/react";
import { PasswordForm } from "../../components/auth/PasswordForm";
import { ProfileForm } from "../../components/auth/ProfileForm";
import ExperienceList from "../../components/profile/ExperienceList";
import { Page } from "../../components/shared/Page";
import { Toolbar, ToolbarTitle } from "../../components/shared/Toolbar";

export default function Profile() {
  return (
    <Page animation="slideFade">
      <Toolbar>
        <ToolbarTitle>Profile</ToolbarTitle>
      </Toolbar>
      <Card mt="8">
        <CardHeader>
          <Text>Profile details</Text>
        </CardHeader>
        <CardBody>
          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList>
              <Tab>Profile</Tab>
              <Tab>Password</Tab>
            </TabList>
            <TabPanels mt="10">
              <TabPanel p="0">
                <ProfileForm />
              </TabPanel>
              <TabPanel p="0">
                <PasswordForm />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
      <ExperienceList />
    </Page>
  );
}

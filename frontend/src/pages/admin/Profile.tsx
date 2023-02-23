import { Card, CardBody, CardHeader, Tab, TabList, TabPanel, TabPanels, Tabs, Text } from "@chakra-ui/react";
import DangerZone from "../../components/auth/DangerZone";
import { PasswordForm } from "../../components/auth/PasswordForm";
import { ProfileForm } from "../../components/auth/ProfileForm";
import EducationList from "../../components/profile/EducationList";
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
              <Tab _selected={{ color: 'white', bg: 'red.400' }}>Danger Zone</Tab>
            </TabList>
            <TabPanels mt="10">
              <TabPanel p="0">
                <ProfileForm />
              </TabPanel>
              <TabPanel p="0">
                <PasswordForm />
              </TabPanel>
              <TabPanel p="0">
                <DangerZone />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
      <ExperienceList />
      <EducationList />
    </Page>
  );
}

import {
    Box,
    Card,
    CardBody,
    CardHeader,
    Circle,
    CircularProgress,
    CircularProgressLabel,
    Flex,
    Progress,
    SimpleGrid,
    Stack,
    Stat,
    StatLabel,
    StatNumber,
    Text,
    useColorModeValue
  } from "@chakra-ui/react";
  import { formatDistanceToNow } from "date-fns";
  import { useMemo } from "react";

  import {
    List,
    ListItem,
    ListItemAvatar,
    ListItemExtra,
    ListItemText
  } from "../../components/shared/List";
  import { Loading } from "../../components/shared/Loading";
  import { Page } from "../../components/shared/Page";
  import { useUserStats } from "../../hooks/user/useUserStats";
  
  export default function Dashboard() {
    const { data, isLoading, isError } = useUserStats();
    const trackColor = useColorModeValue("gray.100", "whiteAlpha.300");
  
    const { count, countByRole, countByStatus, recentlyAdded, recentlyUpdated } =
      data || {};
  
    const getPercentage = (value?: number, total?: number) => {
      if (typeof value !== "number" || typeof total !== "number")
        return undefined;
      return (value / total) * 100;
    };
  
    const globalStats = useMemo(() => {
      return [
        { label: "Total Users", value: count },
        { label: "Active Users", value: countByStatus?.active },
        { label: "Disabled Users", value: countByStatus?.disabled }
      ];
    }, [count, countByStatus]);
  
    const roleStats = useMemo(() => {
      return [
        {
          label: "Member",
          percentage: getPercentage(countByRole?.member, count),
          value: countByRole?.member
        },
        {
          label: "Guest",
          percentage: getPercentage(countByRole?.guest, count),
          value: countByRole?.guest
        },
        {
          label: "Admin",
          percentage: getPercentage(countByRole?.admin, count),
          value: countByRole?.admin
        }
      ];
    }, [count, countByRole]);
  
    const statusLegends = [
      {
        color: "blue.200",
        label: "Active"
      },
      {
        color: trackColor,
        label: "Disabled"
      }
    ];
  
    const statusPercentage = useMemo(() => {
      return getPercentage(countByStatus?.active, count);
    }, [count, countByStatus]);
  
    if (isLoading) {
      return <Loading />;
    }
  
    if (isError) {
      return (
        <span>Something went wrong! If the problem persists, contact us!</span>
      );
    }
  
    if (!data) {
      return <span>Empty</span>;
    }
  
    return (
      <Page animation="slideFade">
        <SimpleGrid columns={{ base: 1, lg: 3 }} gap="6">
          {globalStats.map((stat) => (
            <Card key={stat.label}>
              <CardBody>
                <Stat>
                  <StatLabel color="muted">{stat.label}</StatLabel>
                  <StatNumber>{stat.value}</StatNumber>
                </Stat>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
  
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap="6" mt="6">
          <Card>
            <CardHeader>
              <Text>User Roles</Text>
            </CardHeader>
            <CardBody>
              <Stack spacing={6}>
                {roleStats.map((stat) => (
                  <Box key={stat.label}>
                    <Flex justify="space-between">
                      <Text color="muted">{stat.label}</Text>
                      <Text>{`${stat.value}/${data.count}`}</Text>
                    </Flex>
                    <Progress
                      colorScheme={'blue'}
                      mt={2}
                      value={stat.percentage}
                    />
                  </Box>
                ))}
              </Stack>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <Text>User Status</Text>
            </CardHeader>
            <CardBody>
              <Stack
                direction={{ base: "column", lg: "row" }}
                align="center"
                spacing="8"
              >
                <Box>
                  <CircularProgress
                    color='blue.200'
                    size="160px"
                    trackColor={trackColor}
                    value={statusPercentage}
                  >
                    <CircularProgressLabel>{`${statusPercentage?.toFixed(
                      1
                    )}%`}</CircularProgressLabel>
                  </CircularProgress>
                </Box>
                <Stack spacing="4">
                  {statusLegends.map((legend) => (
                    <Flex key={legend.label} align="center">
                      <Circle bg={legend.color} mr="3" size="16px" />
                      <Text color="muted">{legend.label}</Text>
                    </Flex>
                  ))}
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap="6" mt="6">
          <Card>
            <CardHeader>
              <Text>Recently Added</Text>
            </CardHeader>
            <CardBody>
              <List>
                {recentlyAdded?.map((user) => (
                  <ListItem key={user.id}>
                    <ListItemAvatar
                      colorScheme={'blue'}
                      name={`${user.firstName} ${user.lastName}`}
                    />
                    <ListItemText>
                      <Text>{`${user.firstName} ${user.lastName}`}</Text>
                      <Text color="muted" fontSize="xs">
                        {user.email}
                      </Text>
                    </ListItemText>
                    <ListItemExtra>
                      <Text fontSize="small">
                        {formatDistanceToNow(user.createdAt)}
                      </Text>
                    </ListItemExtra>
                  </ListItem>
                ))}
              </List>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <Text>Recently Updated</Text>
            </CardHeader>
            <CardBody>
              <List>
                {recentlyUpdated?.map((user) => (
                  <ListItem key={user.id}>
                    <ListItemAvatar name={`${user.firstName} ${user.lastName}`} />
                    <ListItemText>
                      <Text>{`${user.firstName} ${user.lastName}`}</Text>
                      <Text color="muted" fontSize="xs">
                        {user.email}
                      </Text>
                    </ListItemText>
                    <ListItemExtra>
                      <Text fontSize="small">
                        {formatDistanceToNow(user.lastModifiedAt)}
                      </Text>
                    </ListItemExtra>
                  </ListItem>
                ))}
              </List>
            </CardBody>
          </Card>
        </SimpleGrid>
      </Page>
    );
  }
  
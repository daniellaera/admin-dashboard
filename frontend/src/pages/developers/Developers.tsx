import {
    Heading,
    Box,
    Text,
    Stack,
    Button,
    useColorModeValue,
    Card,
    CardHeader,
    Flex,
    IconButton,
    CardBody,
    CardFooter,
    Container,
    SimpleGrid,
    Tag
} from '@chakra-ui/react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { Empty } from '../../components/shared/Empty';
import { Loading } from '../../components/shared/Loading';
import { Page } from '../../components/shared/Page';
import ProfileAvatar from '../../components/shared/ProfileAvatar';
import { Result } from '../../components/shared/Result';
import { useProfiles } from '../../hooks/auth/useProfiles';
import { Profile } from '../../types/profile';
import { truncate } from '../../utils/functions';

const Developers = () => {
    const { data, isError, isLoading } = useProfiles();

    const followColor = useColorModeValue('gray.400', 'gray.900');

    if (data?.length === 0) {
        return <Empty message="Developers will show up here!" />
    }

    if (isLoading) {
        return <Loading />;
    }

    if (isError) {
        return (
            <Result
                description="Something went wrong! If the problem persists, contact us!"
                status="error"
                title="Oops!"
            />
        );
    }

    return (
        <Page>
            <Container maxW={'7xl'} py={16} as={Stack} spacing={12}>
                <SimpleGrid spacing={4} templateColumns='repeat(auto-fill, minmax(300px, 1fr))'>
                    {data?.map(({ username, company, authorEmail, website, programmingLanguages, avatarUrl }: Profile, i: number) => (
                        <Box key={i}>
                            <Card>
                                <CardHeader>
                                    <Flex>
                                        <Flex flex="1" gap="4" alignItems="center" >
                                            <ProfileAvatar url={avatarUrl} avatarName={truncate(authorEmail)} />
                                            <Box>
                                                <Heading size="sm">
                                                    {username} - {authorEmail}
                                                </Heading>
                                                <Text>
                                                    {company} - {website}
                                                </Text>
                                            </Box>
                                        </Flex>
                                        <IconButton variant="ghost" colorScheme="gray" aria-label="See menu" icon={<BsThreeDotsVertical />} />
                                    </Flex>
                                </CardHeader>
                                <CardBody>
                                    <Text>
                                        With Chakra UI, I wanted to sync the speed of development with the speed of design. I wanted the
                                        developer to be just as excited as the designer to create a screen.
                                    </Text>
                                    {programmingLanguages?.map((value, index) => (
                                        <Tag margin={2} key={index}>
                                            {value.label}
                                        </Tag>
                                    ))}
                                </CardBody>

                                <CardFooter
                                    justify="space-between"
                                    flexWrap="wrap"
                                    sx={{
                                        '& > button': {
                                            minW: '136px'
                                        }
                                    }}>
                                    <Button
                                        w={'xl'}
                                        mt={8}
                                        bg={followColor}
                                        color={'white'}
                                        rounded={'md'}
                                        _hover={{
                                            transform: 'translateY(-2px)',
                                            boxShadow: 'lg'
                                        }}>
                                        Follow
                                    </Button>
                                </CardFooter>
                            </Card>
                        </Box>
                    ))}
                </SimpleGrid>
            </Container>
        </Page>
    );
};

export default Developers;

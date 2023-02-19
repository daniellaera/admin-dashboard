import { AddIcon } from "@chakra-ui/icons"
import { Button, Card, CardBody, CardHeader, Flex, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, useDisclosure, useToast } from "@chakra-ui/react"
import moment from "moment";
import { useEffect } from "react"
import { SubmitHandler, useForm } from "react-hook-form";
import { useProfile } from "../../hooks/auth/useProfile";
import { useAddExperience } from "../../hooks/profile/useAddExperience";
import { useExperiences } from "../../hooks/profile/useExperience";
import { useAuth } from "../../providers/AuthProvider";
import { Experience } from "../../types/experience";
import { Empty } from "../shared/Empty";
import { Loading } from "../shared/Loading";
import { Result } from "../shared/Result";
import AddModal from "./AddModal";

type FormValues = {
    title: string;
    description: string;
    company: string;
    location: string;
    from: Date
    to: Date;
    current: boolean
    profileId: number;
};

const ExperienceList = () => {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const toast = useToast();
    const addExperience = useAddExperience();
    const fields = ["title", "description", 'company', 'location'];
    const dateFields = ['from', 'to']
    let { session } = useAuth();
    const { data: profile } = useProfile(session?.user.email);
    const { data, isError, isLoading } = useExperiences(profile?.id);

    const {
        handleSubmit,
        register,
        setValue,
        formState,
        reset,
        formState: { errors }
    } = useForm<FormValues>();

    useEffect(() => {
        if (profile) setValue('profileId', profile.id)
    }, [profile, setValue]);

    const handleAddExperience: SubmitHandler<FormValues> = (experience) => {
        addExperience.mutate(experience as Experience, {
            onSuccess: () => {
                toast({
                    description: `experience has been added`,
                    status: "success"
                });
            },
            onError: () => {
                toast({
                    description:
                        "Something went wrong! If the problem persists, contact us!",
                    status: "error"
                });
            }
        })
        onClose();
        reset()
        // we re-assign profile id to the form
        if (profile) setValue('profileId', profile.id)
    };



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
        <>
            <AddModal
                isOpen={isOpen}
                submitHandler={handleSubmit(handleAddExperience)}
                onClose={onClose}
                //reset={reset}
                fields={fields}
                dateFields={dateFields}
                register={register}
                errors={errors}
                formState={formState}
            />
            <Card mt="8">
                <CardHeader>
                    <Flex>
                        <Flex flex='1' gap='4' alignItems='center' flexWrap='wrap'>
                            <Text>Experiences</Text>
                        </Flex>
                        <Flex >
                            <Button onClick={onOpen} leftIcon={<AddIcon />}>Add</Button>
                        </Flex>
                    </Flex>
                </CardHeader>
                <CardBody>
                    {data?.length === 0 ? <>
                        <Empty message="Experiences will show up here!" />
                    </> : <>
                        <TableContainer>
                            <Table variant='simple'>
                                <Thead>
                                    <Tr>
                                        <Th>Title</Th>
                                        <Th>Description</Th>
                                        <Th>Company</Th>
                                        <Th>Location</Th>
                                        <Th>From - To</Th>
                                        <Th>Current</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {data?.map((experience) => (
                                        <Tr key={experience.id}>
                                            <Td>{experience.title}</Td>
                                            <Td>{experience.description}</Td>
                                            <Td>{experience.company}</Td>
                                            <Td>{experience.location}</Td>
                                            <Td>{moment(experience.from).format('l') + '-' + moment(experience.to).format('l')}</Td>
                                            <Td>{experience.current ? '✅' : '❌'}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </>}

                </CardBody>
            </Card>
        </>
    )
}

export default ExperienceList
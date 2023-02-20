import { AddIcon } from "@chakra-ui/icons";
import { Button, Card, CardBody, CardHeader, Flex, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, useDisclosure, useToast } from "@chakra-ui/react";
import moment from "moment";
import { useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useProfile } from "../../hooks/auth/useProfile";
import { useAddEducation } from "../../hooks/profile/useAddEducation";
import { useEducations } from "../../hooks/profile/useEducation";
import { useAuth } from "../../providers/AuthProvider";
import { Education } from "../../types/education";
import { Empty } from "../shared/Empty";
import { Loading } from "../shared/Loading";
import { Result } from "../shared/Result";
import AddModal from "../shared/AddModal";

type FormValues = {
    school: string;
    description: string;
    degree: string;
    fieldOfStudy: string;
    from: Date
    to: Date;
    current: boolean
    profileId: number;
};

const EducationList = () => {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const toast = useToast();
    const addEducation = useAddEducation();
    let { session } = useAuth();
    const { data: profile } = useProfile(session?.user.email);
    const modalHeader = 'Add Education';
    const dateFields = ['from', 'to']
    const fields = ["school", "description", 'degree', 'fieldOfStudy'];
    const { data, isError, isLoading } = useEducations(profile?.id);

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

    const handleAddEducation: SubmitHandler<FormValues> = (education) => {
        addEducation.mutate(education as Education, {
            onSuccess: () => {
                toast({
                    description: `education has been added`,
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
                submitHandler={handleSubmit(handleAddEducation)}
                onClose={onClose}
                //reset={reset}
                fields={fields}
                dateFields={dateFields}
                modalHeader={modalHeader}
                register={register}
                errors={errors}
                formState={formState}
            />
            <Card mt="8">
                <CardHeader>
                    <Flex>
                        <Flex flex='1' gap='4' alignItems='center' flexWrap='wrap'>
                            <Text>Education</Text>
                        </Flex>
                        <Flex >
                            <Button onClick={onOpen} leftIcon={<AddIcon />}>Add</Button>
                        </Flex>
                    </Flex>
                </CardHeader>
                <CardBody>
                    {data?.length === 0 ? <>
                        <Empty message="Education will show up here!" />
                    </> : <>
                        <TableContainer>
                            <Table variant='simple'>
                                <Thead>
                                    <Tr>
                                        <Th>School</Th>
                                        <Th>Description</Th>
                                        <Th>Company</Th>
                                        <Th>Location</Th>
                                        <Th>From - To</Th>
                                        <Th>Current</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {data?.map((education) => (
                                        <Tr key={education.id}>
                                            <Td>{education.school}</Td>
                                            <Td>{education.description}</Td>
                                            <Td>{education.degree}</Td>
                                            <Td>{education.fieldOfStudy}</Td>
                                            <Td>{moment(education.from).format('l') + '-' + moment(education.to).format('l')}</Td>
                                            <Td>{education.current ? '✅' : '❌'}</Td>
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

export default EducationList
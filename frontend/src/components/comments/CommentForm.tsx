import { Button, Flex, FormErrorMessage, Input, Stack, useColorModeValue, useToast } from "@chakra-ui/react";
import { useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useProfile } from "../../hooks/auth/useProfile";
import { useAddComment } from "../../hooks/comments/useAddComment";
import { useAuth } from "../../providers/AuthProvider";
import { Comment } from "../../types/comment";
import { Post } from "../../types/post";
import { socket } from "../../utils/constants";

type FormValues = {
    text: string;
    profileId: number;
    postId: number;
};

type PostFormProps = {
    post?: Post;
};

const CommentForm = ({ post }: PostFormProps) => {
    const toast = useToast();
    const addComment = useAddComment()
    const isProcessing = addComment.isLoading
    let { session } = useAuth();
    const { data: profile } = useProfile(session?.user.email);

    const {
        handleSubmit,
        register,
        setValue,
        reset,
        formState: { errors, isValid }
    } = useForm<FormValues>();

    useEffect(() => {
        if (post) setValue('postId', post.id)
        if (profile) setValue('profileId', profile.id)
    }, [post, setValue, profile]);

    const handleAddComment: SubmitHandler<FormValues> = (comment) => {
        addComment.mutate(comment as Comment, {
            onSuccess: () => {
                reset()
                toast({
                    description: `${comment.text} has been added`,
                    status: "success"
                });
                socket.emit("addComment", { post, profile, comment });
            },
            onError: () => {
                toast({
                    description:
                        "Something went wrong! If the problem persists, contact us!",
                    status: "error"
                });
            }
        });
    };

    const onSubmit: SubmitHandler<FormValues> = (values) => {
        handleAddComment(values)
    };

    return (
        <Flex as={'form'} py={6} onSubmit={handleSubmit(onSubmit)}>
            <Stack
                w={600}
                rounded={'xl'}
                spacing={2}
                align={'center'}
            >
                <Stack spacing={4} direction={{ base: 'column', md: 'row' }} w={'full'}>
                    <Input
                        id="text"
                        placeholder="write your comment here"
                        {...register("text", {
                            required: "This is required"
                        })}
                        color={useColorModeValue('gray.800', 'gray.200')}
                        bg={useColorModeValue('gray.100', 'gray.600')}
                        rounded={'full'}
                        border={0}
                        _focus={{
                            bg: useColorModeValue('gray.200', 'gray.800'),
                            outline: 'none'
                        }}
                    />
                    <FormErrorMessage>
                        {errors.text && errors.text.message}
                    </FormErrorMessage>
                    <Button isDisabled={!isValid} colorScheme="blue" bg={'blue.400'}
                        rounded={'full'}
                        color={'white'}
                        flex={'1 0 auto'}
                        _hover={{ bg: 'blue.500' }}
                        _focus={{ bg: 'blue.500' }} type="submit" isLoading={isProcessing}>
                        Add
                    </Button>
                </Stack>
            </Stack>
        </Flex>
    )
}

export default CommentForm;
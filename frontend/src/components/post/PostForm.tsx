import { Box, Button, Checkbox, Flex, FormControl, FormErrorMessage, FormLabel, Heading, Input, Select, Stack, Textarea, useToast } from "@chakra-ui/react"
import { useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useProfile } from "../../hooks/auth/useProfile";
import { useAddPost } from "../../hooks/post/useAddPost";
import { useUpdatePost } from "../../hooks/post/useUpdatePost";
import { useAuth } from "../../providers/AuthProvider";
import { Post } from "../../types/post";
import { PostType, POST_TYPE_OPTIONS, socket } from "../../utils/constants";
import { FormHeader } from "../shared/Form"
import { Page } from "../shared/Page"
import { useNavigate } from "react-router-dom";

type FormValues = {
    title: string;
    content: string;
    profileId: number;
    published: boolean;
    type: PostType
};

type PostFormProps = {
    initialValues?: Post;
};

const PostForm = ({ initialValues }: PostFormProps) => {
    const navigate = useNavigate();
    const toast = useToast();
    const addPost = useAddPost();
    const updatePost = useUpdatePost()
    let { session } = useAuth();
    const { data: profile } = useProfile(session?.user.email);

    const isUpdate = !!initialValues;
    const isProcessing = addPost.isLoading || updatePost.isLoading;

    const {
        handleSubmit,
        register,
        setValue,
        reset,
        formState: { errors }
    } = useForm<FormValues>();

    useEffect(() => {
        if (profile) setValue('profileId', profile.id)
        if (initialValues) reset(initialValues)
    }, [profile, setValue, initialValues, reset]);

    const handleAddPost: SubmitHandler<FormValues> = (post) => {
        addPost.mutate(post as Post, {
            onSuccess: () => {
                toast({
                    description: `post has been added`,
                    status: "success"
                });
                navigate("/admin/posts");
                socket.emit("createPost", { post, username: profile?.username });
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

    const handleUpdatePost: SubmitHandler<FormValues> = (post) => {
        updatePost.mutate(post as Post, {
            onSuccess: () => {
                toast({
                    description: `${post.title} ${post.content} has been updated`,
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
        });
    };

    const onSubmit: SubmitHandler<FormValues> = (values) => {
        if (isUpdate) {
            handleUpdatePost(values);
        } else {
            handleAddPost(values);
        }
    };

    return (
        <Page animation="slideFade">
            <Box as="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={5}>
                    <FormHeader>
                        <Heading fontSize="lg" fontWeight="semibold">
                            Add Post
                        </Heading>
                    </FormHeader>
                    <FormControl isInvalid={!!errors.title}>
                        <FormLabel htmlFor="title">Title</FormLabel>
                        <Input
                            id="title"
                            placeholder="title"
                            {...register("title", {
                                required: "This is required"
                            })}
                        />
                        <FormErrorMessage>
                            {errors.title && errors.title.message}
                        </FormErrorMessage>
                    </FormControl>
                    <FormControl isInvalid={!!errors.content}>
                        <FormLabel htmlFor="content">Content</FormLabel>
                        <Textarea
                            id="content"
                            placeholder='content'
                            {...register("content", {
                                required: "This is required"
                            })} />
                        <FormErrorMessage>
                            {errors.content && errors.content.message}
                        </FormErrorMessage>
                    </FormControl>
                    <FormControl>
                        <FormLabel htmlFor="published">Published</FormLabel>
                        <Checkbox id="published" {...register("published")}>
                            Tick the box to make the post public
                        </Checkbox>
                    </FormControl>
                    <FormControl>
                        <FormLabel htmlFor="type">Type</FormLabel>
                        <Select placeholder='type' {...register("type")}>
                            {POST_TYPE_OPTIONS.map(({ value, label }) => (
                                <option value={value} key={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </FormControl>
                    <Flex direction="row-reverse">
                        <Button colorScheme="blue" type="submit" isLoading={isProcessing}>
                            Save
                        </Button>
                    </Flex>
                </Stack>
            </Box>
        </Page>
    )
}

export default PostForm
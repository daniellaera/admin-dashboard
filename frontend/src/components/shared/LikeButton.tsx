import { IconButton, Tooltip, useToast } from "@chakra-ui/react";
import { useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { HiOutlineThumbUp } from "react-icons/hi";
import { useProfile } from "../../hooks/auth/useProfile";
import { useAddLike } from "../../hooks/like/useAddLike";
import { useAuth } from "../../providers/AuthProvider";
import { Like } from "../../types/like";
import { LIKE_BUTTON_TEXT, LIKE_BUTTON_TEXT_DISABLED } from "../../utils/constants";

type LikeButtonProps = {
    postId: number
}

type FormValues = {
    postId: number;
    profileId: number
};

function LikeButton({ postId }: LikeButtonProps) {
    const toast = useToast();
    const addLike = useAddLike()
    let { session } = useAuth();
    const { data: profile } = useProfile(session?.user.email);

    const {
        handleSubmit,
        setValue,
    } = useForm<FormValues>();

    useEffect(() => {
        if (postId) setValue('postId', postId)
        if (profile?.id) setValue('profileId', profile.id)
    }, [setValue, postId, profile?.id]);

    const handleAddLike: SubmitHandler<FormValues> = (like) => {
        addLike.mutate(like as Like, {
            onSuccess: () => {
                toast({
                    description: `post liked`,
                    status: "success"
                });
            },
            onError: (error: any) => {
                toast({
                    position: 'top',
                    description: `${error.message.response.data.error}`,
                    status: "warning"
                });
            }
        });
    };

    const onSubmit: SubmitHandler<FormValues> = (values) => {
        handleAddLike(values)
    };

    return (
        <Tooltip placement="bottom" hasArrow label={session ? LIKE_BUTTON_TEXT : LIKE_BUTTON_TEXT_DISABLED} bg={'blue.600'}>
            <IconButton
                isDisabled={!session}
                variant={'ghost'}
                aria-label="'Like Button"
                icon={<HiOutlineThumbUp />}
                onClick={handleSubmit(onSubmit)} />
        </Tooltip>
    )
}

export { LikeButton }
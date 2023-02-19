import {
  Avatar,
  AvatarBadge,
  Button,
  Center,
  FormErrorMessage,
  Heading,
  IconButton,
  Input,
  useToast
} from "@chakra-ui/react";
import { useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  Form,
  FormFooter,
  FormHeader,
  FormLine,
  FormLineField,
  FormLineLabel
} from "../shared/Form";
import { useUpdateProfile } from "../../hooks/auth/useUpdateProfile";
import { useAuth } from "../../providers/AuthProvider";
import { SmallCloseIcon } from "@chakra-ui/icons";
import { useProfile } from "../../hooks/auth/useProfile";
import { Profile } from "../../types/profile";

type FormValues = {
  username: string;
  company: string;
  website: string;
  id: number;
};

function ProfileForm() {
  const toast = useToast();
  const updateProfile = useUpdateProfile();
  const { session } = useAuth();
  const { data: profile } = useProfile(session?.user.email);

  const {
    handleSubmit,
    register,
    setValue,
    reset,
    formState: { errors }
  } = useForm<FormValues>();

  useEffect(() => {
    if (profile) setValue('id', profile.id)
  }, [profile, setValue]);

  useEffect(() => {
    reset(profile);
  }, [profile, reset]);

  const handleUpdateProfile: SubmitHandler<FormValues> = (values) => {
    updateProfile.mutate(values as Profile, {
      onSuccess: () => {
        toast({
          description: "Your profile has been updated",
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

  return (
    <Form onSubmit={handleSubmit(handleUpdateProfile)}>
      <FormHeader>
        <Heading fontSize="lg" fontWeight="semibold">
          Edit profile
        </Heading>
      </FormHeader>
      <FormLine id="userName">
        <FormLineLabel>User Icon</FormLineLabel>
        <Avatar size="xl" src="https://100k-faces.glitch.me/random-image">
          <AvatarBadge
            as={IconButton}
            size="sm"
            rounded="full"
            top="-10px"
            colorScheme="red"
            aria-label="remove Image"
            icon={<SmallCloseIcon />}
          />
        </Avatar>
        <Center>
          <Button>Change Avatar</Button>
        </Center>
      </FormLine>
      <FormLine isInvalid={!!errors.username}>
        <FormLineLabel htmlFor="username">Username</FormLineLabel>
        <FormLineField>
          <Input
            id="username"
            placeholder="Username"
            {...register("username", {
              required: "This is required"
            })}
          />
          <FormErrorMessage>
            {errors.username && errors.username.message}
          </FormErrorMessage>
        </FormLineField>
      </FormLine>
      <FormLine isInvalid={!!errors.website}>
        <FormLineLabel htmlFor="website">Website</FormLineLabel>
        <FormLineField>
          <Input
            id="website"
            placeholder="Website"
            {...register("website", {
              required: "This is required"
            })}
          />
          <FormErrorMessage>
            {errors.website && errors.website.message}
          </FormErrorMessage>
        </FormLineField>
      </FormLine>
      <FormLine isInvalid={!!errors.company}>
        <FormLineLabel htmlFor="company">Company</FormLineLabel>
        <FormLineField>
          <Input
            id="company"
            placeholder="Company"
            {...register("company", {
              required: "This is required"
            })}
          />
          <FormErrorMessage>
            {errors.company && errors.company.message}
          </FormErrorMessage>
        </FormLineField>
      </FormLine>
      <FormFooter>
        <Button
          colorScheme="blue"
          isLoading={updateProfile.isLoading}
          type="submit"
        >
          Save
        </Button>
      </FormFooter>
    </Form>
  );
}

export { ProfileForm };

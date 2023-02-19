import {
    Button,
    FormErrorMessage,
    Heading,
    Input,
    useToast
  } from "@chakra-ui/react";
  import { SubmitHandler, useForm } from "react-hook-form";
  import { useUpdatePassword } from "../../hooks/auth/useUpdatePassword";
  import {
    Form,
    FormFooter,
    FormHeader,
    FormLine,
    FormLineField,
    FormLineLabel
  } from "../shared/Form";
  
  type FormValues = {
    confirmPassword: string;
    newPassword: string;
  };
  
  function PasswordForm() {
    const toast = useToast();
    const updatePassword = useUpdatePassword();
  
    const {
      handleSubmit,
      register,
      formState: { errors },
      watch
    } = useForm<FormValues>();
  
    const handleUpdatePassword: SubmitHandler<FormValues> = (values) => {
      updatePassword.mutate(values.newPassword, {
        onSuccess: () => {
          toast({
            description: "Your password has been updated",
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
      <Form onSubmit={handleSubmit(handleUpdatePassword)}>
        <FormHeader>
          <Heading fontSize="lg" fontWeight="semibold">
            Change password
          </Heading>
        </FormHeader>
        <FormLine isInvalid={!!errors.newPassword}>
          <FormLineLabel htmlFor="newPassword">New Password</FormLineLabel>
          <FormLineField>
            <Input
              id="newPassword"
              placeholder="New Password"
              type="password"
              {...register("newPassword", {
                required: "This is required"
              })}
            />
            <FormErrorMessage>
              {errors.newPassword && errors.newPassword.message}
            </FormErrorMessage>
          </FormLineField>
        </FormLine>
        <FormLine isInvalid={!!errors.confirmPassword}>
          <FormLineLabel htmlFor="confirmPassword">
            Confirm Password
          </FormLineLabel>
          <FormLineField>
            <Input
              id="confirmPassword"
              placeholder="Confirm Password"
              type="password"
              {...register("confirmPassword", {
                validate: (value: string) => {
                  if (watch("newPassword") !== value) {
                    return "Your passwords do no match";
                  }
                }
              })}
            />
            <FormErrorMessage>
              {errors.confirmPassword && errors.confirmPassword.message}
            </FormErrorMessage>
          </FormLineField>
        </FormLine>
        <FormFooter>
          <Button
            colorScheme="blue"
            isLoading={updatePassword.isLoading}
            type="submit"
          >
            Save
          </Button>
        </FormFooter>
      </Form>
    );
  }
  
  export { PasswordForm };
  
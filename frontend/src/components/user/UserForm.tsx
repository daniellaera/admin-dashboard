import {
    Box,
    Button,
    Checkbox,
    Flex,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    Select,
    Stack,
    useToast
  } from "@chakra-ui/react";
  import { useEffect } from "react";
  import { SubmitHandler, useForm } from "react-hook-form";
  import { useAddUser } from "../../hooks/user/useAddUser";
  import { useUpdateUser } from "../../hooks/user/useUpdateUser";
  import { User } from "../../types/user";
  
  type FormValues = {
    firstName: string;
    lastName: string;
    role: string;
    disabled?: boolean;
  };
  
  type UserFormProps = {
    initialValues?: User;
  };
  
  function UserForm({ initialValues }: UserFormProps) {
    const toast = useToast();
    const addUser = useAddUser();
    const updateUser = useUpdateUser();
  
    const isUpdate = !!initialValues;
    const isProcessing = addUser.isLoading || updateUser.isLoading;
  
    const {
      handleSubmit,
      register,
      reset,
      formState: { errors }
    } = useForm<FormValues>();
  
    useEffect(() => {
      reset(initialValues);
    }, [initialValues, reset]);
  
    const handleAddUser: SubmitHandler<FormValues> = (user) => {
      addUser.mutate(user as User, {
        onSuccess: () => {
          toast({
            description: `${user.firstName} ${user.lastName} has been added`,
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
  
    const handleUpdateUser: SubmitHandler<FormValues> = (user) => {
      updateUser.mutate(user as User, {
        onSuccess: () => {
          toast({
            description: `${user.firstName} ${user.lastName} has been updated`,
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
        handleUpdateUser(values);
      } else {
        handleAddUser(values);
      }
    };
  
    return (
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={5}>
          <Stack direction={{ base: "column", sm: "row" }} spacing={5}>
            <FormControl isInvalid={!!errors.firstName}>
              <FormLabel htmlFor="firstName">First name</FormLabel>
              <Input
                id="firstName"
                placeholder="First name"
                {...register("firstName", {
                  required: "This is required"
                })}
              />
              <FormErrorMessage>
                {errors.firstName && errors.firstName.message}
              </FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={!!errors.lastName}>
              <FormLabel htmlFor="lastName">Last name</FormLabel>
              <Input
                id="lastName"
                placeholder="Last name"
                {...register("lastName", {
                  required: "This is required"
                })}
              />
              <FormErrorMessage>
                {errors.lastName && errors.lastName.message}
              </FormErrorMessage>
            </FormControl>
          </Stack>
          <FormControl isInvalid={!!errors.role}>
            <FormLabel htmlFor="role">Role</FormLabel>
            <Select
              id="role"
              placeholder="Select Role"
              {...register("role", {
                required: "This is required"
              })}
            >
              <option value="Admin">Admin</option>
              <option value="Member">Member</option>
            </Select>
            <FormErrorMessage>
              {errors.role && errors.role.message}
            </FormErrorMessage>
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="disabled">Disabled</FormLabel>
            <Checkbox id="disabled" {...register("disabled")}>
              Tick the box to disable the user
            </Checkbox>
          </FormControl>
          <Flex direction="row-reverse">
            <Button colorScheme="blue" isLoading={isProcessing} type="submit">
              Save
            </Button>
          </Flex>
        </Stack>
      </Box>
    );
  }
  
  export { UserForm };
  
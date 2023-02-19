import {
    Box,
    Button,
    Container,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Heading,
    Input,
    Stack,
    Text,
    useToast
} from "@chakra-ui/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Brand } from "../../components/shared/Brand";
import { Page } from "../../components/shared/Page";
import { useSignUpWithEmailAndPassword } from "../../hooks/auth/useSignUpWithEmailAndPassword";

type FormValues = {
    email: string;
    password: string;
};

const Signup = () => {
    let navigate = useNavigate();
    let location = useLocation();
    const toast = useToast();
    const signUp = useSignUpWithEmailAndPassword();

    let from = (location as any).state?.from?.pathname || "/";

    const {
        handleSubmit,
        register,
        formState: { errors }
    } = useForm<FormValues>({});

    const handleSignUp: SubmitHandler<FormValues> = (values) => {
        signUp.mutate(values, {
            onSuccess: () => {
                navigate(from, { replace: true });
            },
            onError: (err) => {
                toast({
                    description: `${err}`,
                    status: "error"
                });
            }
        });
    };

    return (

        <Page>
            <Container
                maxW="lg"
                py={{ base: "12", md: "24" }}
                px={{ base: "4", sm: "8" }}
            >
                <Stack spacing="8">
                    <Stack align="center" spacing="6" textAlign="center">
                        <Brand />
                        <Heading>Register</Heading>
                    </Stack>
                    <Box as="form" onSubmit={handleSubmit(handleSignUp)}>
                        <Stack spacing="5">
                            <FormControl isInvalid={!!errors.email}>
                                <FormLabel htmlFor="email">Email</FormLabel>
                                <Input
                                    id="email"
                                    placeholder="Email"
                                    {...register("email", {
                                        required: "This is required"
                                    })}
                                />
                                <FormErrorMessage>
                                    {errors.email && errors.email.message}
                                </FormErrorMessage>
                            </FormControl>
                            <FormControl isInvalid={!!errors.password}>
                                <FormLabel htmlFor="password">Password</FormLabel>
                                <Input
                                    id="password"
                                    placeholder="Password"
                                    type="password"
                                    {...register("password", {
                                        required: "This is required"
                                    })}
                                />
                                <FormErrorMessage>
                                    {errors.password && errors.password.message}
                                </FormErrorMessage>
                            </FormControl>
                        </Stack>
                        <Button
                            mt="6"
                            width={'full'}
                            colorScheme='blue'
                            isLoading={signUp.isLoading}
                            type="submit"
                        >
                            Register
                        </Button>
                        
                        <Stack align="center" direction="row" justify="center" mt="8">
                            <Text>Already have an account?</Text>
                            <Button to="/login" as={Link} colorScheme="blue" variant="link">
                                Login
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
            </Container>
        </Page>
    )
}

export default Signup
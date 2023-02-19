import {
    Box,
    Button,
    Container,
    Divider,
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
  import { useSignInWithEmailAndPassword } from "../../hooks/auth/useSignInWithEmailAndPassword";
  
  type FormValues = {
    email: string;
    password: string;
  };
  
  export default function Login() {
    let navigate = useNavigate();
    let location = useLocation();
    const toast = useToast();
    const signIn = useSignInWithEmailAndPassword();
  
    let from = (location as any).state?.from?.pathname || "/";
  
    const {
      handleSubmit,
      register,
      formState: { errors }
    } = useForm<FormValues>({
      defaultValues: {
        email: "janedane@gmail.com",
        password: "123456"
      }
    });
  
    const handleSignIn: SubmitHandler<FormValues> = (values) => {
      signIn.mutate(values, {
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
              <Heading>Sign in</Heading>
            </Stack>
            <Box as="form" onSubmit={handleSubmit(handleSignIn)}>
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
                isLoading={signIn.isLoading}
                type="submit"
              >
                Sign in
              </Button>
              <Stack align="center" direction="row" mt="6">
                <Divider />
                <Text>OR</Text>
                <Divider />
              </Stack>
              <Button width={'full'} mt="6" variant="outline">
                Continue with Google
              </Button>
              <Stack align="center" direction="row" justify="center" mt="8">
                <Text>Don't have an account?</Text>
                <Button to="/signup" as={Link} colorScheme="blue" variant="link">
                  Sign up
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Page>
    );
  }
  
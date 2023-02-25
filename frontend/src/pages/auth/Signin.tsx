import { Page } from "../../components/shared/Page"
import {
    Box,
    Button,
    Container,
    Divider,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Heading,
    HStack,
    IconButton,
    Input,
    InputGroup,
    InputRightElement,
    Stack,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Text,
    useColorModeValue,
    useDisclosure,
    useToast
} from '@chakra-ui/react';
import { Logo } from "../../components/shared/Logo";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { OAuthButtonGroup } from "../../components/shared/OAuthButtonGroup";
import { useCallback, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { useSignInWithEmailAndPassword } from "../../hooks/auth/useSignInWithEmailAndPassword";
import { useSignUpWithEmailAndPassword } from "../../hooks/auth/useSignUpWithEmailAndPassword";
import { signInWithOAuth } from "../../api/authApi";
import { useSignInWithMagicLink } from "../../hooks/auth/useSignInWithMagicLink";

type FormValues = {
    email: string;
    password: string;
};

const Signin = () => {
    const formBackground = useColorModeValue('gray.100', 'gray.700');
    const [authButtonState, setAuthButtonState] = useState(true);
    const { isOpen, onToggle } = useDisclosure()
    let navigate = useNavigate();
    let location = useLocation();
    const toast = useToast();
    const signIn = useSignInWithEmailAndPassword();
    const signUp = useSignUpWithEmailAndPassword();
    const signWithMagicLink = useSignInWithMagicLink()

    let from = (location as any).state?.from?.pathname || "/";

    const onClickReveal = () => {
        onToggle()
    }

    const { handleSubmit, register, formState: { errors, isValid } } = useForm<FormValues>({
        defaultValues: {
            email: "janedane@gmail.com",
            password: "123456"
        }
    });

    const { register: register2, formState: { errors: errors2, isValid: isValid2 }, handleSubmit: handleSubmit2 } = useForm<FormValues>({
        mode: "onBlur",
    });

    const handleSignInWithMagicLink: SubmitHandler<FormValues> = (values) => {
        signWithMagicLink.mutate(values, {
            onSuccess: () => {
                toast({
                    title: 'Account confirmed.',
                    position: 'top',
                    description: 'Check your email for the login link',
                    status: 'success',
                    duration: 5000,
                    isClosable: true
                });
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

    const signInWithGithub = async () => {
        try {
            signInWithOAuth()
        } catch (error: any) {
            toast({
                title: 'Error',
                position: 'top',
                description: error.error_description || error.message,
                status: 'error',
                duration: 5000,
                isClosable: true
            });
        }
    };

    const handleCallBack = useCallback(
        (stringFromChild: string) => {
           switch (stringFromChild) {
            case 'Google':
                console.log('Login with google...')
                break;
            case 'GitHub':
                signInWithGithub();
                break;
            case 'Twitter':
                console.log('Login with twitter...')
                break;
            default:
                break;
           }
        },
        []
    );

    return (
        <Page>
            <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
                <Stack spacing="8">
                    <Stack spacing="6">
                        <Logo />
                        <Stack spacing={{ base: '2', md: '3' }} textAlign="center">
                            <Heading fontSize={'4xl'}>{!authButtonState ? 'Register a new account' : 'Sign in to your account'}</Heading>
                            <HStack spacing="1" justify="center">
                                <Text color="muted">{authButtonState ? 'Don\'t have an account?' : 'Already a User?'}</Text>
                                <Button onClick={() => setAuthButtonState(!authButtonState)} variant="link" colorScheme="blue">
                                    {authButtonState ? 'Sign up' : 'Log in'}
                                </Button>
                            </HStack>
                        </Stack>
                    </Stack>
                    <Box
                        py={{ base: '0', sm: '8' }}
                        px={{ base: '4', sm: '10' }}
                        bg={formBackground}
                        boxShadow={{ base: 'none', sm: useColorModeValue('md', 'md-dark') }}
                        borderRadius={{ base: 'none', sm: 'xl' }}>

                        <Tabs align='center' isLazy  >
                            <TabList mb='1em'>
                                <Tab>Username/Password</Tab>
                                <Tab>Magic Link</Tab>
                            </TabList>
                            <TabPanels>
                                {/* initially mounted */}
                                <TabPanel as="form" onSubmit={handleSubmit(!authButtonState ? handleSignUp : handleSignIn)}>
                                    <Stack spacing="6">
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
                                                <InputGroup>
                                                    <InputRightElement>
                                                        <IconButton
                                                            variant="link"
                                                            aria-label={isOpen ? 'Mask password' : 'Reveal password'}
                                                            icon={isOpen ? <HiEyeOff /> : <HiEye />}
                                                            onClick={onClickReveal}
                                                        />
                                                    </InputRightElement>
                                                    <Input
                                                        id="password"
                                                        placeholder="Password"
                                                        type={isOpen ? 'text' : 'password'}
                                                        {...register("password", {
                                                            required: "This is required"
                                                        })}
                                                    />
                                                </InputGroup>
                                                <FormErrorMessage>
                                                    {errors.password && errors.password.message}
                                                </FormErrorMessage>
                                            </FormControl>
                                        </Stack>
                                        <Stack spacing="6">
                                            <Button
                                                type="submit"
                                                variant={'solid'}
                                                spinnerPlacement='start'
                                                isLoading={!authButtonState ? signUp.isLoading : signIn.isLoading}
                                                colorScheme="blue" isDisabled={!isValid}
                                            >
                                                {!authButtonState ? (signUp.isLoading || 'Register') : (signIn.isLoading || 'Sign in')}
                                            </Button>
                                            <HStack>
                                                <Divider />
                                                <Text fontSize="sm" whiteSpace="nowrap" color="muted">
                                                    or continue with
                                                </Text>
                                                <Divider />
                                            </HStack>
                                            <OAuthButtonGroup childToParent={handleCallBack} />
                                        </Stack>
                                    </Stack>
                                </TabPanel>
                                {/* initially not mounted */}
                                <TabPanel as="form" onSubmit={handleSubmit2(handleSignInWithMagicLink)}>
                                    <Stack spacing={4}>
                                        <FormControl isInvalid={!!errors2.email}>
                                            <FormLabel htmlFor="email">Email</FormLabel>
                                            <Input
                                                id="email"
                                                placeholder="Email"
                                                {...register2("email", {
                                                    required: "This is required"
                                                })}
                                            />
                                            <FormErrorMessage>
                                                {errors2.email && errors2.email.message}
                                            </FormErrorMessage>
                                        </FormControl>
                                        <Stack spacing={4}>
                                            <Button
                                                type='submit'
                                                isDisabled={!isValid2}
                                                isLoading={signWithMagicLink.isLoading}
                                                loadingText="Sending magic link ..."
                                                colorScheme="blue"
                                                spinnerPlacement="start">
                                                {signWithMagicLink.isLoading || 'Send magic link'}
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>

                    </Box>
                </Stack>
            </Container>
        </Page>
    )
}

export default Signin
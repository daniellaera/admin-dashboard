import {
  emailOnlySchema,
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@devconnector/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Anchor,
  Button,
  Container,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconBrandGithub, IconMailCheck } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyServerErrors, FormError } from '@/components/FormError.tsx';
import { usePageTitle } from '@/components/States.tsx';
import { API_BASE, isApiError } from '@/lib/api.ts';
import { safeRedirect } from '@/lib/guards.ts';
import { toast } from '@/lib/notify.ts';
import {
  providersQuery,
  useConfig,
  useLogin,
  useRegister,
  useRequestMagicLink,
  useResendVerification,
} from './api.ts';

export interface SigninSearch {
  mode?: 'login' | 'register' | undefined;
  redirect?: string | undefined;
  error?: string | undefined;
}

const GITHUB_ERRORS: Record<string, string> = {
  'github-denied': 'GitHub sign-in was cancelled or the state did not match. Please try again.',
  'github-forbidden':
    'This account cannot sign in with GitHub (disabled, or the GitHub e-mail is not verified).',
  'github-failed': 'GitHub sign-in failed. Please try again.',
  'github-disabled': 'GitHub sign-in is not enabled on this server.',
};

export function SigninPage({ search }: { search: SigninSearch }) {
  const [mode, setMode] = useState<'login' | 'register'>(search.mode ?? 'login');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const navigate = useNavigate();
  const config = useConfig();
  const providers = useQuery(providersQuery);
  const target = safeRedirect(search.redirect, '/');
  usePageTitle(mode === 'register' ? 'Register' : 'Sign in');

  useEffect(() => {
    if (search.error) toast.error(null, GITHUB_ERRORS[search.error] ?? 'Sign-in failed');
  }, [search.error]);

  const inviteOnly = config.data?.registrationMode === 'invite_only';
  const registering = mode === 'register' && !inviteOnly;

  if (sentTo) {
    return (
      <AuthCard title="Check your e-mail">
        <Alert color="blue" icon={<IconMailCheck size={18} />} title="Almost there">
          We sent a confirmation link to <b>{sentTo}</b>. Open it to activate your account.
        </Alert>
        <ResendButton email={sentTo} />
        <Button
          variant="subtle"
          onClick={() => {
            setSentTo(null);
          }}
        >
          Back to sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={registering ? 'Register a new account' : 'Sign in to your account'}
      subtitle={
        inviteOnly && mode === 'register' ? (
          <Text c="dimmed" size="sm">
            Registration is invite-only. Ask an administrator for an invitation link.
          </Text>
        ) : (
          <Group gap={4} justify="center">
            <Text c="dimmed" size="sm">
              {registering ? 'Already a User?' : "Don't have an account?"}
            </Text>
            <Anchor
              component="button"
              type="button"
              size="sm"
              onClick={() => {
                setMode(registering ? 'login' : 'register');
              }}
            >
              {registering ? 'Log in' : 'Sign up'}
            </Anchor>
          </Group>
        )
      }
    >
      <Tabs defaultValue="password" keepMounted={false}>
        <Tabs.List grow mb="md">
          <Tabs.Tab value="password">Username/Password</Tabs.Tab>
          <Tabs.Tab value="magic">Magic Link</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="password">
          {registering ? (
            <RegisterForm onSent={setSentTo} onSignedIn={() => void navigate({ to: target })} />
          ) : (
            <LoginForm onSignedIn={() => void navigate({ to: target })} />
          )}
          {providers.data?.github && (
            <>
              <Divider label="or continue with" labelPosition="center" my="md" />
              <Button
                component="a"
                href={`${API_BASE}/auth/github`}
                variant="default"
                fullWidth
                leftSection={<IconBrandGithub size={18} />}
              >
                Sign in with GitHub
              </Button>
            </>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="magic">
          <MagicLinkForm />
        </Tabs.Panel>
      </Tabs>
    </AuthCard>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Container size={460} py={{ base: 'xl', md: 64 }}>
      <Stack gap="md">
        <Stack gap={4} align="center">
          <Title order={1} size="h2" ta="center">
            {title}
          </Title>
          {subtitle}
        </Stack>
        <Paper withBorder shadow="md" p={{ base: 'md', sm: 'xl' }} radius="md">
          <Stack>{children}</Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

function LoginForm({ onSignedIn }: { onSignedIn: () => void }) {
  const login = useLogin();
  const [general, setGeneral] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });
  const submit = (values: LoginInput) => {
    setGeneral(null);
    setUnverified(null);
    login.mutate(values, {
      onSuccess: () => {
        toast.info('Signed in');
        onSignedIn();
      },
      onError: (error) => {
        if (isApiError(error, 403) && error.problem?.type.endsWith('email-not-verified')) {
          setUnverified(values.email);
          return;
        }
        setGeneral(applyServerErrors(error, setError, ['email', 'password']));
      },
    });
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Stack>
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Group justify="flex-end">
          <Anchor component={Link} to="/auth/forgot" size="sm">
            Forgot password?
          </Anchor>
        </Group>
        <FormError message={general} />
        {unverified && (
          <Alert color="yellow" title="E-mail not confirmed">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">Confirm your e-mail address first.</Text>
              <ResendButton email={unverified} />
            </Stack>
          </Alert>
        )}
        <Button type="submit" loading={login.isPending} disabled={!isValid}>
          Sign in
        </Button>
      </Stack>
    </form>
  );
}

function RegisterForm({
  onSent,
  onSignedIn,
}: {
  onSent: (email: string) => void;
  onSignedIn: () => void;
}) {
  const registerUser = useRegister();
  const [general, setGeneral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });
  const submit = (values: RegisterInput) => {
    setGeneral(null);
    registerUser.mutate(values, {
      onSuccess: (result) => {
        if (result.needsVerification) onSent(values.email);
        else {
          toast.info('Signed in');
          onSignedIn();
        }
      },
      onError: (error) => {
        setGeneral(applyServerErrors(error, setError, ['email', 'password']));
      },
    });
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Stack>
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
        <FormError message={general} />
        <Button type="submit" loading={registerUser.isPending} disabled={!isValid}>
          Register
        </Button>
      </Stack>
    </form>
  );
}

function MagicLinkForm() {
  const request = useRequestMagicLink();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<{ email: string }>({
    resolver: zodResolver(emailOnlySchema),
    mode: 'onBlur',
  });
  if (sent) {
    return (
      <Alert color="green" icon={<IconMailCheck size={18} />} title="Check your e-mail">
        If an account exists for that address, a one-time sign-in link is on its way (valid 15
        minutes).
      </Alert>
    );
  }
  return (
    <form
      onSubmit={handleSubmit((v) => {
        request.mutate(v.email, {
          onSuccess: () => {
            setSent(true);
          },
          onError: (e) => {
            toast.error(e);
          },
        });
      })}
      noValidate
    >
      <Stack>
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button
          type="submit"
          loading={request.isPending}
          disabled={!isValid}
          loaderProps={{ type: 'dots' }}
        >
          Send magic link
        </Button>
      </Stack>
    </form>
  );
}

function ResendButton({ email }: { email: string }) {
  const resend = useResendVerification();
  return (
    <Button
      variant="light"
      size="xs"
      loading={resend.isPending}
      onClick={() => {
        resend.mutate(email, {
          onSuccess: () => {
            toast.success('Confirmation e-mail sent again');
          },
          onError: (e) => {
            toast.error(e);
          },
        });
      }}
    >
      Send the confirmation again
    </Button>
  );
}

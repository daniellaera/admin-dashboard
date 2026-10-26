import { emailOnlySchema, passwordSchema } from '@devconnector/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { IconMailCheck } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { applyServerErrors, FormError } from '@/components/FormError.tsx';
import { PageLoader, usePageTitle } from '@/components/States.tsx';
import { errorMessage } from '@/lib/api.ts';
import { toast } from '@/lib/notify.ts';
import {
  invitationPreviewQuery,
  useAcceptInvitation,
  useConsumeMagicLink,
  useForgotPassword,
  useResetPassword,
  useVerifyEmail,
} from './api.ts';
import { AuthCard } from './SigninPage.tsx';

/** Runs a one-time-token mutation once on mount and shows success/failure. */
function useConsumeOnce(
  token: string | undefined,
  consume: (token: string) => Promise<unknown>,
  onDone: () => void,
) {
  const [error, setError] = useState<string | null>(
    token ? null : 'This link is missing its token.',
  );
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    consume(token).then(onDone, (err: unknown) => {
      setError(errorMessage(err));
    });
  }, [token, consume, onDone]);
  return error;
}

export function VerifyEmailPage({ token }: { token?: string | undefined }) {
  usePageTitle('Confirm e-mail');
  const verify = useVerifyEmail();
  const navigate = useNavigate();
  const error = useConsumeOnce(
    token,
    (t) => verify.mutateAsync(t),
    () => {
      toast.success('Your e-mail is confirmed. Welcome!');
      void navigate({ to: '/admin/profile' });
    },
  );
  return (
    <AuthCard title="Confirming your e-mail">
      {error ? <InvalidLink message={error} /> : <PageLoader />}
    </AuthCard>
  );
}

export function MagicLinkPage({ token }: { token?: string | undefined }) {
  usePageTitle('Signing you in');
  const consume = useConsumeMagicLink();
  const navigate = useNavigate();
  const error = useConsumeOnce(
    token,
    (t) => consume.mutateAsync(t),
    () => {
      toast.info('Signed in');
      void navigate({ to: '/' });
    },
  );
  return (
    <AuthCard title="Signing you in">
      {error ? <InvalidLink message={error} /> : <PageLoader />}
    </AuthCard>
  );
}

function InvalidLink({ message }: { message: string }) {
  return (
    <Stack>
      <Alert color="red" title="This link does not work">
        {message}
      </Alert>
      <Button component={Link} to="/signin" variant="default">
        Back to sign in
      </Button>
    </Stack>
  );
}

export function ForgotPasswordPage() {
  usePageTitle('Forgot password');
  const forgot = useForgotPassword();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<{ email: string }>({
    resolver: zodResolver(emailOnlySchema),
    mode: 'onChange',
  });
  return (
    <AuthCard
      title="Reset your password"
      subtitle={
        <Text c="dimmed" size="sm">
          We will e-mail you a link to choose a new one.
        </Text>
      }
    >
      {sent ? (
        <Alert color="green" icon={<IconMailCheck size={18} />} title="Check your e-mail">
          If an account exists for that address, a reset link is on its way (valid 1 hour).
        </Alert>
      ) : (
        <form
          onSubmit={handleSubmit((v) => {
            forgot.mutate(v.email, {
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
              error={errors.email?.message}
              {...register('email')}
            />
            <Button type="submit" loading={forgot.isPending} disabled={!isValid}>
              Send reset link
            </Button>
          </Stack>
        </form>
      )}
      <Button component={Link} to="/signin" variant="subtle">
        Back to sign in
      </Button>
    </AuthCard>
  );
}

const resetFormSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    error: 'Your passwords do not match',
  });
type ResetForm = z.infer<typeof resetFormSchema>;

export function ResetPasswordPage({ token }: { token?: string | undefined }) {
  usePageTitle('Choose a new password');
  const reset = useResetPassword();
  const navigate = useNavigate();
  const [general, setGeneral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetFormSchema),
    mode: 'onChange',
  });
  if (!token)
    return (
      <AuthCard title="Choose a new password">
        <InvalidLink message="This link is missing its token." />
      </AuthCard>
    );
  return (
    <AuthCard title="Choose a new password">
      <form
        onSubmit={handleSubmit((v) => {
          reset.mutate(
            { token, password: v.password },
            {
              onSuccess: () => {
                toast.success('Your password has been updated. Sign in with the new one.');
                void navigate({ to: '/signin' });
              },
              onError: (e) => {
                setGeneral(applyServerErrors(e, setError, ['password']));
              },
            },
          );
        })}
        noValidate
      >
        <Stack>
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register('confirm')}
          />
          <FormError message={general} />
          <Button type="submit" loading={reset.isPending} disabled={!isValid}>
            Save
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}

const acceptFormSchema = z.object({ password: passwordSchema.optional() });
type AcceptForm = z.infer<typeof acceptFormSchema>;

export function InvitePage({ token }: { token?: string | undefined }) {
  usePageTitle('Invitation');
  const preview = useQuery({ ...invitationPreviewQuery(token ?? ''), enabled: Boolean(token) });
  const accept = useAcceptInvitation();
  const navigate = useNavigate();
  const [general, setGeneral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AcceptForm>({ resolver: zodResolver(acceptFormSchema) });

  if (!token)
    return (
      <AuthCard title="Invitation">
        <InvalidLink message="This link is missing its token." />
      </AuthCard>
    );
  if (preview.isPending)
    return (
      <AuthCard title="Invitation">
        <PageLoader />
      </AuthCard>
    );
  if (preview.isError)
    return (
      <AuthCard title="Invitation">
        <InvalidLink message={errorMessage(preview.error)} />
      </AuthCard>
    );
  const info = preview.data;
  const roleLabel = info.role === 'admin' ? 'an administrator' : 'a member';
  return (
    <AuthCard
      title="You are invited"
      subtitle={
        <Text c="dimmed" size="sm" ta="center">
          Join DevConnector as {roleLabel} with <b>{info.email}</b>.
          {info.existingAccount
            ? ' You already have an account: accepting signs you in.'
            : ' Choose a password to create your account.'}
        </Text>
      }
    >
      <form
        onSubmit={handleSubmit((v) => {
          accept.mutate(
            { token, ...(v.password ? { password: v.password } : {}) },
            {
              onSuccess: () => {
                toast.success(
                  info.role === 'admin'
                    ? 'Welcome aboard, administrator!'
                    : 'Welcome to DevConnector!',
                );
                void navigate({ to: '/admin/profile' });
              },
              onError: (e) => {
                setGeneral(applyServerErrors(e, setError, ['password']));
              },
            },
          );
        })}
        noValidate
      >
        <Stack>
          {!info.existingAccount && (
            <PasswordInput
              label="Password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              {...register('password')}
            />
          )}
          <FormError message={general} />
          <Button type="submit" loading={accept.isPending}>
            Accept the invitation
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}

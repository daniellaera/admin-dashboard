import {
  changePasswordSchema,
  profileUpdateSchema,
  type Me,
  type ProfileDetail,
} from '@devconnector/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  FileButton,
  Group,
  MultiSelect,
  PasswordInput,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { applyServerErrors, FormError } from '@/components/FormError.tsx';
import { ErrorState, PageLoader, usePageTitle } from '@/components/States.tsx';
import { UserAvatar } from '@/components/UserAvatar.tsx';
import { Toolbar } from '@/features/admin/common.tsx';
import { useChangePassword, useDeleteAccount } from '@/features/auth/api.ts';
import {
  catalogQuery,
  myProfileQuery,
  useRemoveAvatar,
  useUpdateProfile,
  useUploadAvatar,
} from '@/features/profiles/api.ts';
import { toast } from '@/lib/notify.ts';
import { CvSections } from './CvSections.tsx';

export function ProfilePage({ me }: { me: Me }) {
  usePageTitle('Profile');
  const profile = useQuery(myProfileQuery);
  if (profile.isPending) return <PageLoader />;
  if (profile.isError)
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  return (
    <>
      <Toolbar title="Profile" />
      <Card>
        <Text fw={600} mb="md">
          Profile details
        </Text>
        <Tabs defaultValue="profile" variant="pills" radius="xl">
          <Tabs.List mb="lg">
            <Tabs.Tab value="profile">Profile</Tabs.Tab>
            <Tabs.Tab value="password">Password</Tabs.Tab>
            <Tabs.Tab value="danger" color="red">
              Danger Zone
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="profile">
            <ProfileForm profile={profile.data} />
          </Tabs.Panel>
          <Tabs.Panel value="password">
            <PasswordForm me={me} />
          </Tabs.Panel>
          <Tabs.Panel value="danger">
            <DangerZone me={me} />
          </Tabs.Panel>
        </Tabs>
      </Card>
      <CvSections profile={profile.data} />
    </>
  );
}

/** The form always submits every field; the API schema keeps them optional for PATCH semantics. */
const profileFormSchema = profileUpdateSchema.required();
type ProfileFormValues = z.input<typeof profileFormSchema>;

function ProfileForm({ profile }: { profile: ProfileDetail }) {
  const update = useUpdateProfile();
  const upload = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const catalog = useQuery(catalogQuery);
  const [general, setGeneral] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues, unknown, z.output<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(profile),
  });
  useEffect(() => {
    reset(toFormValues(profile));
  }, [profile, reset]);

  const onFile = (file: File | null) => {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: () => {
        toast.success('Avatar updated');
      },
      onError: (e) => {
        toast.error(e);
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setGeneral(null);
        update.mutate(values, {
          onSuccess: () => {
            toast.success('Your profile has been updated');
          },
          onError: (e) => {
            setGeneral(
              applyServerErrors(e, setError, [
                'username',
                'website',
                'company',
                'bio',
                'skills',
                'isPublic',
              ]),
            );
          },
        });
      })}
      noValidate
    >
      <Stack gap="lg">
        <Title order={2} size="h4">
          Edit profile
        </Title>
        <Group align="center">
          <UserAvatar card={profile} size={96} />
          <Stack gap="xs">
            <Text fw={500}>User Avatar</Text>
            <Group>
              <FileButton
                onChange={onFile}
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              >
                {(props) => (
                  <Button {...props} variant="default" loading={upload.isPending}>
                    Upload
                  </Button>
                )}
              </FileButton>
              {profile.avatarUrl && (
                <Button
                  variant="subtle"
                  color="red"
                  loading={removeAvatar.isPending}
                  onClick={() => {
                    removeAvatar.mutate(undefined, {
                      onSuccess: () => {
                        toast.success('Avatar removed');
                      },
                      onError: (e) => {
                        toast.error(e);
                      },
                    });
                  }}
                >
                  Remove
                </Button>
              )}
            </Group>
            <Text size="xs" c="dimmed">
              JPEG, PNG, WebP, GIF or AVIF — resized to 256 px.
            </Text>
          </Stack>
        </Group>
        <Controller
          control={control}
          name="isPublic"
          render={({ field }) => (
            <Switch
              label="Public"
              description="If you make your profile public it will be visible by everyone"
              checked={field.value}
              onChange={(e) => {
                field.onChange(e.currentTarget.checked);
              }}
            />
          )}
        />
        <TextInput
          label="Username"
          placeholder="Username"
          error={errors.username?.message}
          {...register('username')}
        />
        <TextInput
          label="Website"
          placeholder="https://"
          error={errors.website?.message}
          {...register('website')}
        />
        <TextInput
          label="Company"
          placeholder="Company"
          error={errors.company?.message}
          {...register('company')}
        />
        <Textarea
          label="Bio"
          placeholder="Bio"
          autosize
          minRows={3}
          error={errors.bio?.message}
          {...register('bio')}
        />
        <Controller
          control={control}
          name="skills"
          render={({ field }) => (
            <MultiSelect
              label="Programming Languages"
              placeholder="Pick programming languages"
              searchable
              data={(catalog.data?.skills ?? []).map((s) => ({ value: s.value, label: s.label }))}
              value={field.value}
              onChange={field.onChange}
              error={errors.skills?.message}
            />
          )}
        />
        <FormError message={general} />
        <Group justify="flex-end">
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function toFormValues(p: ProfileDetail): ProfileFormValues {
  return {
    username: p.username ?? '',
    website: p.website ?? '',
    company: p.company ?? '',
    bio: p.bio ?? '',
    isPublic: p.isPublic,
    skills: p.skills,
  };
}

const passwordFormSchema = changePasswordSchema
  .extend({ confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    error: 'Your passwords do not match',
  });
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

function PasswordForm({ me }: { me: Me }) {
  const change = useChangePassword();
  const [general, setGeneral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    mode: 'onChange',
  });
  if (!me.hasPassword) {
    return (
      <Alert color="blue" title="No password yet">
        Your account signs in with GitHub. To add a password, use “Forgot password” on the sign-in
        page: the link we e-mail you lets you choose one.
      </Alert>
    );
  }
  return (
    <form
      onSubmit={handleSubmit((v) => {
        setGeneral(null);
        change.mutate(
          { currentPassword: v.currentPassword, newPassword: v.newPassword },
          {
            onSuccess: () => {
              reset();
              toast.success('Your password has been updated');
            },
            onError: (e) => {
              setGeneral(applyServerErrors(e, setError, ['currentPassword', 'newPassword']));
            },
          },
        );
      })}
      noValidate
    >
      <Stack maw={480}>
        <Title order={2} size="h4">
          Change password
        </Title>
        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <FormError message={general} />
        <Group justify="flex-end">
          <Button type="submit" loading={change.isPending} disabled={!isValid}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

const deleteSchema = z.object({ confirmation: z.string().min(1, { error: 'Required' }) });

function DangerZone({ me }: { me: Me }) {
  const remove = useDeleteAccount();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ confirmation: string }>({ resolver: zodResolver(deleteSchema) });
  if (me.role === 'owner') {
    return (
      <Alert color="yellow" title="Owner account">
        The owner account cannot be deleted from the app.
      </Alert>
    );
  }
  const confirmDelete = (confirmation: string) =>
    modals.openConfirmModal({
      title: 'Delete Profile',
      children: <Text size="sm">Are you sure? You can't undo this action afterwards.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        remove.mutate(me.hasPassword ? { password: confirmation } : { email: confirmation }, {
          onSuccess: () => {
            toast.success('Your profile has been deleted');
            void navigate({ to: '/' });
          },
          onError: (e) => {
            setError('confirmation', { message: applyServerErrors(e, setError, []) ?? 'Failed' });
          },
        });
      },
    });
  return (
    <form onSubmit={handleSubmit((v) => confirmDelete(v.confirmation))} noValidate>
      <Stack maw={480}>
        <Title order={2} size="h4">
          Delete your account
        </Title>
        <Text size="sm" c="dimmed">
          This removes your profile, posts, comments, likes and avatar immediately.
        </Text>
        {me.hasPassword ? (
          <PasswordInput
            label="Confirm with your password"
            autoComplete="current-password"
            error={errors.confirmation?.message}
            {...register('confirmation')}
          />
        ) : (
          <TextInput
            label="Type your e-mail address to confirm"
            autoComplete="off"
            error={errors.confirmation?.message}
            {...register('confirmation')}
          />
        )}
        <Group justify="flex-end">
          <Button type="submit" color="red" loading={remove.isPending}>
            Delete Account
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

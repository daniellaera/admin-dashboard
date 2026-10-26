import {
  invitationCreateSchema,
  ROLES,
  type AdminUser,
  type InvitationCreateInput,
  type Me,
  type Role,
} from '@devconnector/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedCallback, useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import {
  IconArrowLeft,
  IconEye,
  IconMailForward,
  IconSearch,
  IconTrash,
  IconUserCheck,
  IconUserOff,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { applyServerErrors, FormError } from '@/components/FormError.tsx';
import { ActionIconLink, ButtonLink } from '@/components/links.tsx';
import { PaginationBar } from '@/components/PaginationBar.tsx';
import { EmptyState, ErrorState, PageLoader, usePageTitle } from '@/components/States.tsx';
import { UserAvatar } from '@/components/UserAvatar.tsx';
import { timeAgo } from '@/lib/format.ts';
import { toast } from '@/lib/notify.ts';
import {
  useCreateInvitation,
  useDeleteUser,
  userQuery,
  usersQuery,
  useUpdateUser,
  type UsersFilters,
} from './api.ts';
import { ROLE_LABEL, RoleBadge, StatusBadge, Toolbar } from './common.tsx';
import { useSudoAction } from './sudo.tsx';

export interface UsersSearch {
  page?: number | undefined;
  q?: string | undefined;
  role?: Role | undefined;
  status?: 'active' | 'disabled' | undefined;
}

/** What the current actor may do to a target, mirroring the API rules (ADR-013). */
function permissions(actor: Me, target: AdminUser) {
  const isOwner = actor.role === 'owner';
  const self = actor.id === target.id;
  const untouchable =
    target.role === 'owner' || self || (actor.role === 'admin' && target.role !== 'user');
  return {
    canToggle: !untouchable,
    canDelete: !untouchable,
    canChangeRole: isOwner && target.role !== 'owner',
  };
}

export function UserActions({ me, user, compact }: { me: Me; user: AdminUser; compact?: boolean }) {
  const update = useUpdateUser();
  const remove = useDeleteUser();
  const withSudo = useSudoAction();
  const navigate = useNavigate();
  const perms = permissions(me, user);

  const toggle = () => {
    update.mutate(
      { id: user.id, input: { disabled: !user.disabled } },
      {
        onSuccess: (u) => {
          toast.success(`${u.displayName} is now ${u.disabled ? 'disabled' : 'active'}`);
        },
        onError: (e) => {
          toast.error(e);
        },
      },
    );
  };
  const confirmDelete = () =>
    modals.openConfirmModal({
      title: 'Delete User',
      children: (
        <Text size="sm">
          Delete <b>{user.email}</b> and everything they published? You can't undo this action
          afterwards.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        remove.mutate(user.id, {
          onSuccess: () => {
            toast.success(`${user.displayName} has been removed`);
            if (!compact) void navigate({ to: '/admin/users' });
          },
          onError: (e) => {
            toast.error(e);
          },
        });
      },
    });
  const changeRole = (role: Role | null) => {
    if (!role || role === user.role || role === 'owner') return;
    void withSudo(async () => {
      const updated = await update.mutateAsync({ id: user.id, input: { role } });
      toast.success(`${updated.displayName} is now ${ROLE_LABEL[updated.role]}`);
    });
  };

  return (
    <Group gap={compact ? 4 : 'sm'} wrap="nowrap" justify={compact ? 'flex-end' : 'flex-start'}>
      {perms.canChangeRole && (
        <Select
          aria-label={`Role of ${user.displayName}`}
          size={compact ? 'xs' : 'sm'}
          w={compact ? 120 : 160}
          data={ROLES.filter((r) => r !== 'owner').map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          value={user.role}
          onChange={(v) => {
            changeRole(v);
          }}
          allowDeselect={false}
          disabled={update.isPending}
        />
      )}
      {perms.canToggle &&
        (compact ? (
          <ActionIcon
            variant="subtle"
            color={user.disabled ? 'green' : 'yellow'}
            aria-label={
              user.disabled ? `Enable ${user.displayName}` : `Disable ${user.displayName}`
            }
            onClick={toggle}
            loading={update.isPending}
          >
            {user.disabled ? <IconUserCheck size={16} /> : <IconUserOff size={16} />}
          </ActionIcon>
        ) : (
          <Button
            variant="default"
            leftSection={user.disabled ? <IconUserCheck size={16} /> : <IconUserOff size={16} />}
            onClick={toggle}
            loading={update.isPending}
          >
            {user.disabled ? 'Enable account' : 'Disable account'}
          </Button>
        ))}
      {perms.canDelete &&
        (compact ? (
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={`Delete ${user.displayName}`}
            onClick={confirmDelete}
          >
            <IconTrash size={16} />
          </ActionIcon>
        ) : (
          <Button
            color="red"
            variant="light"
            leftSection={<IconTrash size={16} />}
            onClick={confirmDelete}
          >
            Delete user
          </Button>
        ))}
      {compact && (
        <ActionIconLink
          to="/admin/users/$userId"
          params={{ userId: String(user.id) }}
          variant="subtle"
          aria-label={`View ${user.displayName}`}
        >
          <IconEye size={16} />
        </ActionIconLink>
      )}
    </Group>
  );
}

const PAGE_SIZE = 10;

export function UsersPage({ me, search }: { me: Me; search: UsersSearch }) {
  usePageTitle('Users');
  const navigate = useNavigate();
  const page = search.page ?? 1;
  const filters: UsersFilters = { page, q: search.q, role: search.role, status: search.status };
  const users = useQuery(usersQuery(filters));
  const [draft, setDraft] = useState(search.q ?? '');
  const [inviteOpened, invite] = useDisclosure(false);
  const applySearch = useDebouncedCallback((q: string) => {
    void navigate({
      to: '/admin/users',
      search: (prev) => ({ ...prev, page: 1, q: q.trim() || undefined }),
    });
  }, 300);

  return (
    <>
      <Toolbar title="Users">
        <Button leftSection={<IconMailForward size={16} />} onClick={invite.open}>
          Invite user
        </Button>
      </Toolbar>
      <Card>
        <Group mb="md" wrap="wrap">
          <TextInput
            aria-label="Search users"
            placeholder="Search by e-mail or name"
            leftSection={<IconSearch size={16} />}
            value={draft}
            onChange={(e) => {
              setDraft(e.currentTarget.value);
              applySearch(e.currentTarget.value);
            }}
            w={{ base: '100%', sm: 280 }}
          />
          <Select
            aria-label="Filter by role"
            placeholder="All roles"
            clearable
            data={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            value={search.role ?? null}
            onChange={(v) =>
              void navigate({
                to: '/admin/users',
                search: (prev) => ({ ...prev, page: 1, role: v ?? undefined }),
              })
            }
            w={140}
          />
          <Select
            aria-label="Filter by status"
            placeholder="All statuses"
            clearable
            data={[
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Disabled' },
            ]}
            value={search.status ?? null}
            onChange={(v) =>
              void navigate({
                to: '/admin/users',
                search: (prev) => ({
                  ...prev,
                  page: 1,
                  status: v ?? undefined,
                }),
              })
            }
            w={140}
          />
        </Group>
        {users.isPending ? (
          <PageLoader />
        ) : users.isError ? (
          <ErrorState error={users.error} onRetry={() => void users.refetch()} />
        ) : users.data.items.length === 0 ? (
          <EmptyState message="Users will show up here!" />
        ) : (
          <>
            <Table.ScrollContainer minWidth={900}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>E-mail</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Posts</Table.Th>
                    <Table.Th>Last seen</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {users.data.items.map((u) => (
                    <Table.Tr key={u.id}>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <UserAvatar card={u} size="sm" />
                          <Text fw={500}>{u.displayName}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{u.email}</Text>
                        {!u.emailVerified && (
                          <Text size="xs" c="dimmed">
                            not verified
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <RoleBadge role={u.role} />
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge disabled={u.disabled} />
                      </Table.Td>
                      <Table.Td>{u.postCount}</Table.Td>
                      <Table.Td>{u.lastSeenAt ? timeAgo(u.lastSeenAt) : '—'}</Table.Td>
                      <Table.Td>
                        <UserActions me={me} user={u} compact />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <PaginationBar
              page={page}
              limit={PAGE_SIZE}
              total={users.data.total}
              onChange={(p) =>
                void navigate({ to: '/admin/users', search: (prev) => ({ ...prev, page: p }) })
              }
            />
          </>
        )}
      </Card>
      <Modal opened={inviteOpened} onClose={invite.close} title="Invite someone" centered>
        {inviteOpened && <InviteForm me={me} onDone={invite.close} />}
      </Modal>
    </>
  );
}

export function InviteForm({ me, onDone }: { me: Me; onDone: () => void }) {
  const create = useCreateInvitation();
  const withSudo = useSudoAction();
  const [general, setGeneral] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<InvitationCreateInput>({
    resolver: zodResolver(invitationCreateSchema),
    defaultValues: { email: '', role: 'user' },
  });
  return (
    <form
      onSubmit={handleSubmit((values) => {
        setGeneral(null);
        void withSudo(async () => {
          try {
            const inv = await create.mutateAsync(values);
            toast.success(`Invitation sent to ${inv.email}`);
            onDone();
          } catch (e) {
            const msg = applyServerErrors(e, setError, ['email', 'role']);
            setGeneral(msg);
            throw e;
          }
        });
      })}
      noValidate
    >
      <Stack>
        <TextInput
          label="E-mail"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select
              label="Role"
              data={[
                { value: 'user', label: 'Member' },
                ...(me.role === 'owner'
                  ? [{ value: 'admin', label: 'Admin (requires your password)' }]
                  : []),
              ]}
              value={field.value}
              onChange={(v) => {
                field.onChange(v ?? 'user');
              }}
              allowDeselect={false}
            />
          )}
        />
        <FormError message={general} />
        <Text size="xs" c="dimmed">
          The invitation link is valid for 72 hours and can be used once.
        </Text>
        <Group justify="flex-end">
          <Button type="submit" loading={create.isPending}>
            Send invitation
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function UserDetailPage({ me, userId }: { me: Me; userId: number }) {
  const user = useQuery(userQuery(userId));
  usePageTitle(user.data ? user.data.displayName : 'User');
  if (user.isPending) return <PageLoader />;
  if (user.isError) return <ErrorState error={user.error} onRetry={() => void user.refetch()} />;
  const u = user.data;
  return (
    <>
      <Toolbar title={u.displayName}>
        <ButtonLink to="/admin/users" variant="default" leftSection={<IconArrowLeft size={16} />}>
          Back
        </ButtonLink>
      </Toolbar>
      <Card>
        <Group align="flex-start" wrap="nowrap">
          <UserAvatar card={u} size={80} />
          <Stack gap={6} style={{ flex: 1 }}>
            <Group gap="sm">
              <Text fw={700} size="lg">
                {u.displayName}
              </Text>
              <RoleBadge role={u.role} />
              <StatusBadge disabled={u.disabled} />
            </Group>
            <Text size="sm">
              {u.email}
              {u.emailVerified ? '' : ' (not verified)'}
            </Text>
            <Text size="sm" c="dimmed">
              Joined {timeAgo(u.createdAt)} · {u.postCount} post{u.postCount === 1 ? '' : 's'} ·
              last seen {u.lastSeenAt ? timeAgo(u.lastSeenAt) : 'never'}
            </Text>
            <UserActions me={me} user={u} />
          </Stack>
        </Group>
      </Card>
    </>
  );
}

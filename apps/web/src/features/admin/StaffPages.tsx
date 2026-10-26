import {
  AUDIT_ACTIONS,
  catalogItemSchema,
  type AuditAction,
  type CatalogItemInput,
  type CatalogKind,
  type Me,
  type RegistrationMode,
} from '@devconnector/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActionIcon,
  Button,
  Card,
  Code,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconCheck, IconPencil, IconTrash, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyServerErrors, FormError } from '@/components/FormError.tsx';
import { PaginationBar } from '@/components/PaginationBar.tsx';
import { EmptyState, ErrorState, PageLoader, usePageTitle } from '@/components/States.tsx';
import { UserAvatar } from '@/components/UserAvatar.tsx';
import { catalogQuery } from '@/features/profiles/api.ts';
import { timeAgo } from '@/lib/format.ts';
import { toast } from '@/lib/notify.ts';
import {
  auditQuery,
  invitationsQuery,
  settingsQuery,
  useCatalogMutations,
  useRevokeInvitation,
  useSaveSettings,
} from './api.ts';
import { RoleBadge, Toolbar } from './common.tsx';
import { useSudoAction } from './sudo.tsx';
import { InviteForm } from './UsersPage.tsx';

// ── Invitations ───────────────────────────────────────────────────────────────

export function InvitationsPage({ me }: { me: Me }) {
  usePageTitle('Invitations');
  const list = useQuery(invitationsQuery);
  const revoke = useRevokeInvitation();
  const withSudo = useSudoAction();
  return (
    <>
      <Toolbar title="Invitations" />
      <Card>
        <Text fw={600} mb="sm">
          Send an invitation
        </Text>
        <InviteForm me={me} onDone={() => undefined} />
      </Card>
      <Card mt="md">
        <Text fw={600} mb="sm">
          Pending invitations
        </Text>
        {list.isPending ? (
          <PageLoader />
        ) : list.isError ? (
          <ErrorState error={list.error} />
        ) : list.data.length === 0 ? (
          <EmptyState message="No pending invitations" />
        ) : (
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>E-mail</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Invited by</Table.Th>
                <Table.Th>Expires</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {list.data.map((i) => (
                <Table.Tr key={i.id}>
                  <Table.Td>{i.email}</Table.Td>
                  <Table.Td>
                    <RoleBadge role={i.role} />
                  </Table.Td>
                  <Table.Td>{i.invitedBy?.displayName ?? '—'}</Table.Td>
                  <Table.Td>{timeAgo(i.expiresAt)}</Table.Td>
                  <Table.Td>
                    <Group justify="flex-end">
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        color="red"
                        onClick={() =>
                          void withSudo(async () => {
                            await revoke.mutateAsync(i.id);
                            toast.success(`Invitation for ${i.email} revoked`);
                          })
                        }
                      >
                        Revoke
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

// ── Catalog ───────────────────────────────────────────────────────────────────

function CatalogTab({ kind }: { kind: CatalogKind }) {
  const catalog = useQuery(catalogQuery);
  const { create, rename, remove } = useCatalogMutations(kind);
  const [editing, setEditing] = useState<{ value: string; label: string } | null>(null);
  const [general, setGeneral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CatalogItemInput>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: { value: '', label: '' },
  });
  const items = catalog.data?.[kind] ?? [];
  const noun = kind === 'skills' ? 'skill' : 'tag';

  const confirmRemove = (value: string) =>
    modals.openConfirmModal({
      title: `Remove ${noun}`,
      children: (
        <Text size="sm">“{value}” will be removed from every profile or post that uses it.</Text>
      ),
      labels: { confirm: 'Remove', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        remove.mutate(value, {
          onSuccess: () => {
            toast.success(`${value} removed`);
          },
          onError: (e) => {
            toast.error(e);
          },
        });
      },
    });

  return (
    <Stack>
      <form
        onSubmit={handleSubmit((v) => {
          setGeneral(null);
          create.mutate(v, {
            onSuccess: (item) => {
              toast.success(`${item.label} added`);
              reset();
            },
            onError: (e) => {
              setGeneral(applyServerErrors(e, setError, ['value', 'label']));
            },
          });
        })}
        noValidate
      >
        <Group align="flex-end" wrap="wrap">
          <TextInput
            label="Value"
            placeholder={kind === 'skills' ? 'e.g. zig' : 'e.g. ai'}
            error={errors.value?.message}
            {...register('value')}
          />
          <TextInput
            label="Label"
            placeholder={kind === 'skills' ? 'Zig' : 'AI'}
            error={errors.label?.message}
            {...register('label')}
          />
          <Button type="submit" loading={create.isPending}>
            Add {noun}
          </Button>
        </Group>
        <FormError message={general} />
      </form>
      {catalog.isPending ? (
        <PageLoader />
      ) : (
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Value</Table.Th>
              <Table.Th>Label</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={item.value}>
                <Table.Td>
                  <Code>{item.value}</Code>
                </Table.Td>
                <Table.Td>
                  {editing?.value === item.value ? (
                    <TextInput
                      size="xs"
                      aria-label={`New label for ${item.value}`}
                      value={editing.label}
                      onChange={(e) => {
                        setEditing({ value: item.value, label: e.currentTarget.value });
                      }}
                    />
                  ) : (
                    item.label
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    {editing?.value === item.value ? (
                      <>
                        <ActionIcon
                          variant="subtle"
                          color="green"
                          aria-label="Save label"
                          onClick={() => {
                            rename.mutate(
                              { value: item.value, label: editing.label },
                              {
                                onSuccess: () => {
                                  setEditing(null);
                                },
                                onError: (e) => {
                                  toast.error(e);
                                },
                              },
                            );
                          }}
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          aria-label="Cancel"
                          onClick={() => {
                            setEditing(null);
                          }}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </>
                    ) : (
                      <ActionIcon
                        variant="subtle"
                        aria-label={`Rename ${item.value}`}
                        onClick={() => {
                          setEditing({ value: item.value, label: item.label });
                        }}
                      >
                        <IconPencil size={16} />
                      </ActionIcon>
                    )}
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Remove ${item.value}`}
                      onClick={() => confirmRemove(item.value)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}

export function CatalogPage() {
  usePageTitle('Catalog');
  return (
    <>
      <Toolbar title="Skills & tags catalog" />
      <Card>
        <Tabs defaultValue="skills">
          <Tabs.List mb="md">
            <Tabs.Tab value="skills">Skills</Tabs.Tab>
            <Tabs.Tab value="tags">Tags</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="skills">
            <CatalogTab kind="skills" />
          </Tabs.Panel>
          <Tabs.Panel value="tags">
            <CatalogTab kind="tags" />
          </Tabs.Panel>
        </Tabs>
      </Card>
    </>
  );
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export interface AuditSearch {
  page?: number | undefined;
  action?: AuditAction | undefined;
}

const AUDIT_PAGE = 20;

export function AuditPage({ search }: { search: AuditSearch }) {
  usePageTitle('Audit log');
  const navigate = useNavigate();
  const page = search.page ?? 1;
  const list = useQuery(auditQuery({ page, action: search.action }));
  return (
    <>
      <Toolbar title="Audit log">
        <Select
          aria-label="Filter by action"
          placeholder="All actions"
          clearable
          data={AUDIT_ACTIONS.map((a) => ({ value: a, label: a }))}
          value={search.action ?? null}
          onChange={(v) =>
            void navigate({
              to: '/admin/audit',
              search: { page: 1, action: v ?? undefined },
            })
          }
          w={200}
        />
      </Toolbar>
      <Card>
        {list.isPending ? (
          <PageLoader />
        ) : list.isError ? (
          <ErrorState error={list.error} />
        ) : list.data.items.length === 0 ? (
          <EmptyState message="No entries yet" />
        ) : (
          <>
            <Table.ScrollContainer minWidth={800}>
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>When</Table.Th>
                    <Table.Th>Action</Table.Th>
                    <Table.Th>Actor</Table.Th>
                    <Table.Th>Target</Table.Th>
                    <Table.Th>Details</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {list.data.items.map((e) => (
                    <Table.Tr key={e.id}>
                      <Table.Td title={e.createdAt}>{timeAgo(e.createdAt)}</Table.Td>
                      <Table.Td>
                        <Code>{e.action}</Code>
                      </Table.Td>
                      <Table.Td>
                        {e.actor ? (
                          <Group gap="xs" wrap="nowrap">
                            <UserAvatar card={e.actor} size="xs" />
                            <Text size="sm">{e.actor.displayName}</Text>
                          </Group>
                        ) : (
                          '—'
                        )}
                      </Table.Td>
                      <Table.Td>
                        {e.targetEmail ?? (e.targetUserId ? `user #${e.targetUserId}` : '—')}
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed" ff="monospace">
                          {Object.entries(e.data)
                            .map(([k, v]) => `${k}=${String(v)}`)
                            .join(' ')}
                          {e.ip ? ` ip=${e.ip}` : ''}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <PaginationBar
              page={page}
              limit={AUDIT_PAGE}
              total={list.data.total}
              onChange={(p) =>
                void navigate({ to: '/admin/audit', search: (prev) => ({ ...prev, page: p }) })
              }
            />
          </>
        )}
      </Card>
    </>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function SettingsPage() {
  usePageTitle('Settings');
  const settings = useQuery(settingsQuery);
  if (settings.isPending) return <PageLoader />;
  if (settings.isError) return <ErrorState error={settings.error} />;
  return (
    <>
      <Toolbar title="Settings" />
      <SettingsForm key={settings.data.registrationMode} current={settings.data.registrationMode} />
    </>
  );
}

/** Keyed on the saved value so a fresh fetch resets the draft without an effect. */
function SettingsForm({ current }: { current: RegistrationMode }) {
  const save = useSaveSettings();
  const [mode, setMode] = useState<RegistrationMode>(current);
  return (
    <Card>
      <Stack>
        <Text fw={600}>Registration mode</Text>
        <SegmentedControl
          value={mode}
          onChange={(v) => {
            setMode(v);
          }}
          data={[
            { value: 'open', label: 'Open — anyone can sign up (e-mail verification required)' },
            { value: 'invite_only', label: 'Invite-only — accounts need an invitation link' },
          ]}
          orientation="vertical"
          fullWidth
        />
        <Group justify="flex-end">
          <Button
            loading={save.isPending}
            disabled={mode === current}
            onClick={() => {
              save.mutate(
                { registrationMode: mode },
                {
                  onSuccess: () => {
                    toast.success('Settings saved');
                  },
                  onError: (e) => {
                    toast.error(e);
                  },
                },
              );
            }}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

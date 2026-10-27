import type {
  AdminStats,
  AdminUser,
  AdminUsersQuery,
  AdminUserUpdateInput,
  AuditEntryDto,
  AuditQuery,
  CatalogItem,
  CatalogItemInput,
  CatalogKind,
  InvitationCreateInput,
  InvitationDto,
  Paginated,
  SettingsDto,
} from '@devconnector/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { authKeys } from '../auth/api.ts';
import { profileKeys } from '../profiles/api.ts';

export type UsersFilters = Partial<Pick<AdminUsersQuery, 'page' | 'q' | 'role' | 'status'>>;
export type AuditFilters = Partial<Pick<AuditQuery, 'page' | 'action' | 'userId'>>;

const adminKeys = {
  all: ['admin'] as const,
  stats: ['admin', 'stats'] as const,
  users: (filters: UsersFilters) => ['admin', 'users', filters] as const,
  user: (id: number) => ['admin', 'user', id] as const,
  invitations: ['admin', 'invitations'] as const,
  settings: ['admin', 'settings'] as const,
  audit: (filters: AuditFilters) => ['admin', 'audit', filters] as const,
};

export const statsQuery = queryOptions({
  queryKey: adminKeys.stats,
  queryFn: () => api.get<AdminStats>('/admin/stats'),
});

export const usersQuery = (filters: UsersFilters) =>
  queryOptions({
    queryKey: adminKeys.users(filters),
    queryFn: () => api.get<Paginated<AdminUser>>('/admin/users', { query: filters }),
    placeholderData: (previous) => previous,
  });

export const userQuery = (id: number) =>
  queryOptions({
    queryKey: adminKeys.user(id),
    queryFn: () => api.get<AdminUser>(`/admin/users/${id}`),
  });

export const invitationsQuery = queryOptions({
  queryKey: adminKeys.invitations,
  queryFn: () => api.get<InvitationDto[]>('/admin/invitations'),
});

export const settingsQuery = queryOptions({
  queryKey: adminKeys.settings,
  queryFn: () => api.get<SettingsDto>('/admin/settings'),
});

export const auditQuery = (filters: AuditFilters) =>
  queryOptions({
    queryKey: adminKeys.audit(filters),
    queryFn: () => api.get<Paginated<AuditEntryDto>>('/admin/audit', { query: filters }),
    placeholderData: (previous) => previous,
  });

function useAdminInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.all });
}

export function useUpdateUser() {
  const invalidate = useAdminInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AdminUserUpdateInput }) =>
      api.patch<AdminUser>(`/admin/users/${id}`, { body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useAdminInvalidation();
  return useMutation({
    mutationFn: (id: number) => api.delete<undefined>(`/admin/users/${id}`),
    onSuccess: invalidate,
  });
}

export function useCreateInvitation() {
  const invalidate = useAdminInvalidation();
  return useMutation({
    mutationFn: (input: InvitationCreateInput) =>
      api.post<InvitationDto>('/admin/invitations', { body: input }),
    onSuccess: invalidate,
  });
}

export function useRevokeInvitation() {
  const invalidate = useAdminInvalidation();
  return useMutation({
    mutationFn: (id: number) => api.delete<undefined>(`/admin/invitations/${id}`),
    onSuccess: invalidate,
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SettingsDto) => api.put<SettingsDto>('/admin/settings', { body: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({ queryKey: authKeys.config }),
      ]),
  });
}

export function useCatalogMutations(kind: CatalogKind) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: profileKeys.catalog }),
      queryClient.invalidateQueries({ queryKey: adminKeys.all }),
    ]);
  return {
    create: useMutation({
      mutationFn: (input: CatalogItemInput) =>
        api.post<CatalogItem>(`/admin/catalog/${kind}`, { body: input }),
      onSuccess: refresh,
    }),
    rename: useMutation({
      mutationFn: ({ value, label }: { value: string; label: string }) =>
        api.patch<CatalogItem>(`/admin/catalog/${kind}/${encodeURIComponent(value)}`, {
          body: { label },
        }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (value: string) =>
        api.delete<undefined>(`/admin/catalog/${kind}/${encodeURIComponent(value)}`),
      onSuccess: refresh,
    }),
  };
}

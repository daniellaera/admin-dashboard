import type {
  CursorPage,
  NotificationDto,
  NotificationPreferenceDto,
  NotificationPreferenceInput,
  UnreadCount,
} from '@devconnector/shared';
import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

export const notificationsQuery = infiniteQueryOptions({
  queryKey: notificationKeys.list,
  queryFn: ({ pageParam }) =>
    api.get<CursorPage<NotificationDto>>('/notifications', {
      query: { cursor: pageParam, limit: 20 },
    }),
  initialPageParam: undefined as number | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});

export const unreadCountQuery = queryOptions({
  queryKey: notificationKeys.unread,
  queryFn: () => api.get<UnreadCount>('/notifications/unread-count'),
  staleTime: 30_000,
});

export const preferencesQuery = queryOptions({
  queryKey: notificationKeys.preferences,
  queryFn: () => api.get<NotificationPreferenceDto[]>('/notifications/preferences'),
});

function useNotificationInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkRead() {
  const invalidate = useNotificationInvalidation();
  return useMutation({
    mutationFn: (id: number) => api.post<undefined>(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });
}

export function useMarkAllRead() {
  const invalidate = useNotificationInvalidation();
  return useMutation({
    mutationFn: () => api.post<undefined>('/notifications/read-all'),
    onSuccess: invalidate,
  });
}

export function useDeleteNotification() {
  const invalidate = useNotificationInvalidation();
  return useMutation({
    mutationFn: (id: number) => api.delete<undefined>(`/notifications/${id}`),
    onSuccess: invalidate,
  });
}

export function useSavePreferences() {
  const invalidate = useNotificationInvalidation();
  return useMutation({
    mutationFn: (preferences: NotificationPreferenceInput[]) =>
      api.put<NotificationPreferenceDto[]>('/notifications/preferences', { body: { preferences } }),
    onSuccess: invalidate,
  });
}

import type { SseEvent } from '@devconnector/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { notificationKeys } from '@/features/notifications/api.ts';
import { postKeys } from '@/features/posts/api.ts';
import { API_BASE } from './api.ts';

export interface LiveEventsOptions {
  /** Also subscribe to one post's comment events. */
  postId?: number | undefined;
  /** Called for every event after the cache invalidation. */
  onEvent?: ((event: SseEvent) => void) | undefined;
  enabled?: boolean | undefined;
}

const EVENT_TYPES: SseEvent['type'][] = [
  'post.published',
  'post.deleted',
  'comment.created',
  'notification.created',
  'notification.read',
  'ping',
];

/**
 * Opens the server-sent events stream and keeps TanStack Query caches fresh (ADR-006):
 * events carry ids only, the UI refetches what changed. Reconnection is the browser's.
 */
export function useLiveEvents({ postId, onEvent, enabled = true }: LiveEventsOptions = {}): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return;
    const url = `${API_BASE}/events${postId ? `?post=${postId}` : ''}`;
    const source = new EventSource(url, { withCredentials: true });
    const handle = (raw: MessageEvent<string>) => {
      let event: SseEvent;
      try {
        event = JSON.parse(raw.data) as SseEvent;
      } catch {
        return;
      }
      switch (event.type) {
        case 'post.published':
        case 'post.deleted':
          void queryClient.invalidateQueries({ queryKey: postKeys.all });
          break;
        case 'comment.created':
          void queryClient.invalidateQueries({ queryKey: postKeys.comments(event.postId) });
          void queryClient.invalidateQueries({ queryKey: postKeys.detail(event.postId) });
          break;
        case 'notification.created':
        case 'notification.read':
          queryClient.setQueryData(notificationKeys.unread, { unread: event.unread });
          void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
          break;
        case 'ping':
          break;
      }
      onEvent?.(event);
    };
    for (const type of EVENT_TYPES) source.addEventListener(type, handle as EventListener);
    return () => {
      for (const type of EVENT_TYPES) source.removeEventListener(type, handle as EventListener);
      source.close();
    };
  }, [enabled, postId, onEvent, queryClient]);
}

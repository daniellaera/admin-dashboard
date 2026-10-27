import type { SseEvent } from '@devconnector/shared';

/**
 * Application events. `channel` decides who receives them over SSE:
 * `posts` (everyone), `post:<id>` (viewers of a post), `user:<id>` (one signed-in user).
 */
export interface AppEvent {
  channel: string;
  event: SseEvent;
}

export type EventListener = (event: AppEvent) => void;

export interface EventBus {
  publish(event: AppEvent): Promise<void>;
  subscribe(listener: EventListener): () => void;
}

/** In-process bus; the Postgres LISTEN/NOTIFY implementation (ADR-006) shares this interface. */
export function createMemoryEventBus(): EventBus {
  const listeners = new Set<EventListener>();
  return {
    publish(event) {
      for (const listener of listeners) listener(event);
      return Promise.resolve();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

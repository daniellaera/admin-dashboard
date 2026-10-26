import type { CursorPage, Paginated } from '@devconnector/shared';

export function offsetOf(query: { page: number; limit: number }): number {
  return (query.page - 1) * query.limit;
}

export function paginated<T>(
  items: T[],
  query: { page: number; limit: number },
  total: number,
): Paginated<T> {
  return { items, page: query.page, limit: query.limit, total };
}

/**
 * Keyset page: fetch `limit + 1` rows ordered by id desc, hand back `limit` of them and the
 * id to continue from (the smallest returned id) when more exist.
 */
export function cursorPage<T extends { id: number }>(rows: T[], limit: number): CursorPage<T> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return { items, nextCursor: rows.length > limit && last ? last.id : null };
}

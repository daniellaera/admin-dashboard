import { Group, Pagination, Text } from '@mantine/core';

/** `1–5 of 11` with page controls (server-side pagination). */
export function PaginationBar({
  page,
  limit,
  total,
  onChange,
}: {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <Group justify="space-between" mt="md" wrap="wrap">
      <Text size="sm" c="dimmed">
        {from}–{to} of {total}
      </Text>
      <Pagination value={page} onChange={onChange} total={pages} size="sm" withEdges={pages > 5} />
    </Group>
  );
}

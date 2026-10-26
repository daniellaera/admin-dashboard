import { labelOf, POST_TYPE_OPTIONS, type PostType } from '@devconnector/shared';
import { Button, Container, Group, Select, Stack, Title, Transition } from '@mantine/core';
import { IconArrowDown } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { PaginationBar } from '@/components/PaginationBar.tsx';
import { EmptyState, ErrorState, PageLoader, usePageTitle } from '@/components/States.tsx';
import { catalogQuery } from '@/features/profiles/api.ts';
import { useLiveEvents } from '@/lib/sse.ts';
import { feedQuery } from './api.ts';
import { PostCard } from './PostCard.tsx';

export interface FeedSearch {
  page?: number | undefined;
  type?: PostType | undefined;
  tag?: string | undefined;
}

const PAGE_SIZE = 5;

export function FeedPage({ search }: { search: FeedSearch }) {
  usePageTitle('Posts');
  const navigate = useNavigate();
  const page = search.page ?? 1;
  const query = useQuery(feedQuery({ page, limit: PAGE_SIZE, type: search.type, tag: search.tag }));
  const catalog = useQuery(catalogQuery);
  const [fresh, setFresh] = useState(false);

  // "New posts" chip (parity with the Socket.IO banner): shown when a post is published while
  // the visitor is not on the first page; the first page refreshes by itself.
  useLiveEvents({
    onEvent: useCallback(
      (event: { type: string }) => {
        if (event.type === 'post.published' && page !== 1) setFresh(true);
      },
      [page],
    ),
  });

  const setSearch = (patch: Partial<FeedSearch>) =>
    void navigate({ to: '/posts', search: (prev) => ({ ...prev, page: 1, ...patch }) });

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Title order={1} size="h2">
            Posts
          </Title>
          <Group>
            <Select
              aria-label="Filter by type"
              placeholder="All types"
              clearable
              data={POST_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={search.type ?? null}
              onChange={(v) => {
                setSearch({ type: v ?? undefined });
              }}
              w={160}
            />
            <Select
              aria-label="Filter by tag"
              placeholder="All tags"
              clearable
              searchable
              data={(catalog.data?.tags ?? []).map((t) => ({ value: t.value, label: t.label }))}
              value={search.tag ?? null}
              onChange={(v) => {
                setSearch({ tag: v ?? undefined });
              }}
              w={180}
            />
          </Group>
        </Group>

        <Transition mounted={fresh} transition="scale-y">
          {(styles) => (
            <Group justify="center" style={styles}>
              <Button
                radius="xl"
                rightSection={<IconArrowDown size={16} />}
                onClick={() => {
                  setFresh(false);
                  setSearch({ page: 1 });
                }}
              >
                New posts
              </Button>
            </Group>
          )}
        </Transition>

        {query.isPending ? (
          <PageLoader />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState message="Posts will show up here!" />
        ) : (
          <>
            <Stack gap="lg">
              {query.data.items.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </Stack>
            <PaginationBar
              page={page}
              limit={PAGE_SIZE}
              total={query.data.total}
              onChange={(p) =>
                void navigate({ to: '/posts', search: (prev) => ({ ...prev, page: p }) })
              }
            />
          </>
        )}
        {search.tag && catalog.data && (
          <Button
            variant="subtle"
            size="xs"
            onClick={() => {
              setSearch({ tag: undefined });
            }}
          >
            Clear tag “{labelOf(catalog.data.tags, search.tag)}”
          </Button>
        )}
      </Stack>
    </Container>
  );
}

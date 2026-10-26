import {
  commentCreateSchema,
  type CommentCreateInput,
  type CommentDto,
} from '@devconnector/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActionIcon,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { AuthorLine } from '@/components/AuthorLine.tsx';
import { EmptyState, ErrorState, PageLoader, usePageTitle } from '@/components/States.tsx';
import { useMe } from '@/features/auth/api.ts';
import { isApiError } from '@/lib/api.ts';
import { toast } from '@/lib/notify.ts';
import { useLiveEvents } from '@/lib/sse.ts';
import { commentsQuery, postQuery, useAddComment, useDeleteComment } from './api.ts';
import { LikeButton, TagChips, TypeBadge } from './PostCard.tsx';

export function PostPage({ postId }: { postId: number }) {
  const post = useQuery(postQuery(postId));
  const me = useMe();
  usePageTitle(post.data?.title ?? 'Post');
  useLiveEvents({ postId });

  if (post.isPending) return <PageLoader />;
  if (post.isError) {
    return (
      <Container size="md" py="xl">
        {isApiError(post.error, 404) ? (
          <EmptyState message="This post does not exist (or is not published)." />
        ) : (
          <ErrorState error={post.error} onRetry={() => void post.refetch()} />
        )}
      </Container>
    );
  }
  const data = post.data;
  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1} size="h2">
            Post {data.id}
          </Title>
          <Button
            component={Link}
            to="/posts"
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back
          </Button>
        </Group>
        <Card component="article">
          <Stack gap="sm">
            <Group gap="sm">
              <Title order={2} size="h3">
                {data.title}
              </Title>
              <TypeBadge type={data.type} />
            </Group>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{data.content}</Text>
            <AuthorLine author={data.author} date={data.createdAt} />
            <TagChips tags={data.tags} />
            <Group>
              <LikeButton post={data} />
              <Text size="sm" c="dimmed">
                {data.commentCount} comment{data.commentCount === 1 ? '' : 's'}
              </Text>
            </Group>
          </Stack>
        </Card>
        <Divider />
        {me.data ? (
          <CommentForm postId={postId} />
        ) : (
          <EmptyState message="You need to login to comment the post" />
        )}
        <Comments postId={postId} />
      </Stack>
    </Container>
  );
}

function CommentForm({ postId }: { postId: number }) {
  const add = useAddComment(postId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CommentCreateInput>({
    resolver: zodResolver(commentCreateSchema),
    mode: 'onChange',
  });
  return (
    <form
      onSubmit={handleSubmit((v) => {
        add.mutate(v.body, {
          onSuccess: () => {
            reset();
            toast.success(
              `${v.body.length > 40 ? `${v.body.slice(0, 40)}…` : v.body} has been added`,
            );
          },
          onError: (e) => {
            toast.error(e);
          },
        });
      })}
      noValidate
    >
      <Group align="flex-start" wrap="nowrap">
        <TextInput
          aria-label="Your comment"
          placeholder="write your comment here"
          radius="xl"
          style={{ flex: 1 }}
          error={errors.body?.message}
          {...register('body')}
        />
        <Button type="submit" radius="xl" loading={add.isPending} disabled={!isValid}>
          Add
        </Button>
      </Group>
    </form>
  );
}

function Comments({ postId }: { postId: number }) {
  const comments = useInfiniteQuery(commentsQuery(postId));
  const remove = useDeleteComment();
  if (comments.isPending) return <PageLoader />;
  if (comments.isError)
    return <ErrorState error={comments.error} onRetry={() => void comments.refetch()} />;
  const items = comments.data.pages.flatMap((p) => p.items);
  if (items.length === 0) return <EmptyState message="No comments yet. Be the first!" />;

  const confirmDelete = (c: CommentDto) =>
    modals.openConfirmModal({
      title: 'Delete comment',
      children: <Text size="sm">Are you sure? You can't undo this action afterwards.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        remove.mutate(c.id, {
          onSuccess: () => {
            toast.success('Comment removed');
          },
          onError: (e) => {
            toast.error(e);
          },
        });
      },
    });

  return (
    <Stack>
      {items.map((c) => (
        <Paper key={c.id} withBorder radius="md" p="md" component="article">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{c.body}</Text>
              <AuthorLine author={c.author} date={c.createdAt} />
            </Stack>
            {c.canDelete && (
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label="Delete comment"
                onClick={() => confirmDelete(c)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            )}
          </Group>
        </Paper>
      ))}
      {comments.hasNextPage && (
        <Button
          variant="default"
          onClick={() => void comments.fetchNextPage()}
          loading={comments.isFetchingNextPage}
        >
          Load more comments
        </Button>
      )}
    </Stack>
  );
}

import {
  POST_TYPE_OPTIONS,
  postCreateSchema,
  type PostCreateInput,
  type PostDetail,
} from '@devconnector/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  MultiSelect,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconArrowLeft, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { applyServerErrors, FormError } from '@/components/FormError.tsx';
import { ActionIconLink, ButtonLink } from '@/components/links.tsx';
import { PaginationBar } from '@/components/PaginationBar.tsx';
import { EmptyState, ErrorState, PageLoader, usePageTitle } from '@/components/States.tsx';
import { Toolbar } from '@/features/admin/common.tsx';
import { catalogQuery } from '@/features/profiles/api.ts';
import { truncate } from '@/lib/format.ts';
import { toast } from '@/lib/notify.ts';
import { myPostsQuery, postQuery, useCreatePost, useDeletePost, useUpdatePost } from './api.ts';
import { TypeBadge } from './PostCard.tsx';

const PAGE_SIZE = 5;

export function MyPostsPage({ page }: { page: number }) {
  usePageTitle('My posts');
  const navigate = useNavigate();
  const posts = useQuery(myPostsQuery({ page, limit: PAGE_SIZE }));
  const remove = useDeletePost();
  const confirmDelete = (post: PostDetail) =>
    modals.openConfirmModal({
      title: 'Delete Post',
      children: <Text size="sm">Are you sure? You can't undo this action afterwards.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        remove.mutate(post.id, {
          onSuccess: () => {
            toast.success(`Post ${post.id} has been removed`);
          },
          onError: (e) => {
            toast.error(e);
          },
        });
      },
    });
  return (
    <>
      <Toolbar title="Posts">
        <ButtonLink to="/admin/posts/new" leftSection={<IconPlus size={16} />}>
          Add Post
        </ButtonLink>
      </Toolbar>
      <Card>
        <Text fw={600} mb="sm">
          Posts table
        </Text>
        {posts.isPending ? (
          <PageLoader />
        ) : posts.isError ? (
          <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
        ) : posts.data.items.length === 0 ? (
          <EmptyState message="Posts will show up here!" />
        ) : (
          <>
            <Table.ScrollContainer minWidth={640}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Content</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Likes</Table.Th>
                    <Table.Th>Comments</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {posts.data.items.map((p) => (
                    <Table.Tr key={p.id}>
                      <Table.Td fw={500}>{truncate(p.title, 40)}</Table.Td>
                      <Table.Td>{truncate(p.content, 60)}</Table.Td>
                      <Table.Td>
                        <TypeBadge type={p.type} />
                      </Table.Td>
                      <Table.Td>
                        {p.published ? (
                          <Badge color="green">Public</Badge>
                        ) : (
                          <Badge color="gray">Private</Badge>
                        )}
                      </Table.Td>
                      <Table.Td>{p.likeCount}</Table.Td>
                      <Table.Td>{p.commentCount}</Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <ActionIconLink
                            to="/admin/posts/$postId"
                            params={{ postId: String(p.id) }}
                            variant="subtle"
                            aria-label={`Edit post ${p.id}`}
                          >
                            <IconPencil size={16} />
                          </ActionIconLink>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label={`Delete post ${p.id}`}
                            onClick={() => confirmDelete(p)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <PaginationBar
              page={page}
              limit={PAGE_SIZE}
              total={posts.data.total}
              onChange={(p) => void navigate({ to: '/admin/posts', search: { page: p } })}
            />
          </>
        )}
      </Card>
    </>
  );
}

export function PostFormPage({ postId }: { postId?: number | undefined }) {
  const isUpdate = postId !== undefined;
  usePageTitle(isUpdate ? `Update post ${postId}` : 'Add post');
  const existing = useQuery({ ...postQuery(postId ?? 0), enabled: isUpdate });
  if (isUpdate && existing.isPending) return <PageLoader />;
  if (isUpdate && existing.isError)
    return <ErrorState error={existing.error} onRetry={() => void existing.refetch()} />;
  return (
    <>
      <Toolbar title={isUpdate ? `Update post ${postId}` : 'Add post'}>
        <ButtonLink to="/admin/posts" variant="default" leftSection={<IconArrowLeft size={16} />}>
          Back
        </ButtonLink>
      </Toolbar>
      <Card>
        <Text fw={600} mb="md">
          Post form
        </Text>
        <PostForm initial={isUpdate ? existing.data : undefined} />
      </Card>
    </>
  );
}

function PostForm({ initial }: { initial?: PostDetail | undefined }) {
  const navigate = useNavigate();
  const create = useCreatePost();
  const update = useUpdatePost(initial?.id ?? 0);
  const catalog = useQuery(catalogQuery);
  const [general, setGeneral] = useState<string | null>(null);
  const toValues = (p?: PostDetail): PostCreateInput =>
    p
      ? { title: p.title, content: p.content, type: p.type, published: p.published, tags: p.tags }
      : { title: '', content: '', type: 'FUNNY', published: false, tags: [] };
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<PostCreateInput>({
    resolver: zodResolver(postCreateSchema),
    defaultValues: toValues(initial),
  });
  useEffect(() => {
    reset(toValues(initial));
  }, [initial, reset]);

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setGeneral(null);
        const fail = (e: unknown) => {
          setGeneral(
            applyServerErrors(e, setError, ['title', 'content', 'type', 'published', 'tags']),
          );
        };
        if (initial) {
          update.mutate(values, {
            onSuccess: (p) => {
              toast.success(`${p.title} has been updated`);
            },
            onError: fail,
          });
        } else {
          create.mutate(values, {
            onSuccess: () => {
              toast.success('post has been added');
              void navigate({ to: '/admin/posts' });
            },
            onError: fail,
          });
        }
      })}
      noValidate
    >
      <Stack>
        <TextInput
          label="Title"
          placeholder="title"
          error={errors.title?.message}
          {...register('title')}
        />
        <Textarea
          label="Content"
          placeholder="content"
          autosize
          minRows={6}
          error={errors.content?.message}
          {...register('content')}
        />
        <Checkbox label="Tick the box to make the post public" {...register('published')} />
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              label="Type"
              data={POST_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={field.value}
              onChange={(v) => {
                field.onChange(v ?? 'FUNNY');
              }}
              error={errors.type?.message}
              allowDeselect={false}
            />
          )}
        />
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <MultiSelect
              label="Tags"
              placeholder="Pick post tags"
              searchable
              maxValues={5}
              data={(catalog.data?.tags ?? []).map((t) => ({ value: t.value, label: t.label }))}
              value={field.value}
              onChange={field.onChange}
              error={errors.tags?.message}
            />
          )}
        />
        <FormError message={general} />
        <Group justify="flex-end">
          <Button
            type="submit"
            loading={create.isPending || update.isPending}
            disabled={initial ? !isDirty : false}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

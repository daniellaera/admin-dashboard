import { labelOf, POST_TYPE_OPTIONS, type PostSummary } from '@devconnector/shared';
import { ActionIcon, Badge, Card, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconMessageCircle, IconThumbUp, IconThumbUpFilled } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AuthorLine } from '@/components/AuthorLine.tsx';
import { ActionIconLink, AnchorLink } from '@/components/links.tsx';
import { useMe } from '@/features/auth/api.ts';
import { catalogQuery } from '@/features/profiles/api.ts';
import { colorFor, truncate } from '@/lib/format.ts';
import { toast } from '@/lib/notify.ts';
import { useToggleLike } from './api.ts';

export function TypeBadge({ type }: { type: PostSummary['type'] }) {
  return (
    <Badge color={colorFor(type)} variant="light">
      {labelOf(POST_TYPE_OPTIONS, type)}
    </Badge>
  );
}

export function TagChips({ tags }: { tags: string[] }) {
  const catalog = useQuery(catalogQuery);
  if (tags.length === 0) return null;
  return (
    <Group gap={6}>
      {tags.map((tag) => (
        <Badge key={tag} size="sm" variant="outline" color={colorFor(tag)}>
          {catalog.data ? labelOf(catalog.data.tags, tag) : tag}
        </Badge>
      ))}
    </Group>
  );
}

export function LikeButton({
  post,
}: {
  post: Pick<PostSummary, 'id' | 'likeCount' | 'likedByMe'>;
}) {
  const me = useMe();
  const toggle = useToggleLike();
  const signedIn = Boolean(me.data);
  return (
    <Tooltip
      label={signedIn ? 'Smash the like button!' : 'You must be logged in to like the post'}
      withArrow
    >
      <Group gap={4} wrap="nowrap">
        <ActionIcon
          variant="subtle"
          color={post.likedByMe ? 'blue' : 'gray'}
          aria-label={post.likedByMe ? 'Unlike this post' : 'Like this post'}
          aria-pressed={post.likedByMe}
          disabled={!signedIn || toggle.isPending}
          onClick={() => {
            toggle.mutate(
              { postId: post.id, liked: post.likedByMe },
              {
                onSuccess: (r) => {
                  if (!post.likedByMe && r.likedByMe) toast.success('Post liked');
                },
                onError: (e) => {
                  toast.error(e);
                },
              },
            );
          }}
        >
          {post.likedByMe ? <IconThumbUpFilled size={18} /> : <IconThumbUp size={18} />}
        </ActionIcon>
        <Text size="sm" c="dimmed" aria-label={`${post.likeCount} likes`}>
          {post.likeCount}
        </Text>
      </Group>
    </Tooltip>
  );
}

/** A post in the public feed: title + type badge, excerpt, author line, tags, like and comment counters. */
export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Card component="article" aria-labelledby={`post-${post.id}-title`}>
      <Stack gap="sm">
        <Group gap="sm" align="center">
          <AnchorLink
            to="/posts/$postId"
            params={{ postId: String(post.id) }}
            fw={700}
            size="xl"
            c="inherit"
            id={`post-${post.id}-title`}
          >
            {post.title}
          </AnchorLink>
          <TypeBadge type={post.type} />
        </Group>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{truncate(post.content, 400)}</Text>
        <AuthorLine author={post.author} date={post.createdAt} />
        <TagChips tags={post.tags} />
        <Group gap="md">
          <LikeButton post={post} />
          <Group gap={4} wrap="nowrap">
            <ActionIconLink
              to="/posts/$postId"
              params={{ postId: String(post.id) }}
              variant="subtle"
              color="gray"
              aria-label={`Open comments of ${post.title}`}
            >
              <IconMessageCircle size={18} />
            </ActionIconLink>
            <Text size="sm" c="dimmed">
              {post.commentCount}
            </Text>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}

import type {
  CommentDto,
  CursorPage,
  Paginated,
  PostCreateInput,
  PostDetail,
  PostsQuery,
  PostSummary,
  PostUpdateInput,
} from '@devconnector/shared';
import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export type FeedFilters = Partial<Pick<PostsQuery, 'page' | 'limit' | 'type' | 'tag'>>;

export const postKeys = {
  all: ['posts'] as const,
  feed: (filters: FeedFilters) => ['posts', 'feed', filters] as const,
  mine: (filters: FeedFilters) => ['posts', 'mine', filters] as const,
  detail: (id: number) => ['posts', 'detail', id] as const,
  comments: (postId: number) => ['posts', 'detail', postId, 'comments'] as const,
};

export const feedQuery = (filters: FeedFilters) =>
  queryOptions({
    queryKey: postKeys.feed(filters),
    queryFn: () => api.get<Paginated<PostSummary>>('/posts', { query: filters }),
    placeholderData: (previous) => previous,
  });

export const myPostsQuery = (filters: FeedFilters) =>
  queryOptions({
    queryKey: postKeys.mine(filters),
    queryFn: () => api.get<Paginated<PostSummary>>('/me/posts', { query: filters }),
    placeholderData: (previous) => previous,
  });

export const postQuery = (id: number) =>
  queryOptions({
    queryKey: postKeys.detail(id),
    queryFn: () => api.get<PostDetail>(`/posts/${id}`),
  });

export const commentsQuery = (postId: number) =>
  infiniteQueryOptions({
    queryKey: postKeys.comments(postId),
    queryFn: ({ pageParam }) =>
      api.get<CursorPage<CommentDto>>(`/posts/${postId}/comments`, {
        query: { cursor: pageParam, limit: 20 },
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PostCreateInput) => api.post<PostDetail>('/posts', { body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}

export function useUpdatePost(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PostUpdateInput) => api.patch<PostDetail>(`/posts/${id}`, { body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<undefined>(`/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, liked }: { postId: number; liked: boolean }) =>
      liked
        ? api.delete<{ likeCount: number; likedByMe: boolean }>(`/posts/${postId}/like`)
        : api.put<{ likeCount: number; likedByMe: boolean }>(`/posts/${postId}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}

export function useAddComment(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post<CommentDto>(`/posts/${postId}/comments`, { body: { body } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<undefined>(`/comments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}

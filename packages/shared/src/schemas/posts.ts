import { z } from 'zod';
import { LIMITS, POST_TYPES } from '../constants.ts';
import { catalogValueSchema, cursorQuerySchema, pageQuerySchema } from './common.ts';

export const postCreateSchema = z.strictObject({
  title: z.string().trim().min(1, { error: 'Title is required' }).max(LIMITS.postTitle),
  content: z.string().trim().min(1, { error: 'Content is required' }).max(LIMITS.postContent),
  type: z.enum(POST_TYPES),
  published: z.boolean(),
  /** Values must exist in the tags catalog (checked by the API). */
  tags: z.array(catalogValueSchema).max(LIMITS.tagsMax, {
    error: `Pick at most ${LIMITS.tagsMax} tags`,
  }),
});
export type PostCreateInput = z.infer<typeof postCreateSchema>;

/** PATCH /posts/:id — partial, still strict. */
export const postUpdateSchema = postCreateSchema.partial();
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;

/** GET /posts?page&limit&type&tag (published feed) and GET /me/posts. */
export const postsQuerySchema = pageQuerySchema.extend({
  type: z.enum(POST_TYPES).optional(),
  tag: catalogValueSchema.optional(),
});
export type PostsQuery = z.infer<typeof postsQuerySchema>;

export const commentCreateSchema = z.strictObject({
  body: z.string().trim().min(1, { error: 'Write something first' }).max(LIMITS.comment),
});
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;

export const commentsQuerySchema = cursorQuerySchema;
export type CommentsQuery = z.infer<typeof commentsQuerySchema>;

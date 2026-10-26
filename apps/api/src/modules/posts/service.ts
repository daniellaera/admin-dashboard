import type {
  CommentDto,
  CommentsQuery,
  PostCreateInput,
  PostDetail,
  PostsQuery,
  PostSummary,
  PostUpdateInput,
} from '@devconnector/shared';
import { and, desc, eq, isNull, lt, type SQL, sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { Db } from '../../db/client.ts';
import { comments, likes, posts, profiles, users } from '../../db/schema.ts';
import type { EventBus } from '../../lib/events.ts';
import { ForbiddenError, NotFoundError } from '../../lib/errors.ts';
import { cursorPage, offsetOf, paginated } from '../../lib/pagination.ts';
import { isModerator } from '../auth/middleware.ts';
import type { CurrentUser } from '../auth/session.ts';
import type { CatalogService } from '../catalog/service.ts';
import { toAuthorCard } from '../users/mappers.ts';

/** Side effects other modules attach (notifications, batch 6). */
export interface PostHooks {
  commentCreated?(input: {
    postId: number;
    postAuthorId: number;
    commentId: number;
    actorId: number;
    postTitle: string;
  }): Promise<void>;
  likeCreated?(input: {
    postId: number;
    postAuthorId: number;
    actorId: number;
    postTitle: string;
  }): Promise<void>;
  postPublished?(input: { postId: number; authorId: number; title: string }): Promise<void>;
}

export interface PostsDeps {
  db: Db;
  events: EventBus;
  catalog: CatalogService;
  log: Logger;
  hooks?: PostHooks;
}

type Viewer = CurrentUser | undefined;

export function createPostsService({ db, events, catalog, hooks, log }: PostsDeps) {
  const likeCount = sql<number>`(select count(*)::int from ${likes} l where l.post_id = ${posts.id})`;
  const commentCount = sql<number>`(select count(*)::int from ${comments} c where c.post_id = ${posts.id})`;
  const likedBy = (viewer: Viewer): SQL<boolean> =>
    viewer
      ? sql<boolean>`exists(select 1 from ${likes} l where l.post_id = ${posts.id} and l.user_id = ${viewer.id})`
      : sql<boolean>`false`;

  const selection = (viewer: Viewer) => ({
    post: posts,
    authorUsername: profiles.username,
    authorAvatar: profiles.avatarPath,
    likeCount,
    commentCount,
    likedByMe: likedBy(viewer),
  });

  interface Row {
    post: typeof posts.$inferSelect;
    authorUsername: string | null;
    authorAvatar: string | null;
    likeCount: number;
    commentCount: number;
    likedByMe: boolean;
  }

  const toSummary = (r: Row): PostSummary => ({
    id: r.post.id,
    title: r.post.title,
    content: r.post.content,
    type: r.post.type,
    published: r.post.published,
    tags: r.post.tags,
    createdAt: r.post.createdAt.toISOString(),
    updatedAt: r.post.updatedAt.toISOString(),
    author: toAuthorCard(
      { id: r.post.authorId },
      { username: r.authorUsername, avatarPath: r.authorAvatar },
    ),
    likeCount: r.likeCount,
    commentCount: r.commentCount,
    likedByMe: r.likedByMe,
  });

  const baseQuery = (viewer: Viewer) =>
    db
      .select(selection(viewer))
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .leftJoin(profiles, eq(profiles.userId, users.id));

  async function load(id: number, viewer: Viewer): Promise<PostDetail> {
    const [row] = await baseQuery(viewer).where(eq(posts.id, id)).limit(1);
    if (!row) throw new NotFoundError('Post not found');
    const privileged =
      viewer !== undefined && (viewer.id === row.post.authorId || isModerator(viewer));
    if (!row.post.published && !privileged) throw new NotFoundError('Post not found');
    return toSummary(row);
  }

  function canModerate(actor: CurrentUser, ownerId: number): boolean {
    return actor.id === ownerId || isModerator(actor);
  }

  async function count(where: SQL | undefined): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(where);
    return row?.count ?? 0;
  }

  return {
    /** Published posts of active authors, newest first. */
    async listFeed(query: PostsQuery, viewer: Viewer) {
      const where = and(
        eq(posts.published, true),
        isNull(users.disabledAt),
        query.type ? eq(posts.type, query.type) : undefined,
        query.tag ? sql`${query.tag} = any(${posts.tags})` : undefined,
      );
      const rows = await baseQuery(viewer)
        .where(where)
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(query.limit)
        .offset(offsetOf(query));
      return paginated(rows.map(toSummary), query, await count(where));
    },

    /** Every post of one author including drafts (owner's "my posts" table, admin view). */
    async listByAuthor(authorId: number, query: PostsQuery, viewer: Viewer) {
      const where = and(
        eq(posts.authorId, authorId),
        query.type ? eq(posts.type, query.type) : undefined,
        query.tag ? sql`${query.tag} = any(${posts.tags})` : undefined,
      );
      const rows = await baseQuery(viewer)
        .where(where)
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(query.limit)
        .offset(offsetOf(query));
      return paginated(rows.map(toSummary), query, await count(where));
    },

    get: load,

    async create(author: CurrentUser, input: PostCreateInput): Promise<PostDetail> {
      const tags = [...new Set(input.tags)];
      await catalog.assertKnown('tags', 'tags', tags);
      const [row] = await db
        .insert(posts)
        .values({
          authorId: author.id,
          title: input.title,
          content: input.content,
          type: input.type,
          published: input.published,
          publishedAt: input.published ? new Date() : null,
          tags,
        })
        .returning({ id: posts.id });
      if (!row) throw new Error('insert posts returned nothing');
      log.info({ postId: row.id, userId: author.id }, 'post created');
      const post = await load(row.id, author);
      if (post.published) await announcePublished(post, author.id);
      return post;
    },

    async update(id: number, actor: CurrentUser, input: PostUpdateInput): Promise<PostDetail> {
      const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      if (!existing) throw new NotFoundError('Post not found');
      if (!canModerate(actor, existing.authorId))
        throw new ForbiddenError('You can only edit your own posts');
      const patch: Partial<typeof posts.$inferInsert> = {};
      if (input.title !== undefined) patch.title = input.title;
      if (input.content !== undefined) patch.content = input.content;
      if (input.type !== undefined) patch.type = input.type;
      if (input.tags !== undefined) {
        const tags = [...new Set(input.tags)];
        await catalog.assertKnown('tags', 'tags', tags);
        patch.tags = tags;
      }
      if (input.published !== undefined) {
        patch.published = input.published;
        if (input.published && !existing.published) patch.publishedAt = new Date();
      }
      if (Object.keys(patch).length > 0) await db.update(posts).set(patch).where(eq(posts.id, id));
      const post = await load(id, actor);
      if (post.published && !existing.published) await announcePublished(post, existing.authorId);
      if (!post.published && existing.published) {
        await events.publish({ channel: 'posts', event: { type: 'post.deleted', postId: id } });
      }
      return post;
    },

    async remove(id: number, actor: CurrentUser): Promise<void> {
      const [existing] = await db
        .select({ authorId: posts.authorId, published: posts.published })
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);
      if (!existing) throw new NotFoundError('Post not found');
      if (!canModerate(actor, existing.authorId))
        throw new ForbiddenError('You can only delete your own posts');
      await db.delete(posts).where(eq(posts.id, id));
      log.info({ postId: id, userId: actor.id }, 'post deleted');
      if (existing.published) {
        await events.publish({ channel: 'posts', event: { type: 'post.deleted', postId: id } });
      }
    },

    // ── comments ─────────────────────────────────────────────────────────────
    async listComments(postId: number, query: CommentsQuery, viewer: Viewer) {
      const post = await load(postId, viewer); // visibility check
      const rows = await db
        .select({ comment: comments, username: profiles.username, avatarPath: profiles.avatarPath })
        .from(comments)
        .innerJoin(users, eq(users.id, comments.authorId))
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(
          and(
            eq(comments.postId, postId),
            query.cursor ? lt(comments.id, query.cursor) : undefined,
          ),
        )
        .orderBy(desc(comments.id))
        .limit(query.limit + 1);
      const toDto = (r: (typeof rows)[number]): CommentDto => ({
        id: r.comment.id,
        postId: r.comment.postId,
        body: r.comment.body,
        createdAt: r.comment.createdAt.toISOString(),
        author: toAuthorCard(
          { id: r.comment.authorId },
          { username: r.username, avatarPath: r.avatarPath },
        ),
        // The comment's author, the post's author and moderators may delete a comment.
        canDelete:
          viewer !== undefined &&
          (canModerate(viewer, r.comment.authorId) || viewer.id === post.author.id),
      });
      return cursorPage(rows.map(toDto), query.limit);
    },

    async addComment(postId: number, author: CurrentUser, body: string): Promise<CommentDto> {
      const post = await load(postId, author);
      if (!post.published && post.author.id !== author.id)
        throw new NotFoundError('Post not found');
      const [row] = await db
        .insert(comments)
        .values({ postId, authorId: author.id, body })
        .returning();
      if (!row) throw new Error('insert comments returned nothing');
      const [profile] = await db
        .select({ username: profiles.username, avatarPath: profiles.avatarPath })
        .from(profiles)
        .where(eq(profiles.userId, author.id));
      await events.publish({
        channel: `post:${postId}`,
        event: { type: 'comment.created', postId, commentId: row.id },
      });
      await hooks?.commentCreated?.({
        postId,
        postAuthorId: post.author.id,
        commentId: row.id,
        actorId: author.id,
        postTitle: post.title,
      });
      return {
        id: row.id,
        postId,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        author: toAuthorCard({ id: author.id }, profile ?? null),
        canDelete: true,
      };
    },

    async removeComment(commentId: number, actor: CurrentUser): Promise<void> {
      const [existing] = await db
        .select({ authorId: comments.authorId, postAuthorId: posts.authorId })
        .from(comments)
        .innerJoin(posts, eq(posts.id, comments.postId))
        .where(eq(comments.id, commentId))
        .limit(1);
      if (!existing) throw new NotFoundError('Comment not found');
      if (!canModerate(actor, existing.authorId) && actor.id !== existing.postAuthorId)
        throw new ForbiddenError('You can only delete your own comments');
      await db.delete(comments).where(eq(comments.id, commentId));
    },

    // ── likes ────────────────────────────────────────────────────────────────
    async like(postId: number, actor: CurrentUser) {
      const post = await load(postId, actor);
      if (!post.published) throw new NotFoundError('Post not found');
      const inserted = await db
        .insert(likes)
        .values({ postId, userId: actor.id })
        .onConflictDoNothing()
        .returning({ postId: likes.postId });
      if (inserted.length > 0 && post.author.id !== actor.id) {
        await hooks?.likeCreated?.({
          postId,
          postAuthorId: post.author.id,
          actorId: actor.id,
          postTitle: post.title,
        });
      }
      return likeState(postId, actor);
    },

    async unlike(postId: number, actor: CurrentUser) {
      await load(postId, actor);
      await db.delete(likes).where(and(eq(likes.postId, postId), eq(likes.userId, actor.id)));
      return likeState(postId, actor);
    },
  };

  async function likeState(postId: number, viewer: CurrentUser) {
    const [row] = await db
      .select({ likeCount, likedByMe: likedBy(viewer) })
      .from(posts)
      .where(eq(posts.id, postId));
    return { likeCount: row?.likeCount ?? 0, likedByMe: row?.likedByMe ?? false };
  }

  async function announcePublished(post: PostDetail, authorId: number): Promise<void> {
    await events.publish({ channel: 'posts', event: { type: 'post.published', postId: post.id } });
    await hooks?.postPublished?.({ postId: post.id, authorId, title: post.title });
  }
}

export type PostsService = ReturnType<typeof createPostsService>;

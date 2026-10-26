import type { PostSummary } from '@devconnector/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render.tsx';
import { PostCard } from './PostCard.tsx';

const post: PostSummary = {
  id: 7,
  title: 'Hello from the feed',
  content: 'A'.repeat(500),
  type: 'TECH',
  published: true,
  tags: ['react', 'typescript'],
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
  author: { id: 2, displayName: 'ada', avatarUrl: null },
  likeCount: 3,
  commentCount: 2,
  likedByMe: false,
};

describe('PostCard', () => {
  it('links to the post and the author, shows type, counts and a truncated excerpt', async () => {
    renderWithProviders(<PostCard post={post} />);
    expect(await screen.findByRole('link', { name: 'Hello from the feed' })).toHaveAttribute(
      'href',
      '/posts/7',
    );
    expect(screen.getByRole('link', { name: 'ada' })).toHaveAttribute('href', '/developers/2');
    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.getByLabelText('3 likes')).toHaveTextContent('3');
    expect(
      screen.getByRole('link', { name: 'Open comments of Hello from the feed' }),
    ).toHaveAttribute('href', '/posts/7');
    expect(screen.getByText('2')).toBeInTheDocument();
    // The excerpt is cut, never the full content.
    expect(screen.queryByText(post.content)).not.toBeInTheDocument();
    expect(screen.getByText(/^A+…$/)).toBeInTheDocument();
  });

  it('the like button is disabled for anonymous visitors', async () => {
    renderWithProviders(<PostCard post={post} />);
    expect(await screen.findByRole('button', { name: 'Like this post' })).toBeDisabled();
  });
});

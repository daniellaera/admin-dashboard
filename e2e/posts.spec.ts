import { expect, test } from '@playwright/test';
import { login, SEED } from './support/auth.ts';

test.describe.configure({ mode: 'serial' });

const title = `E2E post ${String(Date.now())}`;
let postId = '';

test.describe('posts', () => {
  test('the author creates a public post from the dev area', async ({ page }) => {
    await login(page, SEED.hulk);
    await page.goto('/admin/posts/new');
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Content').fill('Written by the end-to-end suite.');
    await page.getByLabel('Tick the box to make the post public').check();
    await page.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: 'Tech' }).click();
    await page.getByRole('combobox', { name: 'Tags' }).click();
    await page.getByRole('option', { name: 'Engineering' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('post has been added')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/posts$/);
    const row = page.getByRole('row', { name: new RegExp(title) });
    await expect(row).toContainText('Public');
    const href = await row.getByRole('link', { name: /Edit post/ }).getAttribute('href');
    postId = href?.split('/').pop() ?? '';
    expect(postId).toMatch(/^\d+$/);
  });

  test('the author edits it', async ({ page }) => {
    await login(page, SEED.hulk);
    await page.goto(`/admin/posts/${postId}`);
    await expect(page.getByLabel('Title')).toHaveValue(title);
    await page.getByLabel('Title').fill(`${title} (edited)`);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(`${title} (edited) has been updated`)).toBeVisible();
  });

  test('it shows up first in the public feed with its type and tag', async ({ page }) => {
    await page.goto('/posts');
    const first = page.getByRole('article').first();
    // exact: the comments icon is labelled "Open comments of <title>".
    await expect(first.getByRole('link', { name: `${title} (edited)`, exact: true })).toBeVisible();
    await expect(first.getByText('Tech')).toBeVisible();
    await expect(first.getByText('Engineering')).toBeVisible();
    await expect(first.getByRole('link', { name: 'Hulk Green' })).toBeVisible();
  });

  test('another member comments on it and likes it', async ({ page }) => {
    await login(page, SEED.ken);
    await page.goto(`/posts/${postId}`);
    await expect(
      page.getByRole('heading', { name: `${title} (edited)`, exact: true }),
    ).toBeVisible();
    await page.getByLabel('Your comment').fill('Great post!');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Great post!').first()).toBeVisible();
    await expect(page.getByText('No comments yet')).toHaveCount(0);

    await page.getByRole('button', { name: 'Like this post' }).click();
    await expect(page.getByText('Post liked')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unlike this post' })).toBeVisible();
    await expect(page.getByLabel('1 likes')).toBeVisible();
  });

  test('the author sees the counters and deletes the post', async ({ page }) => {
    await login(page, SEED.hulk);
    await page.goto('/admin/posts');
    const row = page.getByRole('row', { name: new RegExp(title) });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: `Delete post ${postId}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(`Post ${postId} has been removed`)).toBeVisible();

    await page.goto(`/posts/${postId}`);
    await expect(page.getByText('This post does not exist (or is not published).')).toBeVisible();
  });
});

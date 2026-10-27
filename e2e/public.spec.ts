import { expect, test } from '@playwright/test';

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/;

test.describe('public site', () => {
  test('home page shows the hero and both calls to action', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Dev Connector');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin');
    await expect(page.getByRole('link', { name: 'Developers' }).first()).toHaveAttribute(
      'href',
      '/developers',
    );
  });

  test('feed paginates published posts; liking needs a session; detail asks to log in', async ({
    page,
  }) => {
    await page.goto('/posts');
    const articles = page.getByRole('article');
    await expect(articles).toHaveCount(5); // 6 seeded posts, 5 per page
    await expect(page.getByRole('button', { name: 'Like this post' }).first()).toBeDisabled();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    // Other specs may leave a post or two behind; the second page is the remainder. The list
    // keeps the previous page as placeholder while loading, hence the polling assertion.
    await expect.poll(() => articles.count()).toBeLessThan(5);
    await expect(articles.first()).toBeVisible();

    await articles.first().getByRole('link').first().click();
    await expect(page).toHaveURL(/\/posts\/\d+$/);
    await expect(page.getByText('You need to login to comment the post')).toBeVisible();
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/posts/);
  });

  test('developers directory and profiles never expose an e-mail address (PRIV-01)', async ({
    page,
    request,
  }) => {
    await page.goto('/developers');
    const card = page.getByRole('link', { name: 'Hulk Green' });
    await expect(card).toBeVisible();
    expect(await page.locator('main, body').first().innerText()).not.toMatch(EMAIL_PATTERN);

    await card.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Hulk Green' })).toBeVisible();
    await expect(page.getByText('Developer', { exact: true })).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(EMAIL_PATTERN);

    const id = page.url().split('/').pop();
    for (const path of ['/api/v1/profiles', `/api/v1/profiles/${String(id)}`, '/api/v1/posts']) {
      const res = await request.get(path);
      expect(res.ok(), path).toBeTruthy();
      expect(await res.text(), path).not.toMatch(EMAIL_PATTERN);
    }
  });

  test('the dev area redirects anonymous visitors to sign-in; unknown URLs get the 404 page', async ({
    page,
  }) => {
    await page.goto('/admin/posts');
    await expect(page).toHaveURL(/\/signin\?redirect=/);
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();

    await page.goto('/this/does/not/exist');
    await expect(page.getByText('Oops')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  test('legal pages and the cookie notice are reachable and truthful', async ({ page }) => {
    await page.goto('/');
    const notice = page.getByRole('region', { name: 'Cookie notice' });
    await expect(notice).toContainText('single first-party cookie');
    await notice.getByRole('button', { name: 'I agree' }).click();
    await expect(notice).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('region', { name: 'Cookie notice' })).toHaveCount(0);

    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Privacy');
    await page.goto('/terms');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Terms');
  });
});

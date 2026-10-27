import { expect, test } from '@playwright/test';
import { login, SEED } from './support/auth.ts';

const unreadOf = (label: string | null): number =>
  Number(/(\d+) unread/.exec(label ?? '')?.[1] ?? 0);

test.describe('notifications', () => {
  test('a comment notifies the post author live (SSE), lands in the inbox, and preferences save', async ({
    browser,
  }) => {
    const authorContext = await browser.newContext();
    const author = await authorContext.newPage();
    await login(author, SEED.matthew);
    await author.goto('/admin/posts');
    const edit = author
      .getByRole('row', { name: /Join the community chat/ })
      .getByRole('link', { name: /Edit post/ });
    const postId = (await edit.getAttribute('href'))?.split('/').pop() ?? '';
    expect(postId).toMatch(/^\d+$/);

    await author.goto('/admin');
    const bell = author.getByRole('button', { name: /^Notifications/ });
    await expect(bell).toBeVisible();
    const before = unreadOf(await bell.getAttribute('aria-label'));

    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await login(other, SEED.randy);
    await other.goto(`/posts/${postId}`);
    await other.getByLabel('Your comment').fill('Hello from Randy');
    await other.getByRole('button', { name: 'Add' }).click();
    await expect(other.getByText('Hello from Randy').first()).toBeVisible();
    await otherContext.close();

    // No reload: the bell is fed by the SSE stream.
    await expect(bell).toHaveAttribute('aria-label', `Notifications, ${String(before + 1)} unread`);

    await author.goto('/admin/notifications');
    await expect(
      author.getByText('Randy Smith commented on "Join the community chat"').first(),
    ).toBeVisible();
    await author.getByRole('button', { name: 'Mark all read' }).click();
    await expect(author.getByRole('button', { name: 'Mark all read' })).toBeDisabled();
    await expect(author.getByRole('button', { name: /^Notifications/ })).toHaveAttribute(
      'aria-label',
      'Notifications',
    );

    const emailSwitch = author.getByLabel('E-mail: Someone comments on my post');
    await expect(emailSwitch).not.toBeChecked();
    await emailSwitch.check();
    const save = author.getByRole('button', { name: 'Save' });
    await save.click();
    await expect(author.getByText('Preferences saved')).toBeVisible();
    await expect(save).toBeDisabled();
    await author.reload();
    await expect(author.getByLabel('E-mail: Someone comments on my post')).toBeChecked();
    await authorContext.close();
  });
});

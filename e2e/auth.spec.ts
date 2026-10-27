import { expect, test } from '@playwright/test';
import { accountMenu, login, logout, signUp, uniqueEmail } from './support/auth.ts';
import { mailLink } from './support/mailpit.ts';

test.describe.configure({ mode: 'serial' });

const account = { email: uniqueEmail('auth'), password: 'E2e-Password-1!' };

test.describe('account lifecycle', () => {
  test('register → confirmation e-mail → verified and signed in', async ({ page }) => {
    await signUp(page, account);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
  });

  test('a wrong password is rejected; sign-out returns to the public site', async ({ page }) => {
    await page.goto('/signin');
    await page.getByLabel('Email').fill(account.email);
    await page.getByLabel('Password', { exact: true }).fill('definitely-not-it-1');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid e-mail or password');
    await expect(accountMenu(page)).toHaveCount(0);

    await login(page, account);
    await logout(page);
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  });

  test('signed-in visitors are sent away from /signin', async ({ page }) => {
    await login(page, account);
    await page.goto('/signin');
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('forgot password → reset link → the new password works', async ({ page }) => {
    const newPassword = 'E2e-Password-2!';
    await page.goto('/auth/forgot');
    await page.getByLabel('Email').fill(account.email);
    await page.locator('form button[type=submit]').click();
    await expect(page.getByText('Check your e-mail')).toBeVisible();

    await page.goto(await mailLink(account.email, '/auth/reset'));
    await page.getByLabel('New password').fill(newPassword);
    await page.getByLabel('Confirm password').fill(newPassword);
    await page.locator('form button[type=submit]').click();
    await expect(
      page.getByText('Your password has been updated. Sign in with the new one.'),
    ).toBeVisible();

    account.password = newPassword;
    await login(page, account);
  });

  test('a magic link signs in without a password', async ({ page }) => {
    await page.goto('/signin');
    await page.getByRole('tab', { name: 'Magic Link' }).click();
    const email = page.getByLabel('Email');
    await email.fill(account.email);
    await email.press('Tab'); // the form validates on blur
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await expect(page.getByText('Check your e-mail')).toBeVisible();

    await page.goto(await mailLink(account.email, '/auth/magic'));
    await expect(accountMenu(page)).toBeVisible();
  });
});

import { expect, test, type Page } from '@playwright/test';
import { login, logout, signUp, uniqueEmail } from './support/auth.ts';

test.describe.configure({ mode: 'serial' });

const account = { email: uniqueEmail('profile'), password: 'E2e-Profile-1!' };
const profileForm = (page: Page) => page.locator('form').filter({ hasText: 'Edit profile' });

test.describe('profile', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await signUp(page, account);
    await page.close();
  });

  test('profile details are editable and appear in the public directory', async ({ page }) => {
    await login(page, account);
    await page.goto('/admin/profile');
    const form = profileForm(page);
    await form.getByLabel('Username').fill('E2E Tester');
    await form.getByLabel('Company').fill('Playwright Inc');
    await form.getByLabel('Bio').fill('I test things end to end.');
    await form.getByLabel('Programming Languages').click();
    await page.getByRole('option').first().click();
    await page.keyboard.press('Escape');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Your profile has been updated')).toBeVisible();

    await page.goto('/developers');
    const card = page.getByRole('article').filter({ hasText: 'E2E Tester' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Playwright Inc');
    await expect(card).toContainText('I test things end to end.');
  });

  test('experience entries: add, edit, delete', async ({ page }) => {
    await login(page, account);
    await page.goto('/admin/profile');
    await expect(page.getByText('Experiences will show up here!')).toBeVisible();
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();

    let dialog = page.getByRole('dialog', { name: 'Add Experience' });
    await dialog.getByLabel('Title').fill('Engineer');
    await dialog.getByLabel('Description').fill('Built things');
    await dialog.getByLabel('Company').fill('ACME');
    await dialog.getByLabel('Location').fill('Remote');
    await dialog.getByLabel('From').fill('2024-01-15');
    await dialog.getByLabel('To').fill('2025-01-15');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('experience has been added')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Engineer', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    dialog = page.getByRole('dialog', { name: 'Edit Experience' });
    await dialog.getByLabel('Title').fill('Senior Engineer');
    await dialog.getByLabel('Current position?').check();
    await expect(dialog.getByLabel('To')).toBeDisabled();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Experience updated')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Senior Engineer' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Experience removed')).toBeVisible();
    await expect(page.getByText('Experiences will show up here!')).toBeVisible();
  });

  test('a private profile disappears from the directory and comes back', async ({ page }) => {
    await login(page, account);
    await page.goto('/admin/profile');
    const form = profileForm(page);
    await form.getByLabel('Public').uncheck();
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Your profile has been updated')).toBeVisible();
    await page.goto('/developers');
    await expect(page.getByRole('article').filter({ hasText: 'E2E Tester' })).toHaveCount(0);

    await page.goto('/admin/profile');
    await profileForm(page).getByLabel('Public').check();
    await profileForm(page).getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Your profile has been updated')).toBeVisible();
    await page.goto('/developers');
    await expect(page.getByRole('article').filter({ hasText: 'E2E Tester' })).toBeVisible();
  });

  test('the password can be changed and the old one stops working', async ({ page }) => {
    const newPassword = 'E2e-Profile-2!';
    await login(page, account);
    await page.goto('/admin/profile');
    await page.getByRole('tab', { name: 'Password' }).click();
    const form = page.locator('form').filter({ hasText: 'Change password' });
    await form.getByLabel('Current password').fill(account.password);
    await form.getByLabel('New password').fill(newPassword);
    await form.getByLabel('Confirm password').fill(newPassword);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Your password has been updated')).toBeVisible();
    await logout(page);

    await page.goto('/signin');
    await page.getByLabel('Email').fill(account.email);
    await page.getByLabel('Password', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid e-mail or password');
    account.password = newPassword;
    await login(page, account);
  });
});

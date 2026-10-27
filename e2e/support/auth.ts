import { expect, type Page } from '@playwright/test';
import { mailLink } from './mailpit.ts';

export interface Account {
  email: string;
  password: string;
  /** What the UI prints for this user (username, or `Developer #id`). */
  name: string;
}

/** Accounts created by `pnpm db:seed` (apps/api/src/db/seed.ts). */
export const SEED = {
  owner: { email: 'owner@devconnector.local', password: 'Owner1234!', name: 'Owner' },
  admin: { email: 'admin@devconnector.local', password: 'Admin1234!', name: 'Admin' },
  hulk: { email: 'hulk@marvel.com', password: 'Password123!', name: 'Hulk Green' },
  matthew: { email: 'matthewlaing@gmail.com', password: 'Password123!', name: 'Matthew Laing' },
  ken: { email: 'ken@jimmy.io', password: 'Password123!', name: 'Ken Jimmy' },
  randy: { email: 'randysmith@gmail.com', password: 'Password123!', name: 'Randy Smith' },
} satisfies Record<string, Account>;

let counter = 0;
/** A unique, valid address per test run (Mailpit catches everything). */
export function uniqueEmail(tag: string): string {
  counter += 1;
  return `e2e-${tag}-${String(Date.now())}-${String(counter)}@example.test`;
}

export const accountMenu = (page: Page) => page.getByRole('button', { name: 'Account menu' });

export async function login(
  page: Page,
  account: Pick<Account, 'email' | 'password'>,
): Promise<void> {
  await page.goto('/signin');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(accountMenu(page)).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  await accountMenu(page).click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(accountMenu(page)).toHaveCount(0);
}

/** Full self-registration through the UI, confirmation mail included; leaves the page signed in. */
export async function signUp(
  page: Page,
  account: Pick<Account, 'email' | 'password'>,
): Promise<void> {
  await page.goto('/signin?mode=register');
  await expect(page.getByRole('heading', { name: 'Register a new account' })).toBeVisible();
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Check your e-mail')).toBeVisible();
  await page.goto(await mailLink(account.email, '/auth/verify'));
  await expect(page.getByText('Your e-mail is confirmed. Welcome!')).toBeVisible();
  await expect(accountMenu(page)).toBeVisible();
}

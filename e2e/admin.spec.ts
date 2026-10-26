import { expect, test, type Locator, type Page } from '@playwright/test';
import { login, SEED, uniqueEmail } from './support/auth.ts';
import { mailLink } from './support/mailpit.ts';

test.describe.configure({ mode: 'serial' });

/** The visible role select of a users-table row (Mantine also renders a hidden input). */
const roleSelect = (row: Locator, name: string) =>
  row.locator(`input[aria-label="Role of ${name}"]:not([type=hidden])`);

async function searchUser(page: Page, needle: string, rowName: RegExp): Promise<Locator> {
  await page.goto('/admin/users');
  await page.getByRole('textbox', { name: 'Search users' }).fill(needle);
  const row = page.getByRole('row', { name: rowName });
  await expect(row).toBeVisible();
  return row;
}

test.describe('administration (ADR-013)', () => {
  test('the owner promotes a member with sudo confirmation, demotes again; the audit log records both', async ({
    page,
  }) => {
    await login(page, SEED.owner);
    const row = await searchUser(page, 'ken', /Ken Jimmy/);

    await roleSelect(row, 'Ken Jimmy').click();
    await page.getByRole('option', { name: 'Admin' }).click();
    const sudo = page.getByRole('dialog', { name: 'Confirm with your password' });
    await expect(sudo).toBeVisible();
    await sudo.getByLabel('Your password').fill(SEED.owner.password);
    await sudo.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Ken Jimmy is now Admin')).toBeVisible();
    await expect(row.getByText('Admin', { exact: true })).toBeVisible();

    // Inside the 10-minute sudo window: no second prompt.
    await roleSelect(row, 'Ken Jimmy').click();
    await page.getByRole('option', { name: 'Member' }).click();
    await expect(page.getByText('Ken Jimmy is now Member')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.goto('/admin/audit');
    const entries = page.getByRole('row', { name: /role\.change/ });
    await expect(entries).toHaveCount(2);
    await expect(entries.first()).toContainText('ken@jimmy.io');
  });

  test('the owner invites a member; the invitee accepts from the e-mail', async ({
    page,
    browser,
  }) => {
    const invitee = uniqueEmail('invitee');
    await login(page, SEED.owner);
    await page.goto('/admin/invitations');
    await page.getByLabel('E-mail').fill(invitee);
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await expect(page.getByText(`Invitation sent to ${invitee}`)).toBeVisible();
    await expect(page.getByRole('cell', { name: invitee })).toBeVisible();

    const link = await mailLink(invitee, '/invite');
    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto(link);
    await expect(guest.getByRole('heading', { name: 'You are invited' })).toBeVisible();
    await expect(guest.getByText(invitee)).toBeVisible();
    await guest.getByLabel('Password', { exact: true }).fill('Invitee-Pass-1!');
    await guest.getByRole('button', { name: 'Accept the invitation' }).click();
    await expect(guest.getByText('Welcome to DevConnector!')).toBeVisible();
    await expect(guest).toHaveURL(/\/admin\/profile$/);
    await guestContext.close();

    await page.reload();
    await expect(page.getByRole('cell', { name: invitee })).toHaveCount(0);
    await searchUser(page, invitee, new RegExp(invitee));
  });

  test('invite-only registration hides self sign-up until switched back', async ({
    page,
    browser,
  }) => {
    await login(page, SEED.owner);
    await page.goto('/admin/settings');
    const save = page.getByRole('button', { name: 'Save' });
    await expect(save).toBeDisabled();
    await page.getByText('Invite-only — accounts need an invitation link').click();
    await save.click();
    await expect(page.getByText('Settings saved')).toBeVisible();
    await expect(save).toBeDisabled();

    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto('/signin?mode=register');
    await expect(guest.getByText('Registration is invite-only.')).toBeVisible();
    await expect(guest.getByRole('button', { name: 'Register' })).toHaveCount(0);
    await guestContext.close();

    await page.getByText('Open — anyone can sign up (e-mail verification required)').click();
    await save.click();
    await expect(save).toBeDisabled();
  });

  test('an admin manages the skills catalog', async ({ page }) => {
    await login(page, SEED.admin);
    await page.goto('/admin/catalog');
    const skills = page.getByRole('tabpanel', { name: 'Skills' });
    await skills.getByLabel('Value').fill('zig');
    await skills.getByLabel('Label').fill('Zig');
    await skills.getByRole('button', { name: 'Add skill' }).click();
    await expect(page.getByText('Zig added')).toBeVisible();
    await expect(skills.getByRole('cell', { name: 'Zig', exact: true })).toBeVisible();

    await skills.getByRole('button', { name: 'Remove zig' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('zig removed')).toBeVisible();
    await expect(skills.getByRole('cell', { name: 'Zig', exact: true })).toHaveCount(0);
  });

  test('an admin never sees role controls or actions on the owner; a member gets a 404', async ({
    page,
    browser,
  }) => {
    await login(page, SEED.admin);
    await page.goto('/admin/users');
    await expect(page.getByRole('row').nth(1)).toBeVisible();
    await expect(page.locator('input[aria-label^="Role of"]')).toHaveCount(0);
    const ownerRow = page.getByRole('row', { name: /owner@devconnector\.local/ });
    await expect(ownerRow).toBeVisible();
    await expect(ownerRow.getByRole('button')).toHaveCount(0);
    await expect(ownerRow.getByRole('link', { name: /^View/ })).toBeVisible();

    const memberContext = await browser.newContext();
    const member = await memberContext.newPage();
    await login(member, SEED.hulk);
    await member.goto('/admin');
    const nav = member.getByRole('navigation', { name: 'Dev area' });
    await expect(nav.getByRole('link', { name: 'Posts' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Users' })).toHaveCount(0);
    await member.goto('/admin/users');
    await expect(member.getByText('Oops')).toBeVisible();
    await memberContext.close();
  });
});

import type { AdminUser, Me, Role } from '@devconnector/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render.tsx';
import { UserActions } from './UsersPage.tsx';

const me = (id: number, role: Role): Me => ({
  id,
  email: `${role}@example.test`,
  role,
  emailVerified: true,
  hasPassword: true,
  providers: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  sudoUntil: null,
  profile: {
    id,
    displayName: role,
    avatarUrl: null,
    username: role,
    website: null,
    company: null,
    bio: null,
    isPublic: true,
    skills: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
});

const target = (id: number, role: Role, displayName = `target-${role}`): AdminUser => ({
  id,
  email: `${displayName}@example.test`,
  role,
  disabled: false,
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastSeenAt: null,
  displayName,
  avatarUrl: null,
  postCount: 0,
});

/** Renders the compact row actions and waits for the router to paint (the "View" link is always there). */
async function renderActions(actor: Me, user: AdminUser) {
  renderWithProviders(<UserActions me={actor} user={user} compact />);
  const view = await screen.findByRole('link', { name: `View ${user.displayName}` });
  expect(view).toHaveAttribute('href', `/admin/users/${user.id}`);
  return {
    // Mantine's Select carries the label on the visible and the hidden input: any match counts.
    roleSelect: screen.queryAllByLabelText(`Role of ${user.displayName}`)[0] ?? null,
    disable: screen.queryByRole('button', { name: `Disable ${user.displayName}` }),
    remove: screen.queryByRole('button', { name: `Delete ${user.displayName}` }),
  };
}

/** The UI mirrors the ADR-013 matrix: nothing is offered that the API would refuse. */
describe('UserActions (ADR-013 role rules in the UI)', () => {
  it('owner → user: role select, disable and delete', async () => {
    const a = await renderActions(me(1, 'owner'), target(2, 'user'));
    expect(a.roleSelect).toBeInTheDocument();
    expect(a.disable).toBeInTheDocument();
    expect(a.remove).toBeInTheDocument();
  });

  it('owner → admin: role select, disable and delete; "Owner" is never offered', async () => {
    const a = await renderActions(me(1, 'owner'), target(2, 'admin'));
    expect(a.roleSelect).toBeInTheDocument();
    expect(a.disable).toBeInTheDocument();
    expect(a.remove).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Owner' })).not.toBeInTheDocument();
  });

  it('admin → user: disable and delete, but no role select', async () => {
    const a = await renderActions(me(3, 'admin'), target(2, 'user'));
    expect(a.roleSelect).not.toBeInTheDocument();
    expect(a.disable).toBeInTheDocument();
    expect(a.remove).toBeInTheDocument();
  });

  it('admin → another admin: nothing but the detail link', async () => {
    const a = await renderActions(me(3, 'admin'), target(4, 'admin'));
    expect(a.roleSelect).not.toBeInTheDocument();
    expect(a.disable).not.toBeInTheDocument();
    expect(a.remove).not.toBeInTheDocument();
  });

  it.each<[Role]>([['owner'], ['admin']])('%s → owner: no action at all', async (actor) => {
    const a = await renderActions(me(actor === 'owner' ? 1 : 3, actor), target(1, 'owner'));
    expect(a.roleSelect).not.toBeInTheDocument();
    expect(a.disable).not.toBeInTheDocument();
    expect(a.remove).not.toBeInTheDocument();
  });

  it('nobody can disable or delete themselves from the users table', async () => {
    const a = await renderActions(me(3, 'admin'), target(3, 'admin', 'self'));
    expect(a.disable).not.toBeInTheDocument();
    expect(a.remove).not.toBeInTheDocument();
  });
});

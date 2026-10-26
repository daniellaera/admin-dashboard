import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render.tsx';
import { FEATURES, HomePage } from './HomePage.tsx';

describe('HomePage', () => {
  it('renders the hero copy, the two calls to action and every "Built with" bullet', async () => {
    renderWithProviders(<HomePage />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Dev Connector dashboard',
    );
    expect(screen.getByText('Connecting with Developers has never been so easy!')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Developers' })).toHaveAttribute('href', '/developers');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin');
    for (const feature of FEATURES) expect(screen.getByText(feature)).toBeInTheDocument();
  });
});

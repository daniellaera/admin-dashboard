import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { theme } from '@/theme.ts';

/**
 * Renders a component inside the same providers as the app (Mantine, modals, notifications,
 * TanStack Query) and a minimal in-memory router so `<Link>` works.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions & { path?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const rootRoute = createRootRoute({ component: () => ui });
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' });
  const catchAll = createRoute({ getParentRoute: () => rootRoute, path: '$' });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, catchAll]),
    history: createMemoryHistory({ initialEntries: [options.path ?? '/'] }),
  });

  function Wrapper({ children }: { children?: ReactNode }) {
    return (
      <MantineProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <ModalsProvider>
            <Notifications />
            {children}
          </ModalsProvider>
        </QueryClientProvider>
      </MantineProvider>
    );
  }

  const { path: _path, ...rtlOptions } = options;
  return {
    queryClient,
    ...rtlRender(<RouterProvider router={router} />, { wrapper: Wrapper, ...rtlOptions }),
  };
}

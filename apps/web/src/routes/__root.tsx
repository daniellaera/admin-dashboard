import type { AppConfig, Me } from '@devconnector/shared';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { configQuery, meQuery } from '@/features/auth/api.ts';
import { NotFoundPage } from '@/features/shell/NotFoundPage.tsx';

export interface RouterContext {
  queryClient: QueryClient;
}

/** Children receive `me` and `config` in their route context (guards, menus). */
export interface AuthedContext extends RouterContext {
  me: Me | null;
  config: AppConfig;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }): Promise<Omit<AuthedContext, 'queryClient'>> => {
    const [me, config] = await Promise.all([
      context.queryClient.query({ ...meQuery, staleTime: 'static' }),
      context.queryClient.query({ ...configQuery, staleTime: 'static' }),
    ]);
    return { me, config };
  },
  component: RouteComponent,
  notFoundComponent: NotFoundPage,
});

function RouteComponent() {
  return <Outlet />;
}

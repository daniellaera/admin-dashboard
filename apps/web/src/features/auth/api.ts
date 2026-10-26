import type {
  AcceptInvitationInput,
  AppConfig,
  AuthResult,
  ChangePasswordInput,
  DeleteAccountInput,
  InvitationPreview,
  LoginInput,
  Me,
  RegisterInput,
  ResetPasswordInput,
} from '@devconnector/shared';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, isApiError } from '@/lib/api.ts';

export const authKeys = {
  me: ['auth', 'me'] as const,
  config: ['config'] as const,
  providers: ['auth', 'providers'] as const,
  invitation: (token: string) => ['auth', 'invitation', token] as const,
};

/** The signed-in user, or `null` (401 is not an error for this query). */
export const meQuery = queryOptions({
  queryKey: authKeys.me,
  queryFn: async (): Promise<Me | null> => {
    try {
      return await api.get<Me>('/auth/me');
    } catch (error) {
      if (isApiError(error, 401)) return null;
      throw error;
    }
  },
  staleTime: 60_000,
});

export const configQuery = queryOptions({
  queryKey: authKeys.config,
  queryFn: () => api.get<AppConfig>('/config'),
  staleTime: Infinity,
});

export const providersQuery = queryOptions({
  queryKey: authKeys.providers,
  queryFn: () => api.get<{ github: boolean }>('/auth/providers'),
  staleTime: Infinity,
});

export const invitationPreviewQuery = (token: string) =>
  queryOptions({
    queryKey: authKeys.invitation(token),
    queryFn: () => api.get<InvitationPreview>(`/auth/invitations/${token}`),
    retry: false,
  });

export function useMe() {
  return useQuery(meQuery);
}

export function useConfig() {
  return useQuery(configQuery);
}

/** Invalidates everything that depends on who is signed in. */
function useAuthInvalidation() {
  const queryClient = useQueryClient();
  return async (me: Me | null) => {
    queryClient.setQueryData(authKeys.me, me);
    await queryClient.invalidateQueries();
  };
}

export function useLogin() {
  const settle = useAuthInvalidation();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<AuthResult>('/auth/login', { body: input }),
    onSuccess: (result) => settle(result.me),
  });
}

export function useRegister() {
  const settle = useAuthInvalidation();
  return useMutation({
    mutationFn: (input: RegisterInput) => api.post<AuthResult>('/auth/register', { body: input }),
    onSuccess: (result) => (result.me ? settle(result.me) : Promise.resolve()),
  });
}

export function useLogout() {
  const settle = useAuthInvalidation();
  return useMutation({
    mutationFn: () => api.post<undefined>('/auth/logout'),
    onSuccess: () => settle(null),
  });
}

export function useVerifyEmail() {
  const settle = useAuthInvalidation();
  return useMutation({
    mutationFn: (token: string) => api.post<AuthResult>('/auth/verify-email', { body: { token } }),
    onSuccess: (result) => settle(result.me),
  });
}

export function useConsumeMagicLink() {
  const settle = useAuthInvalidation();
  return useMutation({
    mutationFn: (token: string) =>
      api.post<AuthResult>('/auth/magic-link/consume', { body: { token } }),
    onSuccess: (result) => settle(result.me),
  });
}

export function useAcceptInvitation() {
  const settle = useAuthInvalidation();
  return useMutation({
    mutationFn: (input: AcceptInvitationInput) =>
      api.post<AuthResult>('/auth/invitations/accept', { body: input }),
    onSuccess: (result) => settle(result.me),
  });
}

export const useRequestMagicLink = () =>
  useMutation({
    mutationFn: (email: string) => api.post<undefined>('/auth/magic-link', { body: { email } }),
  });
export const useForgotPassword = () =>
  useMutation({
    mutationFn: (email: string) =>
      api.post<undefined>('/auth/forgot-password', { body: { email } }),
  });
export const useResendVerification = () =>
  useMutation({
    mutationFn: (email: string) =>
      api.post<undefined>('/auth/resend-verification', { body: { email } }),
  });
export const useResetPassword = () =>
  useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      api.post<undefined>('/auth/reset-password', { body: input }),
  });
export const useChangePassword = () =>
  useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      api.put<undefined>('/auth/password', { body: input }),
  });

export function useSudo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) =>
      api.post<{ sudoUntil: string }>('/auth/sudo', { body: { password } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}

export function useDeleteAccount() {
  const settle = useAuthInvalidation();
  return useMutation({
    mutationFn: (input: DeleteAccountInput) =>
      api.delete<undefined>('/auth/account', { body: input }),
    onSuccess: () => settle(null),
  });
}

import type {
  Catalog,
  EducationDto,
  EducationInput,
  ExperienceDto,
  ExperienceInput,
  Paginated,
  ProfileDetail,
  ProfileUpdateInput,
  PublicProfile,
} from '@devconnector/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { authKeys } from '../auth/api.ts';

export const profileKeys = {
  all: ['profiles'] as const,
  directory: (filters: { page?: number; q?: string }) =>
    ['profiles', 'directory', filters] as const,
  detail: (id: number) => ['profiles', 'detail', id] as const,
  mine: ['profiles', 'me'] as const,
  experiences: ['profiles', 'me', 'experiences'] as const,
  educations: ['profiles', 'me', 'educations'] as const,
  catalog: ['catalog'] as const,
};

export const directoryQuery = (filters: { page?: number; q?: string }) =>
  queryOptions({
    queryKey: profileKeys.directory(filters),
    queryFn: () =>
      api.get<Paginated<PublicProfile>>('/profiles', { query: { ...filters, limit: 12 } }),
    placeholderData: (previous) => previous,
  });

export const profileQuery = (id: number) =>
  queryOptions({
    queryKey: profileKeys.detail(id),
    queryFn: () => api.get<ProfileDetail>(`/profiles/${id}`),
  });

export const myProfileQuery = queryOptions({
  queryKey: profileKeys.mine,
  queryFn: () => api.get<ProfileDetail>('/me/profile'),
});

export const experiencesQuery = queryOptions({
  queryKey: profileKeys.experiences,
  queryFn: () => api.get<ExperienceDto[]>('/me/experiences'),
});

export const educationsQuery = queryOptions({
  queryKey: profileKeys.educations,
  queryFn: () => api.get<EducationDto[]>('/me/educations'),
});

export const catalogQuery = queryOptions({
  queryKey: profileKeys.catalog,
  queryFn: () => api.get<Catalog>('/catalog'),
  staleTime: 5 * 60_000,
});

function useProfileInvalidation() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: profileKeys.all }),
      queryClient.invalidateQueries({ queryKey: authKeys.me }),
    ]);
}

export function useUpdateProfile() {
  const invalidate = useProfileInvalidation();
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) =>
      api.patch<PublicProfile>('/me/profile', { body: input }),
    onSuccess: invalidate,
  });
}

export function useUploadAvatar() {
  const invalidate = useProfileInvalidation();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post<PublicProfile>('/me/avatar', { formData });
    },
    onSuccess: invalidate,
  });
}

export function useRemoveAvatar() {
  const invalidate = useProfileInvalidation();
  return useMutation({
    mutationFn: () => api.delete<PublicProfile>('/me/avatar'),
    onSuccess: invalidate,
  });
}

export function useCvMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: profileKeys.all });
  return {
    addExperience: useMutation({
      mutationFn: (input: ExperienceInput) =>
        api.post<ExperienceDto>('/me/experiences', { body: input }),
      onSuccess: refresh,
    }),
    updateExperience: useMutation({
      mutationFn: ({ id, input }: { id: number; input: ExperienceInput }) =>
        api.put<ExperienceDto>(`/me/experiences/${id}`, { body: input }),
      onSuccess: refresh,
    }),
    removeExperience: useMutation({
      mutationFn: (id: number) => api.delete<undefined>(`/me/experiences/${id}`),
      onSuccess: refresh,
    }),
    addEducation: useMutation({
      mutationFn: (input: EducationInput) =>
        api.post<EducationDto>('/me/educations', { body: input }),
      onSuccess: refresh,
    }),
    updateEducation: useMutation({
      mutationFn: ({ id, input }: { id: number; input: EducationInput }) =>
        api.put<EducationDto>(`/me/educations/${id}`, { body: input }),
      onSuccess: refresh,
    }),
    removeEducation: useMutation({
      mutationFn: (id: number) => api.delete<undefined>(`/me/educations/${id}`),
      onSuccess: refresh,
    }),
  };
}

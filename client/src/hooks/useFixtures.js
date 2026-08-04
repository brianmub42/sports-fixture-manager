import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fixturesApi, scoresApi, districtsApi, settingsApi, organizationsApi } from '../api.js';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.getAll().then(r => r.data),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => organizationsApi.create(data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizations']);
    },
  });
}

export function useFixtures(filters = {}) {
  return useQuery({
    queryKey: ['fixtures', filters],
    queryFn: () => fixturesApi.getAll(filters).then(r => r.data),
  });
}

export function useDistrictSchedule(code) {
  return useQuery({
    queryKey: ['schedule', code],
    queryFn: () => fixturesApi.getDistrictSchedule(code).then(r => r.data),
    enabled: !!code,
  });
}

export function useUpdateScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, score_a, score_b }) => scoresApi.update(id, { score_a, score_b }),
    onSuccess: () => {
      queryClient.invalidateQueries(['fixtures']);
      queryClient.invalidateQueries(['standings']);
      queryClient.invalidateQueries(['log']);
    },
  });
}

export function useDistricts() {
  return useQuery({
    queryKey: ['districts'],
    queryFn: () => districtsApi.getAll().then(r => r.data),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
    },
  });
}

export function useResetDatabase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (type) => settingsApi.reset(type),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

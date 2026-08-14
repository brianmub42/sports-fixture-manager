import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fixturesApi, scoresApi, teamsApi, settingsApi, organizationsApi, venuesApi, sportsApi } from '../api.js';

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

export function useTeamSchedule(code) {
  return useQuery({
    queryKey: ['schedule', code],
    queryFn: () => fixturesApi.getTeamSchedule(code).then(r => r.data),
    enabled: !!code,
  });
}

export const useDistrictSchedule = useTeamSchedule;

export function useUpdateScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => scoresApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fixtures']);
      queryClient.invalidateQueries(['standings']);
      queryClient.invalidateQueries(['log']);
      queryClient.invalidateQueries(['analytics']);
    },
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.getAll().then(r => r.data),
  });
}

export const useDistricts = useTeams;

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

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: () => venuesApi.getAll().then(r => r.data),
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => venuesApi.create(data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['venues']);
    },
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => venuesApi.delete(id).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['venues']);
    },
  });
}

export function useSports() {
  return useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsApi.getAll().then(r => r.data),
  });
}

export function useCreateSport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => sportsApi.create(data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sports']);
      queryClient.invalidateQueries(['settings']);
    },
  });
}

export function useDeleteSport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => sportsApi.delete(id).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sports']);
      queryClient.invalidateQueries(['settings']);
    },
  });
}

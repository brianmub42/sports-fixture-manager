import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { athleticsApi } from '../api.js';

export function useAthleticsEvents() {
  return useQuery({
    queryKey: ['athleticsEvents'],
    queryFn: () => athleticsApi.getEvents().then(r => r.data),
  });
}

export function useAthleticsSports() {
  return useQuery({
    queryKey: ['athleticsSports'],
    queryFn: () => athleticsApi.getSports().then(r => r.data),
  });
}

export function useCreateAthleticsEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => athleticsApi.createEvent(data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['athleticsEvents']);
    },
  });
}

export function useUpdateAthleticsEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => athleticsApi.updateEvent(id, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['athleticsEvents']);
      queryClient.invalidateQueries(['standings']);
      queryClient.invalidateQueries(['log']);
    },
  });
}

export function useDeleteAthleticsEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => athleticsApi.deleteEvent(id).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['athleticsEvents']);
      queryClient.invalidateQueries(['standings']);
      queryClient.invalidateQueries(['log']);
    },
  });
}

export function useSaveAthleticsResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, results }) => athleticsApi.saveResults(id, results).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['athleticsEvents']);
      queryClient.invalidateQueries(['standings']);
      queryClient.invalidateQueries(['log']);
    },
  });
}

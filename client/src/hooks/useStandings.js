import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { standingsApi, analyticsApi } from '../api.js';

export function useStandings(sport, eventId, options = {}) {
  return useQuery({
    queryKey: ['standings', sport, eventId],
    queryFn: () => standingsApi.getBySport(sport, eventId).then(r => r.data),
    enabled: !!sport && options.enabled !== false,
    ...options
  });
}

export function useStandingsEvents(sport, options = {}) {
  return useQuery({
    queryKey: ['standings-events', sport],
    queryFn: () => standingsApi.getEvents(sport).then(r => r.data),
    enabled: !!sport && options.enabled !== false,
    ...options
  });
}

export function useLogStandings(options = {}) {
  return useQuery({
    queryKey: ['log'],
    queryFn: () => standingsApi.getLog().then(r => r.data),
    ...options
  });
}

export function useAnalytics(sport) {
  return useQuery({
    queryKey: ['analytics', sport],
    queryFn: () => analyticsApi.getStats({ sport }).then(r => r.data),
  });
}

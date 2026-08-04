import { useQuery } from '@tanstack/react-query';
import { standingsApi } from '../api.js';

export function useStandings(sport) {
  return useQuery({
    queryKey: ['standings', sport],
    queryFn: () => standingsApi.getBySport(sport).then(r => r.data),
    enabled: !!sport,
  });
}

export function useLogStandings() {
  return useQuery({
    queryKey: ['log'],
    queryFn: () => standingsApi.getLog().then(r => r.data),
  });
}

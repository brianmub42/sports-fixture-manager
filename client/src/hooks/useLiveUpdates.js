import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../contexts/SocketContext.jsx';
import { useOrganization } from '../contexts/OrganizationContext.jsx';

export function useLiveUpdates() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (!socket) return;

    const handleScoreUpdated = (data) => {
      // Invalidate queries so React Query auto-refetches the fresh data
      // This will update the Live Scores, Dashboard, Fixtures, and Standings instantly.
      if (currentOrg?.slug) {
        queryClient.invalidateQueries({ queryKey: ['fixtures', currentOrg.slug] });
        queryClient.invalidateQueries({ queryKey: ['standings', currentOrg.slug] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['fixtures'] });
        queryClient.invalidateQueries({ queryKey: ['standings'] });
      }
    };

    socket.on('score-updated', handleScoreUpdated);

    return () => {
      socket.off('score-updated', handleScoreUpdated);
    };
  }, [socket, queryClient, currentOrg]);
}

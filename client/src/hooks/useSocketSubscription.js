import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext.jsx';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { useSports } from './useFixtures.js';

export function useSocketSubscription(selectedSportName) {
  const socket = useSocket();
  const { activeOrg } = useOrganization();
  const { data: sports } = useSports();

  useEffect(() => {
    if (!socket || !activeOrg?.id) return;

    let eventId = 'all';
    if (selectedSportName && selectedSportName !== 'All') {
      const sportObj = sports?.find(
        (s) => s.name.toLowerCase() === selectedSportName.toLowerCase()
      );
      if (sportObj) {
        eventId = sportObj.id;
      }
    }

    socket.emit('subscribe', { tenantId: activeOrg.id, eventId });
  }, [socket, activeOrg, sports, selectedSportName]);
}

import { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext.jsx';
import { useOrganization } from './OrganizationContext.jsx';

const TimerContext = createContext();

export function TimerProvider({ children }) {
  const socket = useSocket();
  const { currentOrg } = useOrganization();
  const [timers, setTimers] = useState({});

  useEffect(() => {
    if (!socket) return;

    const handleTimerUpdate = (data) => {
      setTimers(prev => ({
        ...prev,
        [data.fixtureId]: {
          timeRemaining: data.timeRemaining,
          isRunning: data.isRunning,
          updatedAt: Date.now() // Track when it was last synced to compensate for drift
        }
      }));
    };

    socket.on('timer-update', handleTimerUpdate);

    return () => {
      socket.off('timer-update', handleTimerUpdate);
    };
  }, [socket]);

  // Function to broadcast a timer update (used by scorekeepers)
  const broadcastTimer = (fixtureId, timeRemaining, isRunning) => {
    // Update local state instantly
    setTimers(prev => ({
      ...prev,
      [fixtureId]: { timeRemaining, isRunning, updatedAt: Date.now() }
    }));
    
    // Broadcast to others
    if (socket) {
      socket.emit('timer-update', {
        orgId: currentOrg?.id || currentOrg?.slug,
        fixtureId,
        timeRemaining,
        isRunning
      });
    }
  };

  return (
    <TimerContext.Provider value={{ timers, broadcastTimer }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimers() {
  return useContext(TimerContext);
}

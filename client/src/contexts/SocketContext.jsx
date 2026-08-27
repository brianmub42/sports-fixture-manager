import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useOrganization } from './OrganizationContext.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { activeOrg: currentOrg } = useOrganization();

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const newSocket = io(API_URL);
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket && currentOrg?.slug) {
      socket.emit('join-tenant', currentOrg.slug);
    }
  }, [socket, currentOrg]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

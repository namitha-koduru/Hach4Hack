import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinHackathon: (hackathonId: string) => void;
  leaveHackathon: (hackathonId: string) => void;
  joinTeam: (teamId: string) => void;
  leaveTeam: (teamId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('⚡ Connected to TeamForge real-time WebSocket server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from WebSocket server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const joinHackathon = (hackathonId: string) => {
    if (socket && hackathonId) {
      socket.emit('join:hackathon', hackathonId);
    }
  };

  const leaveHackathon = (hackathonId: string) => {
    if (socket && hackathonId) {
      socket.emit('leave:hackathon', hackathonId);
    }
  };

  const joinTeam = (teamId: string) => {
    if (socket && teamId) {
      socket.emit('join:team', teamId);
    }
  };

  const leaveTeam = (teamId: string) => {
    if (socket && teamId) {
      socket.emit('leave:team', teamId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinHackathon,
        leaveHackathon,
        joinTeam,
        leaveTeam,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
};


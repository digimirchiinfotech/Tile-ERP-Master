/**
 * TILE EXPORTER ERP SAAS — Socket.IO provider with resilient reconnect.
 */

import React, { createContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useUserContext } from './UserContext';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useUserContext();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocket(null);
    setIsConnected(false);
  }, []);

  const connectSocket = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!user || !token) return;

    disconnectSocket();

    const apiUrl = import.meta.env?.VITE_API_BASE
      ? "https://tile-erp-master-production.railway.app/api".replace('/api', '')
      : '';

    const newSocket = io(apiUrl || undefined, {
      path: '/socket.io',
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', () => setIsConnected(false));

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [user, disconnectSocket]);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return undefined;
    }

    connectSocket();

    const handleOnline = () => {
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      } else if (!socketRef.current) {
        connectSocket();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleOnline();
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      disconnectSocket();
    };
  }, [user, connectSocket, disconnectSocket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

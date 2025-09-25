import { useState, useEffect, useCallback, useRef } from 'react';

import { useSession } from 'next-auth/react';

import {
  createSocketConnection,
  getSocket,
  connectSocket,
  disconnectSocket,
  isSocketConnected,
  getCurrentUser,
  getPerformanceMetrics,
  initializeRealtimeConfig,
} from '@/lib/realtime/client';
import type {
  UseRealtimeReturn,
  AuthenticatedUser,
  RealtimeConfig,
  PerformanceMetrics,
} from '@/types/realtime';

/**
 * Main real-time hook for Socket.io connection management
 */
export const useRealtime = (config?: Partial<RealtimeConfig>): UseRealtimeReturn => {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);

  const socketRef = useRef<any>(null);
  const configInitialized = useRef(false);

  // Initialize configuration once
  useEffect(() => {
    if (!configInitialized.current && config) {
      initializeRealtimeConfig(config);
      configInitialized.current = true;
    }
  }, [config]);

  // Connect when session is available
  useEffect(() => {
    if (session?.user && !socketRef.current) {
      handleConnect();
    }

    return () => {
      if (socketRef.current) {
        handleDisconnect();
      }
    };
  }, [session]);

  // Monitor connection status
  useEffect(() => {
    const interval = setInterval(() => {
      const socket = getSocket();
      const connected = isSocketConnected();
      const user = getCurrentUser();

      if (socket !== socketRef.current) {
        socketRef.current = socket;
      }

      if (connected !== isConnected) {
        setIsConnected(connected);
      }

      if (user !== currentUser) {
        setCurrentUser(user);
      }

      if (connected) {
        setLastActivity(new Date());
        setConnectionError(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, currentUser]);

  const handleConnect = useCallback(async () => {
    try {
      setConnectionError(null);
      const socket = await createSocketConnection();

      if (socket) {
        socketRef.current = socket;

        // Connection event handlers
        socket.on('connect', () => {
          setIsConnected(true);
          setConnectionError(null);
          setReconnectAttempts(0);
          setLastActivity(new Date());
        });

        socket.on('disconnect', (reason) => {
          setIsConnected(false);
          if (reason === 'io server disconnect') {
            setConnectionError('Server disconnected');
          }
        });

        socket.on('connect_error', (error) => {
          setConnectionError(error.message || 'Connection failed');
          setIsConnected(false);
        });

        socket.on('reconnect', (attemptNumber) => {
          setReconnectAttempts(attemptNumber);
          setConnectionError(null);
        });

        socket.on('reconnect_error', (error) => {
          setConnectionError(`Reconnection failed: ${error.message}`);
        });

        socket.on('reconnect_failed', () => {
          setConnectionError('Failed to reconnect after maximum attempts');
        });

        // Auth event handler
        socket.on('auth:authenticate', (success, user) => {
          if (success && user) {
            setCurrentUser(user);
          }
        });

        // Start connection
        const connected = await connectSocket();
        setIsConnected(connected);
      } else {
        setConnectionError('Failed to create socket connection');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown connection error';
      setConnectionError(message);
      setIsConnected(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    try {
      disconnectSocket();
      socketRef.current = null;
      setIsConnected(false);
      setCurrentUser(null);
      setConnectionError(null);
      setLastActivity(null);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }, []);

  return {
    isConnected,
    socket: socketRef.current,
    connectionError,
    reconnectAttempts,
    lastActivity,
    currentUser,
    connect: handleConnect,
    disconnect: handleDisconnect,
  };
};

/**
 * Hook for connection performance metrics
 */
export const useRealtimeMetrics = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isSocketConnected()) {
        const currentMetrics = getPerformanceMetrics();
        setMetrics(currentMetrics);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return metrics;
};

/**
 * Hook for connection status monitoring
 */
export const useConnectionStatus = () => {
  const [status, setStatus] = useState<{
    isConnected: boolean;
    isAuthenticated: boolean;
    lastPing: Date | null;
    uptime: number;
  }>({
    isConnected: false,
    isAuthenticated: false,
    lastPing: null,
    uptime: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const connected = isSocketConnected();
      const user = getCurrentUser();
      const metrics = getPerformanceMetrics();

      setStatus({
        isConnected: connected,
        isAuthenticated: !!user,
        lastPing: metrics.lastPing,
        uptime: metrics.connectionUptime,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
};
import { io, Socket } from 'socket.io-client';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  AuthenticatedUser,
  RealtimeConfig,
  PerformanceMetrics,
} from '@/types/realtime';
import { getSession } from 'next-auth/react';

// Default configuration
const DEFAULT_CONFIG: RealtimeConfig = {
  serverUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  autoConnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 25000,
  presenceUpdateInterval: 30000,
  messageHistoryLimit: 100,
  notificationRetentionDays: 7,
  enableDebugLogs: process.env.NODE_ENV === 'development',
};

// Socket instance
let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

// Configuration
let config: RealtimeConfig = DEFAULT_CONFIG;

// Performance metrics
let metrics: PerformanceMetrics = {
  latency: 0,
  packetsReceived: 0,
  packetsSent: 0,
  reconnects: 0,
  errors: 0,
  lastPing: new Date(),
  connectionUptime: 0,
};

// Connection state
let connectionStartTime: Date | null = null;
let isAuthenticated = false;
let currentUser: AuthenticatedUser | null = null;

/**
 * Initialize Socket.io client configuration
 */
export const initializeRealtimeConfig = (customConfig?: Partial<RealtimeConfig>) => {
  config = { ...DEFAULT_CONFIG, ...customConfig };
  if (config.enableDebugLogs) {
    console.log('Realtime config initialized:', config);
  }
};

/**
 * Create and configure Socket.io client connection
 */
export const createSocketConnection = async (): Promise<Socket<ServerToClientEvents, ClientToServerEvents> | null> => {
  try {
    // First, initialize the Socket.io server
    await fetch('/api/socket', { method: 'POST' });

    // Get current session for authentication
    const session = await getSession();
    if (!session?.user) {
      console.error('No active session found');
      return null;
    }

    // Create Socket.io client
    const socket = io(config.serverUrl, {
      auth: {
        token: session.user.id, // In production, use a proper JWT token
      },
      autoConnect: config.autoConnect,
      reconnection: true,
      reconnectionAttempts: config.reconnectAttempts,
      reconnectionDelay: config.reconnectDelay,
      timeout: 20000,
      forceNew: false,
      transports: ['websocket', 'polling'],
    });

    // Performance tracking
    connectionStartTime = new Date();

    // Connection event handlers
    socket.on('connect', () => {
      if (config.enableDebugLogs) {
        console.log('Socket connected:', socket.id);
      }

      metrics.lastPing = new Date();
      if (connectionStartTime) {
        metrics.connectionUptime = Date.now() - connectionStartTime.getTime();
      }

      // Authenticate with server
      socket.emit('auth:authenticate', session.user?.id || '', (success: boolean, user?: AuthenticatedUser) => {
        if (success && user) {
          isAuthenticated = true;
          currentUser = user;
          if (config.enableDebugLogs) {
            console.log('Socket authenticated for user:', user.name);
          }
        } else {
          console.error('Socket authentication failed');
          isAuthenticated = false;
          currentUser = null;
        }
      });
    });

    socket.on('disconnect', (reason) => {
      if (config.enableDebugLogs) {
        console.log('Socket disconnected:', reason);
      }
      isAuthenticated = false;
      currentUser = null;
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      metrics.errors++;
    });

    socket.on('reconnect', (attemptNumber) => {
      if (config.enableDebugLogs) {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
      }
      metrics.reconnects++;
    });

    socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      metrics.errors++;
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after maximum attempts');
      metrics.errors++;
    });

    // Performance monitoring
    socket.on('pong', (latency) => {
      metrics.latency = latency;
      metrics.lastPing = new Date();
      if (connectionStartTime) {
        metrics.connectionUptime = Date.now() - connectionStartTime.getTime();
      }
    });

    // Track packet counts
    const originalEmit = socket.emit.bind(socket);
    (socket as any).emit = (...args: any[]) => {
      metrics.packetsSent++;
      return (originalEmit as any)(...args);
    };

    // Track received packets
    socket.onAny(() => {
      metrics.packetsReceived++;
    });

    socketInstance = socket;
    return socket;

  } catch (error) {
    console.error('Failed to create socket connection:', error);
    metrics.errors++;
    return null;
  }
};

/**
 * Get current socket instance
 */
export const getSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> | null => {
  return socketInstance;
};

/**
 * Connect to Socket.io server
 */
export const connectSocket = async (): Promise<boolean> => {
  try {
    if (!socketInstance) {
      socketInstance = await createSocketConnection();
    }

    if (socketInstance && !socketInstance.connected) {
      socketInstance.connect();
    }

    return socketInstance?.connected || false;
  } catch (error) {
    console.error('Failed to connect socket:', error);
    return false;
  }
};

/**
 * Disconnect from Socket.io server
 */
export const disconnectSocket = (): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    isAuthenticated = false;
    currentUser = null;
  }
};

/**
 * Check if socket is connected and authenticated
 */
export const isSocketConnected = (): boolean => {
  return socketInstance?.connected && isAuthenticated || false;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): AuthenticatedUser | null => {
  return currentUser;
};

/**
 * Get connection performance metrics
 */
export const getPerformanceMetrics = (): PerformanceMetrics => {
  if (connectionStartTime) {
    metrics.connectionUptime = Date.now() - connectionStartTime.getTime();
  }
  return { ...metrics };
};

/**
 * Reset performance metrics
 */
export const resetPerformanceMetrics = (): void => {
  metrics = {
    latency: 0,
    packetsReceived: 0,
    packetsSent: 0,
    reconnects: 0,
    errors: 0,
    lastPing: new Date(),
    connectionUptime: 0,
  };
  connectionStartTime = new Date();
};

/**
 * Join a room/channel
 */
export const joinRoom = async (roomId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!socketInstance || !isAuthenticated) {
      resolve(false);
      return;
    }

    socketInstance.emit('room:join', roomId, (success: boolean) => {
      if (config.enableDebugLogs) {
        console.log('Join room result:', roomId, success);
      }
      resolve(success);
    });
  });
};

/**
 * Leave a room/channel
 */
export const leaveRoom = async (roomId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!socketInstance || !isAuthenticated) {
      resolve(false);
      return;
    }

    socketInstance.emit('room:leave', roomId, (success: boolean) => {
      if (config.enableDebugLogs) {
        console.log('Leave room result:', roomId, success);
      }
      resolve(success);
    });
  });
};

/**
 * Subscribe to data updates
 */
export const subscribeToData = (dataType: string, filters?: any): void => {
  if (socketInstance && isAuthenticated) {
    socketInstance.emit('data:subscribe', dataType, filters);
    if (config.enableDebugLogs) {
      console.log('Subscribed to data:', dataType, filters);
    }
  }
};

/**
 * Unsubscribe from data updates
 */
export const unsubscribeFromData = (dataType: string): void => {
  if (socketInstance && isAuthenticated) {
    socketInstance.emit('data:unsubscribe', dataType);
    if (config.enableDebugLogs) {
      console.log('Unsubscribed from data:', dataType);
    }
  }
};

/**
 * Subscribe to widget updates
 */
export const subscribeToWidget = (widgetId: string): void => {
  if (socketInstance && isAuthenticated) {
    socketInstance.emit('widget:subscribe', widgetId);
    if (config.enableDebugLogs) {
      console.log('Subscribed to widget:', widgetId);
    }
  }
};

/**
 * Unsubscribe from widget updates
 */
export const unsubscribeFromWidget = (widgetId: string): void => {
  if (socketInstance && isAuthenticated) {
    socketInstance.emit('widget:unsubscribe', widgetId);
    if (config.enableDebugLogs) {
      console.log('Unsubscribed from widget:', widgetId);
    }
  }
};

/**
 * Enable or disable debug logging
 */
export const setDebugLogging = (enabled: boolean): void => {
  config.enableDebugLogs = enabled;
};

/**
 * Get current configuration
 */
export const getCurrentConfig = (): RealtimeConfig => {
  return { ...config };
};

/**
 * Clean up resources and disconnect
 */
export const cleanup = (): void => {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }

  isAuthenticated = false;
  currentUser = null;
  connectionStartTime = null;
  resetPerformanceMetrics();
};

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}
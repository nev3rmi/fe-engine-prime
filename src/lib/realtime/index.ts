/**
 * FE-Engine Prime Real-time Infrastructure
 *
 * Comprehensive Socket.io 4.8+ real-time system with:
 * - JWT Authentication Integration
 * - Real-time Presence System
 * - Chat/Messaging System
 * - Data Synchronization
 * - Push Notifications
 * - Performance Optimizations
 *
 * Built by Agent 4 (Real-time Engineer)
 */

// Core client functionality
export * from './client';
export * from './server';

// Performance optimizations
export * from './performance';

// Import needed functions for initialization
import {
  createSocketConnection,
  getSocket,
  getPerformanceMetrics,
  isSocketConnected,
  initializeRealtimeConfig
} from './client';
import { getOnlineUsersCount } from './server';

// React hooks
export * from '../hooks/use-realtime';
export * from '../hooks/use-presence';
export * from '../hooks/use-chat';
export * from '../hooks/use-data-sync';
export * from '../hooks/use-notifications';
export * from '../hooks/use-debounce';

// Types
export * from '../../types/realtime';

// Utility functions
export {
  initializeRealtimeConfig,
  createSocketConnection,
  getSocket,
  connectSocket,
  disconnectSocket,
  isSocketConnected,
  getCurrentUser,
  getPerformanceMetrics,
  joinRoom,
  leaveRoom,
  subscribeToData,
  unsubscribeFromData,
  subscribeToWidget,
  unsubscribeFromWidget,
  setDebugLogging,
  getCurrentConfig,
  cleanup,
} from './client';

export {
  initializeSocketServer,
  getSocketServer,
  broadcastDataSync,
  updateWidget,
  sendSystemNotification,
  getOnlineUsersCount,
  getOnlineUsers,
} from './server';

export {
  throttleEvent,
  debounceEvent,
  EventBatcher,
  ConnectionQualityMonitor,
  AdaptiveEventController,
  EventListenerManager,
  cleanupSocketResources,
  PerformanceMetricsCollector,
  connectionPool,
  metricsCollector,
  globalCleanup,
} from './performance';

// Default configuration
export const REALTIME_CONFIG = {
  SERVER_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  AUTO_CONNECT: true,
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  HEARTBEAT_INTERVAL: 25000,
  PRESENCE_UPDATE_INTERVAL: 30000,
  MESSAGE_HISTORY_LIMIT: 100,
  NOTIFICATION_RETENTION_DAYS: 7,
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
} as const;

// Event names constants
export const SOCKET_EVENTS = {
  // Authentication
  AUTH_AUTHENTICATE: 'auth:authenticate',

  // Presence
  PRESENCE_JOIN: 'presence:join',
  PRESENCE_LEAVE: 'presence:leave',
  PRESENCE_STATUS: 'presence:status',
  PRESENCE_UPDATE: 'presence:update',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  // Messages
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_TYPING: 'message:typing',

  // Rooms
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',

  // Data sync
  DATA_SYNC: 'data:sync',
  DATA_SUBSCRIBE: 'data:subscribe',
  DATA_UNSUBSCRIBE: 'data:unsubscribe',
  WIDGET_UPDATE: 'widget:update',
  WIDGET_SUBSCRIBE: 'widget:subscribe',
  WIDGET_UNSUBSCRIBE: 'widget:unsubscribe',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_MARK_READ: 'notification:mark_read',
  NOTIFICATION_MARK_ALL_READ: 'notification:mark_all_read',

  // System
  SYSTEM_MAINTENANCE: 'system:maintenance',
  SYSTEM_ANNOUNCEMENT: 'system:announcement',
} as const;

// Helper function to initialize the real-time system
export const initializeRealtimeSystem = async (config?: {
  serverUrl?: string;
  autoConnect?: boolean;
  enableDebugLogs?: boolean;
  maxReconnectAttempts?: number;
}) => {
  try {
    // Initialize configuration
    initializeRealtimeConfig({
      serverUrl: config?.serverUrl || REALTIME_CONFIG.SERVER_URL,
      autoConnect: config?.autoConnect ?? REALTIME_CONFIG.AUTO_CONNECT,
      reconnectAttempts: config?.maxReconnectAttempts || REALTIME_CONFIG.RECONNECT_ATTEMPTS,
      enableDebugLogs: config?.enableDebugLogs ?? REALTIME_CONFIG.ENABLE_DEBUG_LOGS,
    });

    // Create socket connection if auto-connect is enabled
    if (config?.autoConnect ?? REALTIME_CONFIG.AUTO_CONNECT) {
      const socket = await createSocketConnection();

      if (socket) {
        console.log('✅ Real-time system initialized successfully');
        return true;
      } else {
        console.error('❌ Failed to initialize real-time system');
        return false;
      }
    }

    console.log('⚙️ Real-time system configured (manual connection required)');
    return true;

  } catch (error) {
    console.error('❌ Error initializing real-time system:', error);
    return false;
  }
};

// Helper function to get system health status
export const getRealtimeSystemHealth = () => {
  const socket = getSocket();
  const metrics = getPerformanceMetrics();

  return {
    isConnected: isSocketConnected(),
    socketId: socket?.id || null,
    onlineUsers: getOnlineUsersCount(),
    metrics: {
      latency: metrics.latency,
      uptime: metrics.connectionUptime,
      packetsReceived: metrics.packetsReceived,
      packetsSent: metrics.packetsSent,
      reconnects: metrics.reconnects,
      errors: metrics.errors,
    },
    performance: {
      connectionQuality: metrics.latency < 50 ? 'excellent' :
                        metrics.latency < 100 ? 'good' :
                        metrics.latency < 200 ? 'fair' :
                        metrics.latency < 500 ? 'poor' : 'very poor',
      recommendedPollingInterval: metrics.latency < 50 ? 1000 :
                                 metrics.latency < 100 ? 2000 :
                                 metrics.latency < 200 ? 3000 :
                                 metrics.latency < 500 ? 5000 : 10000,
    },
    timestamp: new Date().toISOString(),
  };
};

export default {
  initializeRealtimeSystem,
  getRealtimeSystemHealth,
  REALTIME_CONFIG,
  SOCKET_EVENTS,
};
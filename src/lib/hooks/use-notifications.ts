import { useState, useEffect, useCallback, useRef } from 'react';

import { getSocket } from '@/lib/realtime/client';
import type {
  UseNotificationsReturn,
  RealtimeNotification,
  NotificationType,
  NotificationPriority,
} from '@/types/realtime';

/**
 * Hook for managing real-time notifications
 */
export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {return;}

    socketRef.current = socket;
    setIsLoading(true);

    // Listen for new notifications
    socket.on('notification:new', (notification: RealtimeNotification) => {
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => n.id === notification.id);
        if (exists) {return prev;}

        const updated = [notification, ...prev];

        // Keep only last 100 notifications
        if (updated.length > 100) {
          return updated.slice(0, 100);
        }

        return updated;
      });

      // Update unread count
      if (!notification.isRead) {
        setUnreadCount(prev => prev + 1);
      }

      // Show browser notification for high priority
      if (notification.priority === 'urgent' || notification.priority === 'high') {
        showBrowserNotification(notification);
      }
    });

    // Listen for read status updates
    socket.on('notification:read', (notificationId: string) => {
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // Request initial notifications
    socket.emit('notification:get_all', (success: boolean, initialNotifications: RealtimeNotification[]) => {
      if (success) {
        setNotifications(initialNotifications || []);
        const unreadNotifications = (initialNotifications || []).filter(n => !n.isRead);
        setUnreadCount(unreadNotifications.length);
      }
      setIsLoading(false);
    });

    return () => {
      if (socket) {
        socket.off('notification:new');
        socket.off('notification:read');
      }
    };
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('notification:mark_read', notificationId);
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    const socket = getSocket();
    if (socket) {
      socket.emit('notification:mark_all_read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  }, []);

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    // Update unread count if the cleared notification was unread
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };
};

/**
 * Hook for creating and sending notifications
 */
export const useNotificationSender = () => {
  const sendNotification = useCallback(async (
    notification: Omit<RealtimeNotification, 'id' | 'userId' | 'isRead' | 'createdAt'>,
    targetUsers?: string[]
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) {
        resolve(false);
        return;
      }

      socket.emit('notification:send', {
        ...notification,
        targetUsers,
      }, (success: boolean) => {
        resolve(success);
      });
    });
  }, []);

  const sendSystemNotification = useCallback(async (
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    data?: any
  ): Promise<boolean> => {
    return sendNotification({
      type,
      title,
      message,
      priority,
      data,
    });
  }, [sendNotification]);

  const sendUserNotification = useCallback(async (
    targetUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    data?: any
  ): Promise<boolean> => {
    return sendNotification({
      type,
      title,
      message,
      priority,
      data,
    }, [targetUserId]);
  }, [sendNotification]);

  return {
    sendNotification,
    sendSystemNotification,
    sendUserNotification,
  };
};

/**
 * Hook for filtered notifications
 */
export const useFilteredNotifications = (filters?: {
  type?: NotificationType;
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  limit?: number;
}) => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  const filteredNotifications = notifications.filter(notification => {
    if (filters?.type && notification.type !== filters.type) {
      return false;
    }

    if (filters?.priority && notification.priority !== filters.priority) {
      return false;
    }

    if (filters?.unreadOnly && notification.isRead) {
      return false;
    }

    // Check expiration
    if (notification.expiresAt && new Date(notification.expiresAt) < new Date()) {
      return false;
    }

    return true;
  }).slice(0, filters?.limit || notifications.length);

  const filteredUnreadCount = filteredNotifications.filter(n => !n.isRead).length;

  return {
    notifications: filteredNotifications,
    unreadCount: filters?.unreadOnly ? filteredUnreadCount : unreadCount,
    totalCount: notifications.length,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };
};

/**
 * Hook for notification permissions and browser notifications
 */
export const useNotificationPermissions = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {return false;}

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    requestPermission,
  };
};

/**
 * Show browser notification
 */
const showBrowserNotification = (notification: RealtimeNotification) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.priority === 'urgent',
    });

    // Auto-close after 5 seconds for non-urgent notifications
    if (notification.priority !== 'urgent') {
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }

    browserNotification.onclick = () => {
      window.focus();
      browserNotification.close();

      // Handle notification click based on type and data
      if (notification.data?.url) {
        window.location.href = notification.data.url;
      }
    };
  }
};

/**
 * Hook for notification sound effects
 */
export const useNotificationSounds = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio for notification sounds
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.3;
  }, []);

  const playNotificationSound = useCallback((priority: NotificationPriority = 'normal') => {
    if (!soundEnabled || !audioRef.current) {return;}

    try {
      // Different sounds for different priorities
      switch (priority) {
        case 'urgent':
          audioRef.current.volume = 0.6;
          break;
        case 'high':
          audioRef.current.volume = 0.4;
          break;
        default:
          audioRef.current.volume = 0.3;
      }

      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [soundEnabled]);

  return {
    soundEnabled,
    setSoundEnabled,
    playNotificationSound,
  };
};

/**
 * Hook for notification analytics
 */
export const useNotificationAnalytics = () => {
  const [stats, setStats] = useState<{
    totalReceived: number;
    totalRead: number;
    averageReadTime: number;
    typeBreakdown: Record<NotificationType, number>;
    priorityBreakdown: Record<NotificationPriority, number>;
  }>({
    totalReceived: 0,
    totalRead: 0,
    averageReadTime: 0,
    typeBreakdown: {} as Record<NotificationType, number>,
    priorityBreakdown: {} as Record<NotificationPriority, number>,
  });

  const { notifications } = useNotifications();

  useEffect(() => {
    const totalReceived = notifications.length;
    const readNotifications = notifications.filter(n => n.isRead);
    const totalRead = readNotifications.length;

    // Calculate type breakdown
    const typeBreakdown: Record<string, number> = {};
    const priorityBreakdown: Record<string, number> = {};

    notifications.forEach(notification => {
      typeBreakdown[notification.type] = (typeBreakdown[notification.type] || 0) + 1;
      priorityBreakdown[notification.priority] = (priorityBreakdown[notification.priority] || 0) + 1;
    });

    setStats({
      totalReceived,
      totalRead,
      averageReadTime: 0, // This would require tracking read timestamps
      typeBreakdown: typeBreakdown as Record<NotificationType, number>,
      priorityBreakdown: priorityBreakdown as Record<NotificationPriority, number>,
    });
  }, [notifications]);

  return stats;
};
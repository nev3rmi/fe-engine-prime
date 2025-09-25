import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/realtime/client';
import {
  UsePresenceReturn,
  OnlineUser,
  PresenceStatus,
} from '@/types/realtime';

/**
 * Hook for managing user presence (online/offline status)
 */
export const usePresence = (): UsePresenceReturn => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentUser, setCurrentUser] = useState<OnlineUser | null>(null);
  const [userCount, setUserCount] = useState(0);

  const socketRef = useRef<any>(null);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socketRef.current = socket;

    // Join presence system
    socket.emit('presence:join');

    // Listen for presence updates
    socket.on('presence:update', (users: OnlineUser[]) => {
      setOnlineUsers(users);
      setUserCount(users.length);

      // Update current user if in the list
      const currentUserId = currentUserIdRef.current;
      if (currentUserId) {
        const currentUserData = users.find(u => u.id === currentUserId);
        if (currentUserData) {
          setCurrentUser(currentUserData);
        }
      }
    });

    socket.on('user:online', (user: Pick<OnlineUser, 'id' | 'name' | 'image' | 'role'>) => {
      const newUser: OnlineUser = {
        ...user,
        status: 'online',
        lastActivity: new Date(),
      };

      setOnlineUsers(prev => {
        const existingIndex = prev.findIndex(u => u.id === user.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newUser;
          return updated;
        } else {
          return [...prev, newUser];
        }
      });
    });

    socket.on('user:offline', (userId: string) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== userId));

      // If current user went offline, clear current user
      if (userId === currentUserIdRef.current) {
        setCurrentUser(null);
      }
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.off('presence:update');
        socket.off('user:online');
        socket.off('user:offline');
        socket.emit('presence:leave');
      }
    };
  }, []);

  // Set current user ID from socket data
  useEffect(() => {
    const socket = getSocket();
    if (socket && (socket as any).auth?.userId) {
      currentUserIdRef.current = (socket as any).auth.userId;
    }
  }, []);

  const updateStatus = useCallback((status: PresenceStatus) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('presence:status', status);

      // Update current user status locally
      setCurrentUser(prev => {
        if (prev) {
          return {
            ...prev,
            status,
            lastActivity: new Date(),
          };
        }
        return prev;
      });
    }
  }, []);

  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.some(u => u.id === userId);
  }, [onlineUsers]);

  const getUserStatus = useCallback((userId: string): PresenceStatus | null => {
    const user = onlineUsers.find(u => u.id === userId);
    return user?.status || null;
  }, [onlineUsers]);

  return {
    onlineUsers,
    currentUser,
    userCount,
    updateStatus,
    isUserOnline,
    getUserStatus,
  };
};

/**
 * Hook for specific user presence monitoring
 */
export const useUserPresence = (userId: string) => {
  const { onlineUsers, isUserOnline, getUserStatus } = usePresence();

  const user = onlineUsers.find(u => u.id === userId);
  const isOnline = isUserOnline(userId);
  const status = getUserStatus(userId);

  return {
    user,
    isOnline,
    status,
    lastActivity: user?.lastActivity || null,
  };
};

/**
 * Hook for presence indicators with automatic status updates
 */
export const usePresenceIndicator = () => {
  const { currentUser, updateStatus } = usePresence();
  const [autoStatus, setAutoStatus] = useState<PresenceStatus>('online');
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-update status based on activity
  useEffect(() => {
    const handleActivity = () => {
      if (autoStatus !== 'online') {
        setAutoStatus('online');
        updateStatus('online');
      }

      // Reset inactivity timer
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }

      // Set to away after 5 minutes of inactivity
      inactivityTimeoutRef.current = setTimeout(() => {
        setAutoStatus('away');
        updateStatus('away');
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Handle page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setAutoStatus('away');
        updateStatus('away');
      } else {
        setAutoStatus('online');
        updateStatus('online');
        handleActivity(); // Reset timer
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial activity
    handleActivity();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [autoStatus, updateStatus]);

  return {
    currentUser,
    autoStatus,
    manualUpdateStatus: updateStatus,
  };
};

/**
 * Hook for room-based presence
 */
export const useRoomPresence = (roomId: string) => {
  const [roomUsers, setRoomUsers] = useState<OnlineUser[]>([]);
  const { onlineUsers } = usePresence();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Join room for presence tracking
    socket.emit('room:join', roomId, (success: boolean) => {
      if (!success) {
        console.error('Failed to join room for presence:', roomId);
      }
    });

    // Listen for room-specific presence updates
    socket.on('room:presence:update', (users: OnlineUser[]) => {
      setRoomUsers(users);
    });

    return () => {
      if (socket) {
        socket.off('room:presence:update');
        socket.emit('room:leave', roomId, () => {});
      }
    };
  }, [roomId]);

  // Filter global online users by room if room-specific updates not available
  useEffect(() => {
    if (roomUsers.length === 0) {
      // Fallback: filter from global online users if room-specific data not available
      // This would require additional room membership data
      setRoomUsers(onlineUsers.filter(user => user.room === roomId));
    }
  }, [onlineUsers, roomId, roomUsers.length]);

  return {
    users: roomUsers,
    count: roomUsers.length,
  };
};
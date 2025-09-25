import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { NextApiRequest } from 'next';
import { getToken } from 'next-auth/jwt';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  AuthenticatedUser,
  OnlineUser,
  PresenceStatus,
  ChatMessage,
  NewChatMessage,
  RealtimeNotification,
} from '@/types/realtime';
import { getUserById } from '@/lib/auth/user-service';
import { hasPermission } from '@/lib/auth/permissions';
import { Permission } from '@/types/auth';

// Global socket server instance
let io: SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null = null;

// In-memory stores (replace with database in production)
const onlineUsers = new Map<string, OnlineUser>();
const userSockets = new Map<string, string[]>(); // userId -> socketIds
const chatMessages = new Map<string, ChatMessage[]>(); // channelId -> messages
const userNotifications = new Map<string, RealtimeNotification[]>(); // userId -> notifications

/**
 * Initialize Socket.io server
 */
export const initializeSocketServer = (server: HTTPServer): SocketIOServer => {
  if (io) {
    return io;
  }

  io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('No authentication token provided'));
      }

      // Create headers object for NextAuth getToken
      const headers = new Headers();
      headers.set('authorization', `Bearer ${token}`);

      // Verify JWT token using NextAuth
      const decoded = await getToken({
        req: { headers } as Request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!decoded || !decoded.userId) {
        return next(new Error('Invalid authentication token'));
      }

      // Get user details from database
      const user = await getUserById(decoded.userId as string);
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      // Check if user has real-time chat permission
      const hasChat = await hasPermission(user, 'chat:read' as Permission);
      if (!hasChat) {
        return next(new Error('Insufficient permissions for real-time features'));
      }

      // Attach user data to socket
      socket.data.userId = user.id;
      socket.data.user = {
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
        role: user.role,
        permissions: [], // Will be populated based on role
        username: user.username || undefined,
      };
      socket.data.rooms = [];
      socket.data.lastActivity = new Date();
      socket.data.subscriptions = [];

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} for user: ${socket.data.userId}`);

    // Handle authentication confirmation
    socket.on('auth:authenticate', async (token, callback) => {
      try {
        callback(true, socket.data.user);
      } catch (error) {
        callback(false);
      }
    });

    // Handle presence events
    socket.on('presence:join', () => {
      handleUserOnline(socket);
    });

    socket.on('presence:leave', () => {
      handleUserOffline(socket);
    });

    socket.on('presence:status', (status: PresenceStatus) => {
      updateUserStatus(socket.data.userId, status);
    });

    // Handle chat messages
    socket.on('message:send', async (message: NewChatMessage, callback) => {
      try {
        const sentMessage = await handleNewMessage(socket, message);
        if (sentMessage) {
          callback(true, sentMessage);
        } else {
          callback(false);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        callback(false);
      }
    });

    socket.on('message:edit', async (messageId: string, content: string, callback) => {
      try {
        const success = await handleEditMessage(socket, messageId, content);
        callback(success);
      } catch (error) {
        console.error('Error editing message:', error);
        callback(false);
      }
    });

    socket.on('message:delete', async (messageId: string, callback) => {
      try {
        const success = await handleDeleteMessage(socket, messageId);
        callback(success);
      } catch (error) {
        console.error('Error deleting message:', error);
        callback(false);
      }
    });

    socket.on('message:typing', (channelId: string, isTyping: boolean) => {
      const onlineUser: OnlineUser = {
        id: socket.data.user.id,
        name: socket.data.user.name,
        image: socket.data.user.image,
        role: socket.data.user.role,
        status: 'online' as PresenceStatus,
        lastActivity: socket.data.lastActivity,
      };

      socket.to(`channel:${channelId}`).emit('user:typing', {
        userId: socket.data.userId,
        user: onlineUser,
        isTyping,
      });
    });

    // Handle room management
    socket.on('room:join', (roomId: string, callback) => {
      try {
        socket.join(`channel:${roomId}`);
        if (!socket.data.rooms.includes(roomId)) {
          socket.data.rooms.push(roomId);
        }
        callback(true);
      } catch (error) {
        console.error('Error joining room:', error);
        callback(false);
      }
    });

    socket.on('room:leave', (roomId: string, callback) => {
      try {
        socket.leave(`channel:${roomId}`);
        socket.data.rooms = socket.data.rooms.filter(r => r !== roomId);
        callback(true);
      } catch (error) {
        console.error('Error leaving room:', error);
        callback(false);
      }
    });

    // Handle data subscriptions
    socket.on('data:subscribe', (dataType: string, filters?: any) => {
      const subscription = `${dataType}:${JSON.stringify(filters || {})}`;
      if (!socket.data.subscriptions.includes(subscription)) {
        socket.data.subscriptions.push(subscription);
      }
      socket.join(`data:${dataType}`);
    });

    socket.on('data:unsubscribe', (dataType: string) => {
      socket.data.subscriptions = socket.data.subscriptions.filter(
        sub => !sub.startsWith(`${dataType}:`)
      );
      socket.leave(`data:${dataType}`);
    });

    socket.on('widget:subscribe', (widgetId: string) => {
      socket.join(`widget:${widgetId}`);
    });

    socket.on('widget:unsubscribe', (widgetId: string) => {
      socket.leave(`widget:${widgetId}`);
    });

    // Handle notifications
    socket.on('notification:mark_read', (notificationId: string) => {
      markNotificationAsRead(socket.data.userId, notificationId);
      socket.emit('notification:read', notificationId);
    });

    socket.on('notification:mark_all_read', () => {
      markAllNotificationsAsRead(socket.data.userId);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} for user: ${socket.data.userId}, reason: ${reason}`);
      handleUserOffline(socket);
    });

    // Activity tracking
    socket.use((__, next) => {
      socket.data.lastActivity = new Date();
      next();
    });

    // Auto-join user to presence system
    handleUserOnline(socket);
  });

  // Cleanup inactive users periodically
  setInterval(() => {
    cleanupInactiveUsers();
  }, 60000); // Every minute

  console.log('Socket.io server initialized');
  return io;
};

/**
 * Get Socket.io server instance
 */
export const getSocketServer = (): SocketIOServer | null => {
  return io;
};

/**
 * Handle user coming online
 */
const handleUserOnline = (socket: Socket) => {
  const user = socket.data.user;
  const onlineUser: OnlineUser = {
    id: user.id,
    name: user.name,
    image: user.image,
    role: user.role,
    status: 'online',
    lastActivity: new Date(),
  };

  onlineUsers.set(user.id, onlineUser);

  // Track socket for this user
  if (!userSockets.has(user.id)) {
    userSockets.set(user.id, []);
  }
  userSockets.get(user.id)!.push(socket.id);

  // Notify all clients
  socket.broadcast.emit('user:online', {
    id: user.id,
    name: user.name,
    image: user.image,
    role: user.role,
  });

  // Send current online users to the new user
  socket.emit('presence:update', Array.from(onlineUsers.values()));
};

/**
 * Handle user going offline
 */
const handleUserOffline = (socket: Socket) => {
  const userId = socket.data.userId;

  // Remove this socket from user's socket list
  const userSocketList = userSockets.get(userId);
  if (userSocketList) {
    const index = userSocketList.indexOf(socket.id);
    if (index > -1) {
      userSocketList.splice(index, 1);
    }

    // If no more sockets for this user, mark as offline
    if (userSocketList.length === 0) {
      onlineUsers.delete(userId);
      userSockets.delete(userId);

      // Notify all clients
      socket.broadcast.emit('user:offline', userId);
      socket.broadcast.emit('presence:update', Array.from(onlineUsers.values()));
    }
  }
};

/**
 * Update user presence status
 */
const updateUserStatus = (userId: string, status: PresenceStatus) => {
  const user = onlineUsers.get(userId);
  if (user) {
    user.status = status;
    user.lastActivity = new Date();
    onlineUsers.set(userId, user);

    // Notify all clients
    io?.emit('presence:update', Array.from(onlineUsers.values()));
  }
};

/**
 * Handle new chat message
 */
const handleNewMessage = async (
  socket: Socket,
  message: NewChatMessage
): Promise<ChatMessage | null> => {
  try {
    // Check permissions
    if (!hasPermission(socket.data.user.permissions, 'chat:write' as Permission)) {
      return null;
    }

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: message.content,
      type: message.type,
      authorId: socket.data.userId,
      author: {
        id: socket.data.user.id,
        name: socket.data.user.name,
        image: socket.data.user.image,
        role: socket.data.user.role,
      },
      channelId: message.channelId,
      replyToId: message.replyToId,
      attachments: message.attachments,
      mentions: message.mentions,
      reactions: [],
      isEdited: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store message (in production, save to database)
    if (!chatMessages.has(message.channelId)) {
      chatMessages.set(message.channelId, []);
    }
    const channelMessages = chatMessages.get(message.channelId)!;
    channelMessages.push(newMessage);

    // Keep only last 1000 messages per channel
    if (channelMessages.length > 1000) {
      channelMessages.splice(0, channelMessages.length - 1000);
    }

    // Emit to all users in the channel
    io?.to(`channel:${message.channelId}`).emit('message:new', newMessage);

    // Create notifications for mentions
    if (message.mentions && message.mentions.length > 0) {
      message.mentions.forEach(mentionedUserId => {
        if (mentionedUserId !== socket.data.userId) {
          createNotification(mentionedUserId, {
            type: 'mention',
            title: `${socket.data.user.name} mentioned you`,
            message: message.content.substring(0, 100),
            data: { messageId: newMessage.id, channelId: message.channelId },
            priority: 'normal',
          });
        }
      });
    }

    return newMessage;
  } catch (error) {
    console.error('Error handling new message:', error);
    return null;
  }
};

/**
 * Handle message edit
 */
const handleEditMessage = async (
  socket: Socket,
  messageId: string,
  content: string
): Promise<boolean> => {
  try {
    // Find the message
    for (const [channelId, messages] of chatMessages.entries()) {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex > -1) {
        const message = messages[messageIndex];
        if (!message) return false;

        // Check if user can edit (author or has permission)
        if (message.authorId !== socket.data.userId &&
            !hasPermission(socket.data.user.permissions, 'chat:moderate' as Permission)) {
          return false;
        }

        // Update message
        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        message.updatedAt = new Date();

        // Emit update
        io?.to(`channel:${channelId}`).emit('message:edit', {
          id: messageId,
          content,
          isEdited: true,
          editedAt: message.editedAt,
          updatedAt: message.updatedAt,
        });

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error editing message:', error);
    return false;
  }
};

/**
 * Handle message delete
 */
const handleDeleteMessage = async (
  socket: Socket,
  messageId: string
): Promise<boolean> => {
  try {
    // Find and remove the message
    for (const [channelId, messages] of chatMessages.entries()) {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex > -1) {
        const message = messages[messageIndex];
        if (!message) return false;

        // Check if user can delete (author or has permission)
        if (message.authorId !== socket.data.userId &&
            !hasPermission(socket.data.user.permissions, 'chat:moderate' as Permission)) {
          return false;
        }

        // Remove message
        messages.splice(messageIndex, 1);

        // Emit deletion
        io?.to(`channel:${channelId}`).emit('message:delete', messageId);

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
};

/**
 * Create notification for user
 */
const createNotification = (
  userId: string,
  notification: Omit<RealtimeNotification, 'id' | 'userId' | 'isRead' | 'createdAt'>
) => {
  const newNotification: RealtimeNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    isRead: false,
    createdAt: new Date(),
  };

  // Store notification
  if (!userNotifications.has(userId)) {
    userNotifications.set(userId, []);
  }
  const userNotifs = userNotifications.get(userId)!;
  userNotifs.unshift(newNotification);

  // Keep only last 100 notifications per user
  if (userNotifs.length > 100) {
    userNotifs.splice(100);
  }

  // Send to user if online
  const userSocketList = userSockets.get(userId);
  if (userSocketList && userSocketList.length > 0) {
    userSocketList.forEach(socketId => {
      io?.to(socketId).emit('notification:new', newNotification);
    });
  }
};

/**
 * Mark notification as read
 */
const markNotificationAsRead = (userId: string, notificationId: string) => {
  const userNotifs = userNotifications.get(userId);
  if (userNotifs) {
    const notification = userNotifs.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
    }
  }
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = (userId: string) => {
  const userNotifs = userNotifications.get(userId);
  if (userNotifs) {
    userNotifs.forEach(n => n.isRead = true);
  }
};

/**
 * Clean up inactive users
 */
const cleanupInactiveUsers = () => {
  const now = new Date();
  const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

  for (const [userId, user] of onlineUsers.entries()) {
    if (now.getTime() - user.lastActivity.getTime() > inactiveThreshold) {
      onlineUsers.delete(userId);
      userSockets.delete(userId);

      // Notify all clients
      io?.emit('user:offline', userId);
    }
  }

  // Update presence
  io?.emit('presence:update', Array.from(onlineUsers.values()));
};

/**
 * Broadcast data synchronization
 */
export const broadcastDataSync = (dataType: string, data: any, userId?: string) => {
  if (!io) return;

  const syncData = {
    type: dataType,
    data,
    timestamp: new Date(),
    version: Date.now(),
    userId,
  };

  io.to(`data:${dataType}`).emit('data:sync', syncData);
};

/**
 * Update widget data
 */
export const updateWidget = (widgetId: string, data: any) => {
  if (!io) return;

  io.to(`widget:${widgetId}`).emit('widget:update', widgetId, {
    data,
    lastUpdated: new Date(),
  });
};

/**
 * Send system notification
 */
export const sendSystemNotification = (
  notification: Omit<RealtimeNotification, 'id' | 'userId' | 'isRead' | 'createdAt'>,
  targetUsers?: string[]
) => {
  if (!io) return;

  if (targetUsers) {
    targetUsers.forEach(userId => createNotification(userId, notification));
  } else {
    // Broadcast to all connected users
    const allNotification: RealtimeNotification = {
      ...notification,
      id: `sys_notif_${Date.now()}`,
      userId: 'system',
      isRead: false,
      createdAt: new Date(),
    };

    io.emit('notification:new', allNotification);
  }
};

/**
 * Get online users count
 */
export const getOnlineUsersCount = (): number => {
  return onlineUsers.size;
};

/**
 * Get online users list
 */
export const getOnlineUsers = (): OnlineUser[] => {
  return Array.from(onlineUsers.values());
};
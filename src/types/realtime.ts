import type { User, UserRole, Permission } from './auth';

// Socket.io event types
export interface ServerToClientEvents {
  // Authentication
  'auth:authenticate': (success: boolean, user?: AuthenticatedUser) => void;

  // Presence events
  'user:online': (user: Pick<User, 'id' | 'name' | 'image' | 'role'>) => void;
  'user:offline': (userId: string) => void;
  'user:typing': (data: { userId: string; user: OnlineUser; isTyping: boolean }) => void;
  'presence:update': (users: OnlineUser[]) => void;

  // Message events
  'message:new': (message: ChatMessage) => void;
  'message:edit': (message: Partial<ChatMessage> & { id: string }) => void;
  'message:delete': (messageId: string) => void;
  'message:reaction': (data: { messageId: string; reactions: any }) => void;

  // Notification events
  'notification:new': (notification: RealtimeNotification) => void;
  'notification:read': (notificationId: string) => void;

  // Data sync events
  'data:sync': (data: SyncData) => void;
  'widget:update': (widgetId: string, data: any) => void;

  // System events
  'system:maintenance': (message: string, duration?: number) => void;
  'system:announcement': (announcement: Announcement) => void;

  // Room events
  'room:presence:update': (users: OnlineUser[]) => void;

  // Connection events
  'reconnect': (attemptNumber: number) => void;
  'reconnect_error': (error: Error) => void;
  'reconnect_failed': () => void;
}

export interface ClientToServerEvents {
  // Authentication
  'auth:authenticate': (token: string, callback: (success: boolean, user?: AuthenticatedUser) => void) => void;

  // Presence events
  'presence:join': () => void;
  'presence:leave': () => void;
  'presence:status': (status: PresenceStatus) => void;
  'presence:update': (users: any) => void;
  'user:join': (channelId: string) => void;
  'user:leave': (channelId: string) => void;

  // Message events
  'message:send': (message: NewChatMessage, callback: (success: boolean, message?: ChatMessage) => void) => void;
  'message:edit': (messageId: string, content: string, callback: (success: boolean) => void) => void;
  'message:delete': (messageId: string, callback: (success: boolean) => void) => void;
  'message:typing': (channelId: string, isTyping: boolean) => void;
  'message:add_reaction': (messageId: string, emoji: string, callback: (success: boolean) => void) => void;
  'message:remove_reaction': (messageId: string, emoji: string, callback: (success: boolean) => void) => void;
  'message:history': (params: { channelId: string; limit: number; before?: string }, callback?: (success: boolean, messages: ChatMessage[], hasMoreMessages: boolean) => void) => void;
  'message:received': (messageId: string) => void;

  // Room management
  'room:join': (roomId: string, callback: (success: boolean) => void) => void;
  'room:leave': (roomId: string, callback: (success: boolean) => void) => void;

  // Data subscriptions
  'data:subscribe': (dataType: string, filters?: any) => void;
  'data:unsubscribe': (dataType: string) => void;
  'data:sync': (data: any) => void;
  'data:update': (data: any, callback?: (success: boolean) => void) => void;
  'data:request': (params: { type: string; filters?: any } | string, callback?: (success: boolean, data: any) => void) => void;
  'widget:subscribe': (widgetId: string) => void;
  'widget:unsubscribe': (widgetId: string) => void;
  'widget:refresh': (widgetId: string, callback?: (success: boolean, data: any) => void) => void;
  'widget:request': (widgetId: string, callback?: (success: boolean, data: any) => void) => void;
  'widget:update_data': (widgetId: string, data: any, callback?: (success: boolean) => void) => void;

  // Notifications
  'notification:mark_read': (notificationId: string) => void;
  'notification:mark_all_read': () => void;
  'notification:send': (notification: any, callback?: (success: boolean) => void) => void;
  'notification:read': (notificationId: string) => void;
  'notification:received': (notificationId: string) => void;
  'notification:get_all': (callback: (success: boolean, notifications: RealtimeNotification[]) => void) => void;

  // System events
  'connect': () => void;
  'disconnect': () => void;
  'ping': () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  user: AuthenticatedUser;
  rooms: string[];
  lastActivity: Date;
  subscriptions: string[];
}

// User presence types
export interface OnlineUser {
  id: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  status: PresenceStatus;
  lastActivity: Date;
  room?: string;
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'invisible';

export interface AuthenticatedUser extends Pick<User, 'id' | 'name' | 'image' | 'email' | 'role'> {
  permissions: Permission[];
  username?: string;
}

// Chat message types
export interface ChatMessage {
  id: string;
  content: string;
  type: MessageType;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'image' | 'role'>;
  channelId: string;
  replyToId?: string;
  attachments?: MessageAttachment[];
  mentions?: string[];
  reactions?: MessageReaction[];
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewChatMessage {
  content: string;
  type: MessageType;
  channelId: string;
  replyToId?: string;
  attachments?: MessageAttachment[];
  mentions?: string[];
}

export type MessageType = 'text' | 'image' | 'file' | 'system' | 'announcement';

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

// Notification types
export interface RealtimeNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  userId: string;
  isRead: boolean;
  priority: NotificationPriority;
  expiresAt?: Date;
  createdAt: Date;
}

export type NotificationType =
  | 'message'
  | 'mention'
  | 'system'
  | 'warning'
  | 'error'
  | 'success'
  | 'update'
  | 'maintenance';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Data synchronization types
export interface SyncData {
  type: string;
  data: any;
  timestamp: Date;
  version: number;
  userId?: string;
}

export interface WidgetData {
  id: string;
  type: string;
  data: any;
  lastUpdated: Date;
  refreshRate?: number;
}

// System announcements
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'maintenance' | 'feature';
  priority: 'low' | 'normal' | 'high';
  startDate: Date;
  endDate?: Date;
  targetRoles?: UserRole[];
  isActive: boolean;
}

// Connection and room types
export interface Room {
  id: string;
  name: string;
  type: RoomType;
  description?: string;
  isPrivate: boolean;
  allowedRoles: UserRole[];
  maxUsers?: number;
  currentUsers: OnlineUser[];
  createdAt: Date;
}

export type RoomType = 'general' | 'team' | 'project' | 'support' | 'admin';

// Real-time hooks return types
export interface UseRealtimeReturn {
  isConnected: boolean;
  socket: any;
  connectionError: string | null;
  reconnectAttempts: number;
  lastActivity: Date | null;
  currentUser: AuthenticatedUser | null;
  connect: () => void;
  disconnect: () => void;
}

export interface UsePresenceReturn {
  onlineUsers: OnlineUser[];
  currentUser: OnlineUser | null;
  userCount: number;
  updateStatus: (status: PresenceStatus) => void;
  isUserOnline: (userId: string) => boolean;
  getUserStatus: (userId: string) => PresenceStatus | null;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: NewChatMessage) => Promise<boolean>;
  editMessage: (messageId: string, content: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  isTyping: boolean;
  typingUsers: OnlineUser[];
  setTyping: (isTyping: boolean) => void;
}

export interface UseNotificationsReturn {
  notifications: RealtimeNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
}

// Event handlers
export type SocketEventHandler<T = any> = (data: T) => void;

// Configuration types
export interface RealtimeConfig {
  serverUrl: string;
  autoConnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  presenceUpdateInterval: number;
  messageHistoryLimit: number;
  notificationRetentionDays: number;
  enableDebugLogs: boolean;
}

// Performance monitoring
export interface PerformanceMetrics {
  latency: number;
  packetsReceived: number;
  packetsSent: number;
  reconnects: number;
  errors: number;
  lastPing: Date;
  connectionUptime: number;
}
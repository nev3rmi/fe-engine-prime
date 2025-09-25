import { User, UserRole, Permission } from './auth';

// Socket.io event types
export interface ServerToClientEvents {
  // Presence events
  'user:online': (user: Pick<User, 'id' | 'name' | 'image' | 'role'>) => void;
  'user:offline': (userId: string) => void;
  'presence:update': (users: OnlineUser[]) => void;

  // Message events
  'message:new': (message: ChatMessage) => void;
  'message:edit': (message: Partial<ChatMessage> & { id: string }) => void;
  'message:delete': (messageId: string) => void;

  // Notification events
  'notification:new': (notification: RealtimeNotification) => void;
  'notification:read': (notificationId: string) => void;

  // Data sync events
  'data:sync': (data: SyncData) => void;
  'widget:update': (widgetId: string, data: any) => void;

  // System events
  'system:maintenance': (message: string, duration?: number) => void;
  'system:announcement': (announcement: Announcement) => void;
}

export interface ClientToServerEvents {
  // Authentication
  'auth:authenticate': (token: string, callback: (success: boolean, user?: AuthenticatedUser) => void) => void;

  // Presence events
  'presence:join': () => void;
  'presence:leave': () => void;
  'presence:status': (status: PresenceStatus) => void;

  // Message events
  'message:send': (message: NewChatMessage, callback: (success: boolean, message?: ChatMessage) => void) => void;
  'message:edit': (messageId: string, content: string, callback: (success: boolean) => void) => void;
  'message:delete': (messageId: string, callback: (success: boolean) => void) => void;
  'message:typing': (channelId: string, isTyping: boolean) => void;

  // Room management
  'room:join': (roomId: string, callback: (success: boolean) => void) => void;
  'room:leave': (roomId: string, callback: (success: boolean) => void) => void;

  // Data subscriptions
  'data:subscribe': (dataType: string, filters?: any) => void;
  'data:unsubscribe': (dataType: string) => void;
  'widget:subscribe': (widgetId: string) => void;
  'widget:unsubscribe': (widgetId: string) => void;

  // Notifications
  'notification:mark_read': (notificationId: string) => void;
  'notification:mark_all_read': () => void;
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
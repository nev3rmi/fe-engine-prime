import { vi } from "vitest";
import { Socket } from "socket.io-client";

// Mock Socket.io instance
export const createMockSocket = (): Partial<Socket> => ({
  id: "mock-socket-id",
  connected: true,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  removeAllListeners: vi.fn(),
  listeners: vi.fn(() => []),
  listenerCount: vi.fn(() => 0),
  once: vi.fn(),
  hasListeners: vi.fn(() => false),
  compress: vi.fn(() => ({}) as any),
  timeout: vi.fn(() => ({}) as any),
  close: vi.fn(),
  open: vi.fn(),
  io: {} as any,
});

// Mock Socket.io client
export const mockSocketIoClient = (socket: Partial<Socket> = createMockSocket()) => {
  // Simply return the socket - actual mocking should be done in test setup
  return socket;
};

// Mock real-time hooks
export const mockRealtimeHooks = () => {
  vi.mock("@/lib/hooks/use-realtime", () => ({
    useRealtime: vi.fn(() => ({
      socket: createMockSocket(),
      isConnected: true,
      connectionStatus: "connected",
      currentUser: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    })),
  }));

  vi.mock("@/lib/hooks/use-presence", () => ({
    usePresence: vi.fn(() => ({
      onlineUsers: [],
      userCount: 0,
      isUserOnline: vi.fn(() => false),
      updatePresence: vi.fn(),
    })),
    useUserPresence: vi.fn(() => ({
      status: "offline",
      lastSeen: null,
      setStatus: vi.fn(),
    })),
    useRoomPresence: vi.fn(() => ({
      roomUsers: [],
      userCount: 0,
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
    })),
  }));

  vi.mock("@/lib/hooks/use-chat", () => ({
    useChat: vi.fn(() => ({
      messages: [],
      sendMessage: vi.fn(),
      editMessage: vi.fn(),
      deleteMessage: vi.fn(),
      reactToMessage: vi.fn(),
      replyToMessage: vi.fn(),
      isLoading: false,
      error: null,
      typingUsers: [],
      setTyping: vi.fn(),
    })),
  }));

  vi.mock("@/lib/hooks/use-notifications", () => ({
    useNotifications: vi.fn(() => ({
      notifications: [],
      unreadCount: 0,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      clearAll: vi.fn(),
      sendNotification: vi.fn(),
    })),
  }));

  vi.mock("@/lib/hooks/use-data-sync", () => ({
    useDataSync: vi.fn(() => ({
      data: null,
      isLoading: false,
      error: null,
      lastUpdated: null,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      refresh: vi.fn(),
    })),
  }));
};

// Socket event emitter helper
export class MockSocketEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(...args));
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Mock WebSocket server for integration tests
export const mockWebSocketServer = () => {
  const mockServer = new MockSocketEventEmitter();

  // Mock server-side Socket.io
  vi.mock("@/lib/realtime/server", () => ({
    initializeSocketServer: vi.fn(() => mockServer),
    authenticateSocket: vi.fn(() => Promise.resolve(true)),
  }));

  return mockServer;
};

// Common socket event scenarios
export const socketEventScenarios = {
  connect: (socket: any) => socket.emit("connect"),
  disconnect: (socket: any) => socket.emit("disconnect"),
  userJoin: (socket: any, user: any) => socket.emit("user:join", user),
  userLeave: (socket: any, user: any) => socket.emit("user:leave", user),
  messageReceived: (socket: any, message: any) => socket.emit("message:received", message),
  presenceUpdate: (socket: any, presence: any) => socket.emit("presence:update", presence),
  notificationReceived: (socket: any, notification: any) =>
    socket.emit("notification:received", notification),
  dataSync: (socket: any, data: any) => socket.emit("data:sync", data),
};

// Helper to simulate socket connection lifecycle
export const simulateSocketConnection = async (socket: any, user?: any) => {
  socketEventScenarios.connect(socket);

  if (user) {
    socketEventScenarios.userJoin(socket, user);
    socketEventScenarios.presenceUpdate(socket, { userId: user.id, status: "online" });
  }

  // Simulate connection delay
  await new Promise(resolve => setTimeout(resolve, 100));
};

// Helper to simulate socket disconnection
export const simulateSocketDisconnection = async (socket: any, user?: any) => {
  if (user) {
    socketEventScenarios.presenceUpdate(socket, { userId: user.id, status: "offline" });
    socketEventScenarios.userLeave(socket, user);
  }

  socketEventScenarios.disconnect(socket);

  // Simulate disconnection delay
  await new Promise(resolve => setTimeout(resolve, 100));
};

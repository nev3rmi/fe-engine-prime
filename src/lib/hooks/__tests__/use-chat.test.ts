import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@/test/utils/test-utils";
import { useChat } from "../use-chat";
import { createMockSocket, simulateSocketConnection } from "@/test/utils/socket-mocks";
import { createMockSession } from "@/test/utils/test-utils";

// Mock the realtime hook
vi.mock("@/lib/hooks/use-realtime", () => ({
  useRealtime: vi.fn(),
}));

describe("useChat Hook", () => {
  let mockSocket: any;
  let mockUseRealtime: any;

  beforeEach(() => {
    mockSocket = createMockSocket();
    mockUseRealtime = vi.mocked(await vi.importMocked("@/lib/hooks/use-realtime")).useRealtime;

    mockUseRealtime.mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      connectionStatus: "connected",
      currentUser: createMockSession().user,
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Chat Functionality", () => {
    it("should initialize with empty messages", () => {
      const { result } = renderHook(() => useChat("general"));

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.typingUsers).toEqual([]);
    });

    it("should send message correctly", async () => {
      const { result } = renderHook(() => useChat("general"));

      act(() => {
        result.current.sendMessage("Hello, world!");
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("message:send", {
        channelId: "general",
        content: "Hello, world!",
        type: "text",
      });
    });

    it("should handle file message sending", async () => {
      const mockFile = new File(["test"], "test.txt", { type: "text/plain" });
      const { result } = renderHook(() => useChat("general"));

      act(() => {
        result.current.sendMessage("File attached", "file", mockFile);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("message:send", {
        channelId: "general",
        content: "File attached",
        type: "file",
        file: mockFile,
      });
    });

    it("should handle image message sending", async () => {
      const mockImage = new File(["image"], "test.jpg", { type: "image/jpeg" });
      const { result } = renderHook(() => useChat("general"));

      act(() => {
        result.current.sendMessage("Image attached", "image", mockImage);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("message:send", {
        channelId: "general",
        content: "Image attached",
        type: "image",
        file: mockImage,
      });
    });
  });

  describe("Message Management", () => {
    it("should edit message correctly", () => {
      const { result } = renderHook(() => useChat("general"));

      act(() => {
        result.current.editMessage("msg-1", "Edited message content");
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("message:edit", {
        channelId: "general",
        messageId: "msg-1",
        content: "Edited message content",
      });
    });

    it("should delete message correctly", () => {
      const { result } = renderHook(() => useChat("general"));

      act(() => {
        result.current.deleteMessage("msg-1");
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("message:delete", {
        channelId: "general",
        messageId: "msg-1",
      });
    });

    it("should react to message correctly", () => {
      const { result } = renderHook(() => useChat("general"));

      act(() => {
        result.current.reactToMessage("msg-1", "👍");
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("message:react", {
        channelId: "general",
        messageId: "msg-1",
        reaction: "👍",
      });
    });

    it("should reply to message correctly", () => {
      const { result } = renderHook(() => useChat("general"));

      act(() => {
        result.current.replyToMessage("msg-1", "This is a reply");
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("message:send", {
        channelId: "general",
        content: "This is a reply",
        type: "text",
        replyTo: "msg-1",
      });
    });
  });

  describe("Typing Indicators", () => {
    it("should set typing status correctly", () => {
      const { result } = renderHook(() => useChat("general"));

      act(() => {
        result.current.setTyping(true);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("typing:start", {
        channelId: "general",
      });

      act(() => {
        result.current.setTyping(false);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("typing:stop", {
        channelId: "general",
      });
    });

    it("should handle typing events from other users", () => {
      const { result } = renderHook(() => useChat("general"));

      // Simulate receiving typing events
      const onCallback = mockSocket.on.mock.calls.find(call => call[0] === "typing:update")?.[1];

      act(() => {
        onCallback?.({
          channelId: "general",
          typingUsers: [
            { id: "2", name: "User 2" },
            { id: "3", name: "User 3" },
          ],
        });
      });

      expect(result.current.typingUsers).toHaveLength(2);
      expect(result.current.typingUsers[0].name).toBe("User 2");
    });

    it("should filter out current user from typing indicators", () => {
      const currentUser = createMockSession().user;
      const { result } = renderHook(() => useChat("general"));

      const onCallback = mockSocket.on.mock.calls.find(call => call[0] === "typing:update")?.[1];

      act(() => {
        onCallback?.({
          channelId: "general",
          typingUsers: [
            { id: currentUser.id, name: currentUser.name },
            { id: "2", name: "User 2" },
          ],
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);
      expect(result.current.typingUsers[0].id).toBe("2");
    });
  });

  describe("Message History", () => {
    it("should receive and store new messages", () => {
      const { result } = renderHook(() => useChat("general"));

      const mockMessage = {
        id: "msg-1",
        content: "Hello from another user",
        authorId: "2",
        authorName: "User 2",
        channelId: "general",
        timestamp: new Date().toISOString(),
        type: "text",
      };

      // Find the message received callback
      const onCallback = mockSocket.on.mock.calls.find(call => call[0] === "message:received")?.[1];

      act(() => {
        onCallback?.(mockMessage);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(mockMessage);
    });

    it("should update existing messages", () => {
      const { result } = renderHook(() => useChat("general"));

      const originalMessage = {
        id: "msg-1",
        content: "Original content",
        authorId: "2",
        authorName: "User 2",
        channelId: "general",
        timestamp: new Date().toISOString(),
        type: "text",
      };

      const updatedMessage = {
        ...originalMessage,
        content: "Updated content",
        edited: true,
        editedAt: new Date().toISOString(),
      };

      const onReceived = mockSocket.on.mock.calls.find(call => call[0] === "message:received")?.[1];
      const onUpdated = mockSocket.on.mock.calls.find(call => call[0] === "message:updated")?.[1];

      // First add the original message
      act(() => {
        onReceived?.(originalMessage);
      });

      // Then update it
      act(() => {
        onUpdated?.(updatedMessage);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe("Updated content");
      expect(result.current.messages[0].edited).toBe(true);
    });

    it("should remove deleted messages", () => {
      const { result } = renderHook(() => useChat("general"));

      const message = {
        id: "msg-1",
        content: "To be deleted",
        authorId: "2",
        authorName: "User 2",
        channelId: "general",
        timestamp: new Date().toISOString(),
        type: "text",
      };

      const onReceived = mockSocket.on.mock.calls.find(call => call[0] === "message:received")?.[1];
      const onDeleted = mockSocket.on.mock.calls.find(call => call[0] === "message:deleted")?.[1];

      // Add message
      act(() => {
        onReceived?.(message);
      });

      expect(result.current.messages).toHaveLength(1);

      // Delete message
      act(() => {
        onDeleted?.({ messageId: "msg-1", channelId: "general" });
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it("should sort messages by timestamp", () => {
      const { result } = renderHook(() => useChat("general"));

      const message1 = {
        id: "msg-1",
        content: "First message",
        authorId: "2",
        channelId: "general",
        timestamp: "2024-01-01T10:00:00Z",
        type: "text",
      };

      const message2 = {
        id: "msg-2",
        content: "Second message",
        authorId: "2",
        channelId: "general",
        timestamp: "2024-01-01T10:01:00Z",
        type: "text",
      };

      const onReceived = mockSocket.on.mock.calls.find(call => call[0] === "message:received")?.[1];

      // Add messages in reverse order
      act(() => {
        onReceived?.(message2);
        onReceived?.(message1);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].content).toBe("First message");
      expect(result.current.messages[1].content).toBe("Second message");
    });
  });

  describe("Error Handling", () => {
    it("should handle message send errors", async () => {
      const { result } = renderHook(() => useChat("general"));

      const onError = mockSocket.on.mock.calls.find(call => call[0] === "message:error")?.[1];

      act(() => {
        result.current.sendMessage("Test message");
      });

      act(() => {
        onError?.({ error: "Failed to send message", channelId: "general" });
      });

      expect(result.current.error).toBe("Failed to send message");
    });

    it("should clear errors after successful operations", () => {
      const { result } = renderHook(() => useChat("general"));

      // Set error
      const onError = mockSocket.on.mock.calls.find(call => call[0] === "message:error")?.[1];
      act(() => {
        onError?.({ error: "Test error", channelId: "general" });
      });

      expect(result.current.error).toBe("Test error");

      // Send successful message
      act(() => {
        result.current.sendMessage("Test message");
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("Socket Connection Handling", () => {
    it("should handle disconnection gracefully", () => {
      mockUseRealtime.mockReturnValue({
        socket: mockSocket,
        isConnected: false,
        connectionStatus: "disconnected",
        currentUser: createMockSession().user,
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      });

      const { result } = renderHook(() => useChat("general"));

      // Attempt to send message while disconnected
      act(() => {
        result.current.sendMessage("Test message");
      });

      // Should not emit when disconnected
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it("should clean up listeners on unmount", () => {
      const { unmount } = renderHook(() => useChat("general"));

      unmount();

      expect(mockSocket.off).toHaveBeenCalled();
    });
  });

  describe("Channel Switching", () => {
    it("should handle channel changes", () => {
      const { result, rerender } = renderHook(({ channelId }) => useChat(channelId), {
        initialProps: { channelId: "general" },
      });

      // Initial channel
      expect(mockSocket.emit).toHaveBeenCalledWith("channel:join", { channelId: "general" });

      // Change channel
      rerender({ channelId: "random" });

      expect(mockSocket.emit).toHaveBeenCalledWith("channel:leave", { channelId: "general" });
      expect(mockSocket.emit).toHaveBeenCalledWith("channel:join", { channelId: "random" });
    });

    it("should filter messages by channel", () => {
      const { result } = renderHook(() => useChat("general"));

      const generalMessage = {
        id: "msg-1",
        content: "General message",
        channelId: "general",
        timestamp: new Date().toISOString(),
        type: "text",
      };

      const randomMessage = {
        id: "msg-2",
        content: "Random message",
        channelId: "random",
        timestamp: new Date().toISOString(),
        type: "text",
      };

      const onReceived = mockSocket.on.mock.calls.find(call => call[0] === "message:received")?.[1];

      act(() => {
        onReceived?.(generalMessage);
        onReceived?.(randomMessage);
      });

      // Should only show messages from the current channel
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe("General message");
    });
  });
});

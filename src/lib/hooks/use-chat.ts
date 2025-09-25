import { useState, useEffect, useCallback, useRef } from 'react';

import { getSocket, joinRoom, leaveRoom } from '@/lib/realtime/client';
import type {
  UseChatReturn,
  ChatMessage,
  NewChatMessage,
  OnlineUser,
} from '@/types/realtime';

import { useDebounce } from './use-debounce';

/**
 * Hook for real-time chat functionality
 */
export const useChat = (channelId: string): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<OnlineUser[]>([]);

  const socketRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedTyping = useDebounce(isTyping, 1000);

  // Initialize socket and join channel
  useEffect(() => {
    const socket = getSocket();
    if (!socket) {return;}

    socketRef.current = socket;
    setIsLoading(true);

    // Join the channel
    joinRoom(channelId).then((success) => {
      if (success) {
        setError(null);
      } else {
        setError('Failed to join channel');
      }
      setIsLoading(false);
    });

    // Listen for new messages
    socket.on('message:new', (message: ChatMessage) => {
      if (message.channelId === channelId) {
        setMessages(prev => [...prev, message].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ));
      }
    });

    // Listen for message updates
    socket.on('message:edit', (updatedMessage: Partial<ChatMessage> & { id: string }) => {
      setMessages(prev => prev.map(msg =>
        msg.id === updatedMessage.id
          ? { ...msg, ...updatedMessage }
          : msg
      ));
    });

    // Listen for message deletions
    socket.on('message:delete', (messageId: string) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    });

    // Listen for typing indicators
    socket.on('user:typing', ({ userId, user, isTyping: userIsTyping }: {
      userId: string;
      user: OnlineUser;
      isTyping: boolean;
    }) => {
      setTypingUsers(prev => {
        if (userIsTyping) {
          // Add user to typing list if not already there
          const exists = prev.some(u => u.id === userId);
          return exists ? prev : [...prev, user];
        } else {
          // Remove user from typing list
          return prev.filter(u => u.id !== userId);
        }
      });
    });

    // Cleanup on unmount or channel change
    return () => {
      if (socket) {
        socket.off('message:new');
        socket.off('message:edit');
        socket.off('message:delete');
        socket.off('user:typing');
        leaveRoom(channelId);
      }
    };
  }, [channelId]);

  // Handle typing indicator
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.emit('message:typing', channelId, debouncedTyping);
    }
  }, [channelId, debouncedTyping]);

  // Clear typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const sendMessage = useCallback(async (message: NewChatMessage): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) {
        setError('No connection available');
        resolve(false);
        return;
      }

      setError(null);
      socket.emit('message:send', message, (success: boolean, sentMessage?: ChatMessage) => {
        if (success && sentMessage) {
          // Message will be added via socket event, but we can add optimistically
          resolve(true);
        } else {
          setError('Failed to send message');
          resolve(false);
        }
      });
    });
  }, []);

  const editMessage = useCallback(async (messageId: string, content: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) {
        setError('No connection available');
        resolve(false);
        return;
      }

      setError(null);
      socket.emit('message:edit', messageId, content, (success: boolean) => {
        if (!success) {
          setError('Failed to edit message');
        }
        resolve(success);
      });
    });
  }, []);

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) {
        setError('No connection available');
        resolve(false);
        return;
      }

      setError(null);
      socket.emit('message:delete', messageId, (success: boolean) => {
        if (!success) {
          setError('Failed to delete message');
        }
        resolve(success);
      });
    });
  }, []);

  const setTyping = useCallback((typing: boolean) => {
    setIsTyping(typing);

    // Auto-clear typing after 3 seconds
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    isTyping,
    typingUsers,
    setTyping,
  };
};

/**
 * Hook for message reactions
 */
export const useMessageReactions = (messageId: string) => {
  const [reactions, setReactions] = useState<Array<{ emoji: string; users: string[]; count: number }>>([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {return;}

    // Listen for reaction updates
    socket.on('message:reaction', ({ messageId: reactionMessageId, reactions: updatedReactions }) => {
      if (reactionMessageId === messageId) {
        setReactions(updatedReactions);
      }
    });

    return () => {
      if (socket) {
        socket.off('message:reaction');
      }
    };
  }, [messageId]);

  const addReaction = useCallback(async (emoji: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) {
        resolve(false);
        return;
      }

      socket.emit('message:add_reaction', messageId, emoji, (success: boolean) => {
        resolve(success);
      });
    });
  }, [messageId]);

  const removeReaction = useCallback(async (emoji: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) {
        resolve(false);
        return;
      }

      socket.emit('message:remove_reaction', messageId, emoji, (success: boolean) => {
        resolve(success);
      });
    });
  }, [messageId]);

  return {
    reactions,
    addReaction,
    removeReaction,
  };
};

/**
 * Hook for chat message history
 */
export const useChatHistory = (channelId: string, limit = 50) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = useCallback(async (before?: string): Promise<void> => {
    const socket = getSocket();
    if (!socket || isLoadingHistory) {return;}

    setIsLoadingHistory(true);

    socket.emit('message:history', {
      channelId,
      limit,
      before,
    }, (success: boolean, messages: ChatMessage[], hasMoreMessages: boolean) => {
      if (success) {
        if (before) {
          // Prepend older messages
          setHistory(prev => [...messages, ...prev]);
        } else {
          // Replace with initial history
          setHistory(messages);
        }
        setHasMore(hasMoreMessages);
      }
      setIsLoadingHistory(false);
    });
  }, [channelId, limit, isLoadingHistory]);

  const loadMore = useCallback(() => {
    if (hasMore && history.length > 0) {
      const oldestMessage = history[0];
      if (oldestMessage) {
        loadHistory(oldestMessage.id);
      }
    }
  }, [hasMore, history, loadHistory]);

  // Load initial history
  useEffect(() => {
    loadHistory();
  }, [channelId]);

  return {
    history,
    hasMore,
    isLoadingHistory,
    loadMore,
    refresh: () => loadHistory(),
  };
};

/**
 * Hook for managing multiple chat channels
 */
export const useMultiChannelChat = () => {
  const [activeChannels, setActiveChannels] = useState<Set<string>>(new Set());
  const [channelData, setChannelData] = useState<Map<string, {
    messages: ChatMessage[];
    unreadCount: number;
    lastMessage?: ChatMessage;
  }>>(new Map());

  const joinChannel = useCallback(async (channelId: string) => {
    const success = await joinRoom(channelId);
    if (success) {
      setActiveChannels(prev => new Set([...prev, channelId]));
      if (!channelData.has(channelId)) {
        setChannelData(prev => new Map([...prev, [channelId, {
          messages: [],
          unreadCount: 0,
        }]]));
      }
    }
    return success;
  }, [channelData]);

  const leaveChannel = useCallback(async (channelId: string) => {
    const success = await leaveRoom(channelId);
    if (success) {
      setActiveChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelId);
        return newSet;
      });
    }
    return success;
  }, []);

  const getChannelData = useCallback((channelId: string) => {
    return channelData.get(channelId) || {
      messages: [],
      unreadCount: 0,
    };
  }, [channelData]);

  return {
    activeChannels: Array.from(activeChannels),
    joinChannel,
    leaveChannel,
    getChannelData,
    totalUnread: Array.from(channelData.values()).reduce((sum, data) => sum + data.unreadCount, 0),
  };
};
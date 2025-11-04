"use client";

import React, { useState, useRef, useEffect } from "react";

import { formatDistanceToNow } from "date-fns";
import {
  Send,
  MoreHorizontal,
  Edit,
  Trash2,
  Reply,
  Smile,
  Paperclip,
  Hash,
  Users,
  Clock,
  CheckCheck,
  AlertCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useChat, useChatHistory } from "@/lib/hooks/use-chat";
import { usePresence } from "@/lib/hooks/use-presence";
import { cn } from "@/lib/utils";
import type { ChatMessage, NewChatMessage, MessageType } from "@/types/realtime";

interface ChatComponentProps {
  channelId: string;
  channelName?: string;
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  showUserList?: boolean;
}

interface MessageItemProps {
  message: ChatMessage;
  currentUserId?: string;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: ChatMessage) => void;
  className?: string;
}

interface MessageInputProps {
  onSend: (message: NewChatMessage) => void;
  channelId: string;
  replyTo?: ChatMessage;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

interface TypingIndicatorProps {
  users: Array<{ id: string; name: string | null }>;
}

/**
 * Typing indicator component
 */
const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) {
    return null;
  }

  const names = users.map(u => u.name || "Unknown").filter(Boolean);
  let text = "";

  if (names.length === 1) {
    text = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing...`;
  } else if (names.length > 2) {
    text = `${names[0]}, ${names[1]}, and ${names.length - 2} other${names.length - 2 > 1 ? "s" : ""} are typing...`;
  }

  return (
    <div className="text-muted-foreground flex items-center space-x-2 px-4 py-2 text-sm">
      <div className="flex space-x-1">
        <div
          className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span>{text}</span>
    </div>
  );
};

/**
 * Message item component
 */
const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isOwnMessage = message.authorId === currentUserId;
  const canEdit = isOwnMessage;
  const canDelete = isOwnMessage; // Or check for moderation permissions

  const handleEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const getMessageTypeIcon = (type: MessageType) => {
    switch (type) {
      case "system":
        return <AlertCircle className="h-4 w-4" />;
      case "announcement":
        return <Hash className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getMessageTypeColor = (type: MessageType) => {
    switch (type) {
      case "system":
        return "text-blue-600 dark:text-blue-400";
      case "announcement":
        return "text-purple-600 dark:text-purple-400";
      default:
        return "";
    }
  };

  return (
    <div className={cn("hover:bg-muted/50 flex space-x-3 px-4 py-3", className)}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.author.image || undefined} />
        <AvatarFallback>{message.author.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center space-x-2">
          <span className="text-sm font-medium">{message.author.name || "Unknown User"}</span>
          <Badge variant="outline" className="text-xs">
            {message.author.role.toLowerCase()}
          </Badge>
          {getMessageTypeIcon(message.type) && (
            <div className={getMessageTypeColor(message.type)}>
              {getMessageTypeIcon(message.type)}
            </div>
          )}
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
          {message.isEdited && <span className="text-muted-foreground text-xs">(edited)</span>}
        </div>

        {message.replyToId && (
          <div className="border-muted bg-muted/30 text-muted-foreground mb-2 rounded border-l-2 pl-3 text-sm">
            Replying to a message...
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="min-h-[60px] text-sm"
              placeholder="Edit your message..."
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleEdit} disabled={!editContent.trim()}>
                <CheckCheck className="mr-1 h-4 w-4" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            <p className={cn("break-words whitespace-pre-wrap", getMessageTypeColor(message.type))}>
              {message.content}
            </p>

            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map(attachment => (
                  <div
                    key={attachment.id}
                    className="bg-muted flex items-center space-x-2 rounded p-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="text-sm">{attachment.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ({(attachment.size / 1024).toFixed(1)}KB)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {message.reactions && message.reactions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.reactions.map(reaction => (
                  <Badge
                    key={reaction.emoji}
                    variant="secondary"
                    className="hover:bg-secondary/80 cursor-pointer text-xs"
                  >
                    {reaction.emoji} {reaction.count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {!isEditing && (canEdit || canDelete || onReply) && (
          <div className="mt-1 flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={() => onReply?.(message)}
            >
              <Reply className="h-3 w-3" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 px-2">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete?.(message.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onReply?.(message)}>
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Message input component
 */
const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  channelId,
  replyTo,
  onCancelReply,
  disabled = false,
  placeholder = "Type a message...",
}) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!message.trim()) {
      return;
    }

    const newMessage: NewChatMessage = {
      content: message.trim(),
      type: "text",
      channelId,
      ...(replyTo?.id && { replyToId: replyTo.id }),
    };

    onSend(newMessage);
    setMessage("");
    setIsTyping(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }

    // Typing indicator
    if (value && !isTyping) {
      setIsTyping(true);
    } else if (!value && isTyping) {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-2 border-t p-4">
      {replyTo && (
        <div className="bg-muted flex items-center justify-between rounded p-2">
          <div className="flex items-center space-x-2 text-sm">
            <Reply className="h-4 w-4" />
            <span>Replying to {replyTo.author.name}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={onCancelReply}>
            ×
          </Button>
        </div>
      )}

      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="max-h-[120px] min-h-[40px] resize-none"
            rows={1}
          />
        </div>

        <div className="flex space-x-1">
          <Button size="sm" variant="outline" disabled={disabled}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" disabled={disabled}>
            <Smile className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSend} disabled={disabled || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main chat component
 */
export const Chat: React.FC<ChatComponentProps> = ({
  channelId,
  channelName = "General",
  className,
  maxHeight = "500px",
  showHeader = true,
  showUserList = true,
}) => {
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, error, sendMessage, editMessage, deleteMessage, typingUsers } =
    useChat(channelId);

  const { onlineUsers } = usePresence();
  const { history, loadMore, hasMore } = useChatHistory(channelId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (message: NewChatMessage) => {
    const success = await sendMessage(message);
    if (success && replyTo) {
      setReplyTo(null);
    }
  };

  const handleEdit = async (messageId: string, content: string) => {
    await editMessage(messageId, content);
  };

  const handleDelete = async (messageId: string) => {
    await deleteMessage(messageId);
  };

  const handleReply = (message: ChatMessage) => {
    setReplyTo(message);
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-destructive flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>Error: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Hash className="h-5 w-5" />
              <span>{channelName}</span>
            </CardTitle>
            {showUserList && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{onlineUsers.length} online</span>
              </Badge>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div style={{ height: maxHeight }} className="flex flex-col">
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-0">
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <div className="border-primary h-6 w-6 animate-spin rounded-full border-b-2" />
              </div>
            )}

            {hasMore && (
              <div className="py-2 text-center">
                <Button variant="ghost" size="sm" onClick={loadMore} className="text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  Load older messages
                </Button>
              </div>
            )}

            <div className="group space-y-0">
              {messages.map(message => (
                <MessageItem
                  key={message.id}
                  message={message}
                  currentUserId={onlineUsers.find(u => u.id)?.id || ""} // This should come from auth context
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReply={handleReply}
                />
              ))}
            </div>

            {typingUsers.length > 0 && (
              <>
                <Separator />
                <TypingIndicator users={typingUsers} />
              </>
            )}
          </ScrollArea>

          <MessageInput
            onSend={handleSend}
            channelId={channelId}
            {...(replyTo && { replyTo })}
            onCancelReply={() => setReplyTo(null)}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
};

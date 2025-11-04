/**
 * ChatHistory Component
 * Display conversation transcript between user and avatar
 */

"use client";

import React, { useEffect, useRef } from "react";
import { User, Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatHistoryProps } from "@/types/avatar";

export function ChatHistory({
  messages,
  className,
  maxHeight = "400px",
  autoScroll = true,
}: ChatHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  if (messages.length === 0) {
    return (
      <div
        className={cn("text-muted-foreground flex items-center justify-center", className)}
        style={{ minHeight: maxHeight }}
      >
        <div className="text-center">
          <Bot className="mx-auto mb-3 h-12 w-12 opacity-20" />
          <p className="text-sm">No messages yet</p>
          <p className="mt-1 text-xs">Start a conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea
      className={cn("bg-muted/30 rounded-lg border", className)}
      style={{ height: maxHeight }}
    >
      <div ref={scrollRef} className="space-y-4 p-4">
        {messages.map(message => {
          const isUser = message.role === "user";
          const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={message.id}
              className={cn(
                "animate-in slide-in-from-bottom-2 flex gap-3 duration-300",
                isUser ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar icon */}
              <div
                className={cn(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message content */}
              <div className={cn("flex-1 space-y-1", isUser ? "text-right" : "text-left")}>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium", isUser ? "ml-auto" : "mr-auto")}>
                    {isUser ? "You" : "AI Assistant"}
                  </span>
                  <span className="text-muted-foreground text-xs">{timestamp}</span>
                </div>

                <div
                  className={cn(
                    "inline-block rounded-lg px-4 py-2 text-sm",
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {message.content}
                </div>

                {message.audioUrl && (
                  <div className="mt-2">
                    <audio
                      controls
                      src={message.audioUrl}
                      className="h-8 max-w-full"
                      style={{ maxWidth: "250px" }}
                    />
                  </div>
                )}

                {message.duration && (
                  <div className="text-muted-foreground text-xs">
                    Duration: {message.duration.toFixed(1)}s
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

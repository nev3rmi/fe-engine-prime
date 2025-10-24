/**
 * AvatarDisplay Component
 * Visual representation of the avatar with lip sync animation
 */

"use client";

import React from "react";

import { cn } from "@/lib/utils";
import type { AvatarDisplayProps, Viseme, AvatarState } from "@/types/avatar";

// Mouth shapes for each viseme
const MOUTH_SHAPES: Record<Viseme, string> = {
  neutral: "M 40 50 Q 50 52 60 50", // Slight smile
  closed: "M 40 50 L 60 50", // Closed mouth
  A: "M 35 45 Q 50 65 65 45", // Wide open (like "ah")
  E: "M 38 48 Q 50 55 62 48", // Medium open (like "eh")
  I: "M 40 49 Q 50 52 60 49", // Slightly open (like "ee")
  O: "M 42 45 Q 50 60 58 45", // Round open (like "oh")
  U: "M 43 48 Q 50 58 57 48", // Small round (like "oo")
};

// Emoji-based simple avatar representation
function SimpleAvatar({
  viseme,
  state,
  className,
}: {
  viseme: Viseme;
  state: AvatarState;
  className?: string;
}) {
  const isActive = state === "listening" || state === "speaking" || state === "thinking";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Avatar container */}
      <div
        className={cn(
          "relative h-48 w-48 rounded-full transition-all duration-300",
          "from-primary/20 to-primary/5 bg-gradient-to-br",
          "flex items-center justify-center border-4",
          isActive ? "border-primary animate-pulse" : "border-primary/30"
        )}
      >
        {/* Face SVG */}
        <svg viewBox="0 0 100 100" className="h-full w-full" style={{ transform: "scale(0.8)" }}>
          {/* Face circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="#e0e7ff"
            stroke="#6366f1"
            strokeWidth="2"
            className="dark:fill-indigo-900/30 dark:stroke-indigo-500"
          />

          {/* Eyes */}
          <circle
            cx="35"
            cy="40"
            r="3"
            fill="#3730a3"
            className={cn(
              "transition-all duration-200 dark:fill-indigo-300",
              state === "thinking" && "animate-pulse"
            )}
          />
          <circle
            cx="65"
            cy="40"
            r="3"
            fill="#3730a3"
            className={cn(
              "transition-all duration-200 dark:fill-indigo-300",
              state === "thinking" && "animate-pulse"
            )}
          />

          {/* Mouth - animated based on viseme */}
          <path
            d={MOUTH_SHAPES[viseme]}
            stroke="#3730a3"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-100 dark:stroke-indigo-300"
          />

          {/* Audio waves when speaking */}
          {state === "speaking" && (
            <>
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                opacity="0.3"
                className="animate-ping"
                style={{ animationDuration: "1.5s" }}
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                opacity="0.2"
                className="animate-ping"
                style={{ animationDuration: "2s", animationDelay: "0.3s" }}
              />
            </>
          )}
        </svg>

        {/* Status indicator */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              "border backdrop-blur-sm transition-all duration-300",
              state === "idle" && "bg-muted/50 border-muted text-muted-foreground",
              state === "listening" &&
                "border-blue-500 bg-blue-500/20 text-blue-700 dark:text-blue-300",
              state === "thinking" &&
                "animate-pulse border-yellow-500 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
              state === "speaking" &&
                "border-green-500 bg-green-500/20 text-green-700 dark:text-green-300"
            )}
          >
            {state === "idle" && "💤 Idle"}
            {state === "listening" && "🎤 Listening"}
            {state === "thinking" && "🤔 Thinking"}
            {state === "speaking" && "🗣️ Speaking"}
          </div>
        </div>
      </div>

      {/* Microphone indicator */}
      {state === "listening" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="border-primary/30 h-56 w-56 animate-ping rounded-full border-2" />
        </div>
      )}
    </div>
  );
}

export function AvatarDisplay({ currentViseme, state, style, className }: AvatarDisplayProps) {
  // For now, we only implement the simple style
  // You can add more complex styles (realistic, animated) later
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <SimpleAvatar viseme={currentViseme} state={state} className={className} />
    </div>
  );
}

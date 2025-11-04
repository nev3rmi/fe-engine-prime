/**
 * ConversationalAvatar Component
 * Main component that orchestrates real-time voice conversation with avatar
 *
 * Features:
 * - Speech-to-text (Web Speech API)
 * - AI conversation (Dify Chat App)
 * - Text-to-speech (ElevenLabs)
 * - Lip sync animation
 * - Chat history
 */

"use client";

import React, { useEffect, useCallback } from "react";

import { AlertCircle, Trash2, Settings } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLipSync } from "@/lib/hooks/use-lip-sync";
import { useVoiceConversation } from "@/lib/hooks/use-voice-conversation";
import { cn } from "@/lib/utils";
import type { ConversationalAvatarProps } from "@/types/avatar";

import { AvatarDisplay } from "./AvatarDisplay";
import { ChatHistory } from "./ChatHistory";
import { VoiceControls } from "./VoiceControls";

export function ConversationalAvatar({
  aiPersonality: _aiPersonality,
  voiceId,
  avatarStyle = "simple",
  autoStart = false,
  showChatHistory = true,
  enableVoiceInput = true,
  enableTextInput: _enableTextInput = true,
  className,
  userId = "demo-user",
  browserVoiceName,
  onConversationStart,
  onConversationEnd,
  onMessage,
  onError,
}: ConversationalAvatarProps) {
  // Lip sync hook
  const { currentViseme, isAnimating, startLipSync } = useLipSync();

  // Voice conversation hook
  const {
    isListening,
    isSpeaking,
    isThinking,
    currentState,
    transcript,
    messages,
    conversationId,
    error,
    startConversation,
    stopConversation,
    clearConversation,
  } = useVoiceConversation({
    userId,
    voiceSettings: voiceId ? { voiceId } : undefined,
    onMessage,
    onError,
    onAudioStart: startLipSync, // Connect TTS audio to lip sync animation
    autoRestart: true, // Auto-restart listening after response
    ttsProvider: "browser", // Use browser TTS (free, works offline with system voices)
    ttsLanguage: "vi-VN", // Vietnamese language
    browserVoiceName, // Specific browser voice to use
  });

  // Auto-start conversation if requested
  useEffect(() => {
    if (autoStart) {
      startConversation();
      onConversationStart?.();
    }
  }, [autoStart, startConversation, onConversationStart]);

  // Handle conversation start
  const handleStartConversation = useCallback(() => {
    startConversation();
    onConversationStart?.();
  }, [startConversation, onConversationStart]);

  // Handle conversation stop
  const handleStopConversation = useCallback(() => {
    stopConversation();
    onConversationEnd?.();
  }, [stopConversation, onConversationEnd]);

  // Handle clear conversation
  const handleClearConversation = useCallback(() => {
    clearConversation();
  }, [clearConversation]);

  return (
    <div className={cn("mx-auto w-full max-w-4xl space-y-6", className)}>
      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">{error}</p>
              {(error.includes("not-allowed") || error.includes("permission-denied")) && (
                <div className="mt-2 space-y-1 text-sm">
                  <p>🎤 Microphone access was denied. To use voice features:</p>
                  <ul className="list-inside list-disc space-y-1 pl-2">
                    <li>
                      <strong>Chrome/Edge:</strong> Click the 🔒 lock icon in the address bar →
                      Microphone → Allow
                    </li>
                    <li>
                      <strong>Safari:</strong> Safari menu → Settings for This Website → Microphone
                      → Allow
                    </li>
                    <li>
                      <strong>Firefox:</strong> Click the 🔒 lock icon → Connection → More
                      Information → Permissions → Allow microphone
                    </li>
                  </ul>
                  <p className="mt-2">After allowing, reload the page and try again.</p>
                </div>
              )}
              {!error.includes("not-allowed") &&
                !error.includes("permission-denied") &&
                error.includes("not supported") && (
                  <p className="mt-2 text-sm">
                    ℹ️ Your browser doesn&apos;t support voice input. Please use Chrome, Edge, or
                    Safari for voice features.
                  </p>
                )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>AI Conversational Avatar</CardTitle>
              <CardDescription>Speak naturally with the AI assistant</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearConversation}
                  disabled={isListening || isSpeaking || isThinking}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
              <Button variant="outline" size="sm" disabled>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Connection status */}
          {conversationId && (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span>Connected</span>
              <span className="text-xs opacity-50">ID: {conversationId.slice(0, 8)}...</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <Tabs defaultValue="avatar" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="avatar">Avatar</TabsTrigger>
              <TabsTrigger value="history">
                History
                {messages.length > 0 && (
                  <span className="bg-primary/20 ml-2 rounded-full px-2 py-0.5 text-xs">
                    {messages.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Avatar Tab */}
            <TabsContent value="avatar" className="mt-6 space-y-6">
              {/* Avatar display */}
              <div className="flex justify-center py-8">
                <AvatarDisplay
                  currentViseme={currentViseme}
                  state={currentState}
                  style={avatarStyle}
                />
              </div>

              {/* Current transcript */}
              {transcript && (
                <div className="bg-muted/50 border-primary/30 rounded-lg border-2 p-4">
                  <p className="text-muted-foreground mb-1 text-sm">You&apos;re saying:</p>
                  <p className="text-base">{transcript}</p>
                </div>
              )}

              {/* Voice controls */}
              {enableVoiceInput && (
                <div className="flex justify-center">
                  <VoiceControls
                    isListening={isListening}
                    isSpeaking={isSpeaking}
                    isThinking={isThinking}
                    onStartListening={handleStartConversation}
                    onStopListening={handleStopConversation}
                  />
                </div>
              )}

              {/* Instructions */}
              <div className="text-muted-foreground text-center text-sm">
                {!isListening && !isSpeaking && !isThinking && (
                  <>
                    <p>Click the microphone button to start talking</p>
                    <p className="mt-1 text-xs">
                      The avatar will listen, think, and respond with voice
                    </p>
                  </>
                )}
                {isListening && (
                  <p className="animate-pulse">🎤 Listening to you... speak naturally!</p>
                )}
                {isThinking && <p className="animate-pulse">🤔 Processing your message...</p>}
                {isSpeaking && (
                  <p className="animate-pulse">🗣️ Avatar is speaking... please wait</p>
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              {showChatHistory && (
                <ChatHistory messages={messages} maxHeight="500px" autoScroll={true} />
              )}
            </TabsContent>
          </Tabs>

          {/* Statistics */}
          {messages.length > 0 && (
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{messages.length}</div>
                <div className="text-muted-foreground text-xs">Messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {messages.filter(m => m.role === "user").length}
                </div>
                <div className="text-muted-foreground text-xs">Your messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {messages.filter(m => m.role === "assistant").length}
                </div>
                <div className="text-muted-foreground text-xs">AI responses</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical info (dev mode) */}
      {process.env.NODE_ENV === "development" && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 font-mono text-xs">
            <div>State: {currentState}</div>
            <div>Viseme: {currentViseme}</div>
            <div>Listening: {String(isListening)}</div>
            <div>Speaking: {String(isSpeaking)}</div>
            <div>Thinking: {String(isThinking)}</div>
            <div>Animating: {String(isAnimating)}</div>
            <div>Messages: {messages.length}</div>
            {conversationId && <div>Conversation: {conversationId}</div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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

'use client';

import React, { useEffect, useCallback } from 'react';

import { AlertCircle, Trash2, Settings } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLipSync } from '@/lib/hooks/use-lip-sync';
import { useVoiceConversation } from '@/lib/hooks/use-voice-conversation';
import { cn } from '@/lib/utils';
import type { ConversationalAvatarProps } from '@/types/avatar';

import { AvatarDisplay } from './AvatarDisplay';
import { ChatHistory } from './ChatHistory';
import { VoiceControls } from './VoiceControls';

export function ConversationalAvatar({
  aiPersonality,
  voiceId,
  avatarStyle = 'simple',
  autoStart = false,
  showChatHistory = true,
  enableVoiceInput = true,
  enableTextInput = true,
  className,
  userId = 'demo-user',
  onConversationStart,
  onConversationEnd,
  onMessage,
  onError,
}: ConversationalAvatarProps) {
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
    autoRestart: true, // Auto-restart listening after response
  });

  // Lip sync hook
  const { currentViseme, isAnimating } = useLipSync();

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
    <div className={cn('w-full max-w-4xl mx-auto space-y-6', className)}>
      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>AI Conversational Avatar</CardTitle>
              <CardDescription>
                Speak naturally with the AI assistant
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearConversation}
                  disabled={isListening || isSpeaking || isThinking}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
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
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20">
                    {messages.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Avatar Tab */}
            <TabsContent value="avatar" className="space-y-6 mt-6">
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
                <div className="p-4 rounded-lg bg-muted/50 border-2 border-primary/30">
                  <p className="text-sm text-muted-foreground mb-1">You're saying:</p>
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
              <div className="text-center text-sm text-muted-foreground">
                {!isListening && !isSpeaking && !isThinking && (
                  <>
                    <p>Click the microphone button to start talking</p>
                    <p className="text-xs mt-1">
                      The avatar will listen, think, and respond with voice
                    </p>
                  </>
                )}
                {isListening && (
                  <p className="animate-pulse">🎤 Listening to you... speak naturally!</p>
                )}
                {isThinking && (
                  <p className="animate-pulse">🤔 Processing your message...</p>
                )}
                {isSpeaking && (
                  <p className="animate-pulse">🗣️ Avatar is speaking... please wait</p>
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              {showChatHistory && (
                <ChatHistory
                  messages={messages}
                  maxHeight="500px"
                  autoScroll={true}
                />
              )}
            </TabsContent>
          </Tabs>

          {/* Statistics */}
          {messages.length > 0 && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{messages.length}</div>
                <div className="text-xs text-muted-foreground">Messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {messages.filter((m) => m.role === 'user').length}
                </div>
                <div className="text-xs text-muted-foreground">Your messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {messages.filter((m) => m.role === 'assistant').length}
                </div>
                <div className="text-xs text-muted-foreground">AI responses</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical info (dev mode) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1 font-mono">
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

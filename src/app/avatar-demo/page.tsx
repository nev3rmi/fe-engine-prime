/**
 * Avatar Demo Page
 * Test the conversational avatar with real-time voice interaction
 */

'use client';

import React, { useState, useEffect } from 'react';

import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

import { ConversationalAvatar } from '@/components/avatar/ConversationalAvatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AvatarDemoPage() {
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Log events for debugging
  const logEvent = (event: string) => {
    setEventLog((prev) => [`${new Date().toLocaleTimeString()}: ${event}`, ...prev].slice(0, 10));
  };

  // Mount check to prevent hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check configuration status
  const isDifyConfigured = true; // Dify API is hardcoded in the architecture
  const isElevenLabsConfigured = !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  const isWebSpeechSupported = isMounted &&
    (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window));

  const allConfigured = isDifyConfigured && isWebSpeechSupported;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            AI Conversational Avatar Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            Real-time voice conversation with AI-powered avatar
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="secondary">🎤 Web Speech API</Badge>
            <Badge variant="secondary">🤖 Dify AI</Badge>
            <Badge variant="secondary">🔊 ElevenLabs TTS</Badge>
            <Badge variant="secondary">👄 Lip Sync</Badge>
          </div>
        </div>

        {/* Configuration Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Check if all components are configured</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Web Speech API (Browser)</span>
              {isWebSpeechSupported ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Supported
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Supported
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Dify Chat API</span>
              {isDifyConfigured ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Not Configured
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">ElevenLabs TTS API</span>
              {isElevenLabsConfigured ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Not Configured (Optional)
                </Badge>
              )}
            </div>

            {!allConfigured && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {!isWebSpeechSupported && (
                    <p>Please use Chrome, Edge, or Safari for voice input support.</p>
                  )}
                  {!isDifyConfigured && (
                    <p>Dify API key is not configured. Please check your environment variables.</p>
                  )}
                  {!isElevenLabsConfigured && (
                    <p>ElevenLabs API key is not configured. TTS features will not work.</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Main Avatar Component */}
        <ConversationalAvatar
          userId="demo-user-123"
          avatarStyle="simple"
          autoStart={false}
          showChatHistory={true}
          enableVoiceInput={true}
          enableTextInput={true}
          onConversationStart={() => logEvent('Conversation started')}
          onConversationEnd={() => logEvent('Conversation ended')}
          onMessage={(message) => logEvent(`Message: ${message.role} - ${message.content.slice(0, 50)}...`)}
          onError={(error) => logEvent(`Error: ${error.message}`)}
        />

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Step 1: Start Conversation</h3>
              <p className="text-sm text-muted-foreground">
                Click the microphone button to start the conversation. The avatar will begin listening to you.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Step 2: Speak Naturally</h3>
              <p className="text-sm text-muted-foreground">
                Speak your question or message clearly. The system will transcribe your speech in real-time.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Step 3: Wait for Response</h3>
              <p className="text-sm text-muted-foreground">
                The AI will process your message (avatar shows "thinking" state), generate a response,
                and speak it back to you with lip sync animation.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Step 4: Continue Conversation</h3>
              <p className="text-sm text-muted-foreground">
                After the avatar finishes speaking, it will automatically start listening again for your next message.
              </p>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Tips</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Speak clearly and at a normal pace</li>
                <li>Wait for the avatar to finish speaking before responding</li>
                <li>Use the "History" tab to review past messages</li>
                <li>Click "Clear" to start a new conversation</li>
                <li>The avatar's mouth will sync with the speech audio</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Event Log (Debug) */}
        {process.env.NODE_ENV === 'development' && eventLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Event Log (Development)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs font-mono">
                {eventLog.map((event, index) => (
                  <div key={index} className="text-muted-foreground">
                    {event}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technical Details */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>Technical Architecture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Flow</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>User speaks → Web Speech API transcribes to text</li>
                <li>Text sent to Dify Chat API → AI generates response</li>
                <li>Response text sent to ElevenLabs → Audio generated</li>
                <li>Audio analyzed for visemes → Avatar lip sync</li>
                <li>Audio plays + Avatar mouth animates in real-time</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Expected Latency</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Speech Recognition: ~500ms</li>
                <li>AI Processing (Dify): 1-2 seconds</li>
                <li>TTS Generation (ElevenLabs): 500ms-1s</li>
                <li>Total: 2-3.5 seconds per response</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

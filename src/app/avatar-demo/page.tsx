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
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  // Log events for debugging
  const logEvent = (event: string) => {
    setEventLog((prev) => [`${new Date().toLocaleTimeString()}: ${event}`, ...prev].slice(0, 10));
  };

  // Mount check to prevent hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load available voices
  useEffect(() => {
    if (!isMounted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      // Auto-select HoaiMy voice if available, otherwise first Vietnamese voice
      if (voices.length > 0 && !selectedVoiceName) {
        const vietnameseVoices = voices.filter((v) => v.lang.startsWith('vi'));

        // Priority 1: HoaiMy (female)
        let defaultVoice = vietnameseVoices.find((v) =>
          v.name.includes('HoaiMy') || v.name.includes('Hoài My')
        );

        // Priority 2: Any Vietnamese female voice
        if (!defaultVoice) {
          defaultVoice = vietnameseVoices.find((v) =>
            v.name.includes('Female') || v.name.includes('Linh') || v.name.includes('My')
          );
        }

        // Priority 3: Any Vietnamese voice
        if (!defaultVoice && vietnameseVoices.length > 0) {
          defaultVoice = vietnameseVoices[0];
        }

        if (defaultVoice) {
          setSelectedVoiceName(defaultVoice.name);
          console.log('[Avatar Demo] Auto-selected voice:', defaultVoice.name);
        }
      }
    };

    // Load voices immediately
    loadVoices();

    // Some browsers need to wait for voices to load
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isMounted, selectedVoiceName]);

  // Check configuration status
  const isDifyConfigured = true; // Dify API is hardcoded in the architecture
  const isElevenLabsConfigured = !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  const isWebSpeechSupported = isMounted &&
    (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window));

  const vietnameseVoices = availableVoices.filter((v) => v.lang.startsWith('vi'));
  const selectedVoice = availableVoices.find((v) => v.name === selectedVoiceName);

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
            <Badge variant="secondary">🔊 Browser TTS</Badge>
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
              <span className="text-sm">Vietnamese Voices Available</span>
              {vietnameseVoices.length > 0 ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {vietnameseVoices.length} voices
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  No voices
                </Badge>
              )}
            </div>

            {/* Voice Selector */}
            {vietnameseVoices.length > 0 && (
              <div className="pt-2 border-t">
                <label className="block text-sm font-medium mb-2">
                  Select Vietnamese Voice
                </label>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {vietnameseVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                      {voice.name.includes('HoaiMy') || voice.name.includes('Hoài My') ? ' 👩 Female' : ''}
                      {voice.name.includes('An') || voice.name.includes('NamMinh') ? ' 👨 Male' : ''}
                      {voice.localService ? ' 📍' : ' ☁️'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedVoice && (
                    <>
                      Selected: <strong>{selectedVoice.name}</strong>
                      {selectedVoice.localService ? ' (Local voice)' : ' (Cloud voice - requires internet)'}
                    </>
                  )}
                </p>
              </div>
            )}

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
                  {vietnameseVoices.length === 0 && (
                    <p>No Vietnamese voices found. Please install Vietnamese language pack or try Microsoft Edge "Read Aloud" trick.</p>
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
          browserVoiceName={selectedVoiceName || undefined}
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
              <h3 className="font-semibold mb-2">Step 1: Select Voice (Above)</h3>
              <p className="text-sm text-muted-foreground">
                Choose your preferred Vietnamese voice from the dropdown above. HoaiMy 👩 is female, An/NamMinh 👨 is male.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Step 2: Start Conversation</h3>
              <p className="text-sm text-muted-foreground">
                Click the microphone button to start the conversation. The avatar will begin listening to you.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Step 3: Speak Naturally</h3>
              <p className="text-sm text-muted-foreground">
                Speak your question or message clearly. The system will transcribe your speech in real-time.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Step 4: Listen to Response</h3>
              <p className="text-sm text-muted-foreground">
                The AI will process your message, generate a response, and speak it back to you using your selected voice with lip sync animation.
              </p>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Tips</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Change voice anytime using the dropdown above</li>
                <li>Speak clearly and at a normal pace</li>
                <li>Wait for the avatar to finish speaking before responding</li>
                <li>Use the "History" tab to review past messages</li>
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
                <li>Response text → Browser TTS generates speech</li>
                <li>Lip sync animation synchronized with audio</li>
                <li>Audio plays + Avatar mouth animates in real-time</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Current Configuration</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>TTS Provider: Browser TTS (free, offline)</li>
                <li>Selected Voice: {selectedVoice?.name || 'None'}</li>
                <li>Voice Language: {selectedVoice?.lang || 'N/A'}</li>
                <li>Voice Type: {selectedVoice?.localService ? 'Local (offline)' : 'Cloud (online)'}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

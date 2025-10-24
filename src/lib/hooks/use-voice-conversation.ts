/**
 * useVoiceConversation Hook
 * Manages complete voice conversation flow:
 * 1. Web Speech API for STT (user speaks)
 * 2. Dify API for AI responses
 * 3. ElevenLabs for TTS (avatar speaks)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  Message,
  VoiceConversationState,
  VoiceConversationActions,
  VoiceSettings,
  AvatarState,
  DifyEvent,
} from '@/types/avatar';

// Check if Web Speech API is available
const isWebSpeechSupported = typeof window !== 'undefined' &&
  ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

export interface UseVoiceConversationOptions {
  userId?: string;
  voiceSettings?: VoiceSettings;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  autoRestart?: boolean; // Auto-restart listening after response
}

export function useVoiceConversation(
  options: UseVoiceConversationOptions = {}
): VoiceConversationState & VoiceConversationActions {
  const {
    userId = 'default-user',
    voiceSettings: initialVoiceSettings,
    onMessage,
    onError,
    autoRestart = false,
  } = options;

  // State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(
    initialVoiceSettings || {
      voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
      stability: 0.5,
      similarityBoost: 0.75,
    }
  );

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);

  // Computed state
  const currentState: AvatarState = isSpeaking
    ? 'speaking'
    : isThinking
      ? 'thinking'
      : isListening
        ? 'listening'
        : 'idle';

  /**
   * Initialize Web Speech API
   */
  const initializeSpeechRecognition = useCallback(() => {
    if (!isWebSpeechSupported) {
      const errorMsg = 'Web Speech API is not supported in this browser';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return null;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const transcriptResult = event.results[current];

      if (!transcriptResult || !transcriptResult[0]) return;

      const transcriptText = transcriptResult[0].transcript;

      setTranscript(transcriptText);

      // If final result, process the message
      if (transcriptResult.isFinal) {
        console.log('Final transcript:', transcriptText);
        handleUserMessage(transcriptText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      const errorMsg = `Speech recognition error: ${event.error}`;
      setError(errorMsg);
      onError?.(new Error(errorMsg));

      // Stop trying if permission denied or not allowed
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        isActiveRef.current = false;
        setIsListening(false);
        return;
      }

      // Auto-restart on certain recoverable errors
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (isActiveRef.current) {
            recognition.start();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);

      // Auto-restart if still active
      if (isActiveRef.current && autoRestart && !isProcessing) {
        setTimeout(() => {
          if (recognitionRef.current && isActiveRef.current) {
            recognitionRef.current.start();
          }
        }, 500);
      }
    };

    return recognition;
  }, [autoRestart, isProcessing, onError]);

  /**
   * Handle user message
   */
  const handleUserMessage = useCallback(
    async (text: string) => {
      if (!text || text.trim().length === 0) return;

      setIsProcessing(true);
      setTranscript('');

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      onMessage?.(userMessage);

      // Stop listening while processing
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }

      setIsListening(false);
      setIsThinking(true);

      try {
        // Call Dify chat API
        await sendMessage(text);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to process message';
        setError(errorMsg);
        onError?.(new Error(errorMsg));
      } finally {
        setIsThinking(false);
        setIsProcessing(false);
      }
    },
    [onMessage, onError]
  );

  /**
   * Send message to Dify and get response
   */
  const sendMessage = useCallback(
    async (text: string) => {
      try {
        const response = await fetch('/api/avatar/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text,
            conversationId,
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat API error: ${response.statusText}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response stream');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let aiResponseText = '';
        let newConversationId = conversationId;
        let messageId = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (!data) continue;

              try {
                const event: DifyEvent = JSON.parse(data);

                if (event.event === 'message') {
                  aiResponseText += event.answer;
                  messageId = event.message_id;
                  newConversationId = event.conversation_id;
                } else if (event.event === 'message_end') {
                  console.log('Message end', event);
                  newConversationId = event.conversation_id;
                }
              } catch (e) {
                console.warn('Failed to parse SSE event:', e);
              }
            }
          }
        }

        // Update conversation ID
        if (newConversationId && newConversationId !== conversationId) {
          setConversationId(newConversationId);
        }

        // Add AI message
        const aiMessage: Message = {
          id: messageId || Date.now().toString(),
          role: 'assistant',
          content: aiResponseText,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMessage]);
        onMessage?.(aiMessage);

        // Generate speech
        await generateSpeech(aiResponseText);
      } catch (err) {
        console.error('Send message error:', err);
        throw err;
      }
    },
    [conversationId, userId, onMessage]
  );

  /**
   * Generate speech from text using ElevenLabs
   */
  const generateSpeech = useCallback(
    async (text: string) => {
      try {
        setIsSpeaking(true);

        const response = await fetch('/api/avatar/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            voiceId: voiceSettings.voiceId,
            stability: voiceSettings.stability,
            similarityBoost: voiceSettings.similarityBoost,
          }),
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.statusText}`);
        }

        // Create audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Play audio
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);

          // Restart listening if auto-restart is enabled
          if (autoRestart && isActiveRef.current && recognitionRef.current) {
            setTimeout(() => {
              recognitionRef.current?.start();
            }, 500);
          }
        };

        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();

        return audioUrl;
      } catch (err) {
        console.error('Generate speech error:', err);
        setIsSpeaking(false);
        throw err;
      }
    },
    [voiceSettings, autoRestart]
  );

  /**
   * Start conversation
   */
  const startConversation = useCallback(() => {
    if (!isWebSpeechSupported) {
      const errorMsg = 'Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return;
    }

    isActiveRef.current = true;
    setError(null);

    if (!recognitionRef.current) {
      recognitionRef.current = initializeSpeechRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition already started');
      }
    }
  }, [initializeSpeechRecognition, onError]);

  /**
   * Stop conversation
   */
  const stopConversation = useCallback(() => {
    isActiveRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsListening(false);
    setIsSpeaking(false);
    setIsThinking(false);
    setIsProcessing(false);
    setTranscript('');
  }, []);

  /**
   * Pause conversation
   */
  const pauseConversation = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setIsListening(false);
  }, []);

  /**
   * Resume conversation
   */
  const resumeConversation = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    } else if (recognitionRef.current && isActiveRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition already started');
      }
    }
  }, []);

  /**
   * Clear conversation
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setTranscript('');
    setError(null);
  }, []);

  /**
   * Update voice settings
   */
  const updateVoiceSettings = useCallback((settings: Partial<VoiceSettings>) => {
    setVoiceSettings((prev) => ({ ...prev, ...settings }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors
        }
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      isActiveRef.current = false;
    };
  }, []);

  return {
    // State
    isListening,
    isSpeaking,
    isThinking,
    isProcessing,
    currentState,
    transcript,
    messages,
    conversationId,
    error,

    // Actions
    startConversation,
    stopConversation,
    pauseConversation,
    resumeConversation,
    sendMessage,
    clearConversation,
    setVoiceSettings: updateVoiceSettings,
  };
}

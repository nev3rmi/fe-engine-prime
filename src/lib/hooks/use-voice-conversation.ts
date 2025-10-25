/**
 * useVoiceConversation Hook - FIXED VERSION
 * Comprehensive fix for double recording and other bugs
 */

import { useState, useEffect, useRef, useCallback } from "react";

import type {
  Message,
  VoiceConversationState,
  VoiceConversationActions,
  VoiceSettings,
  AvatarState,
  DifyEvent,
} from "@/types/avatar";

// Check if Web Speech API is available
const isWebSpeechSupported =
  typeof window !== "undefined" &&
  ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

export interface UseVoiceConversationOptions {
  userId?: string;
  voiceSettings?: VoiceSettings;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  onAudioStart?: (duration: number) => void;
  autoRestart?: boolean;
  ttsProvider?: 'server' | 'browser'; // TTS provider selection
  ttsLanguage?: string; // Language for TTS (e.g., 'vi-VN', 'en-US')
  browserVoiceName?: string; // Specific browser voice name to use
}

export function useVoiceConversation(
  options: UseVoiceConversationOptions = {}
): VoiceConversationState & VoiceConversationActions {
  const {
    userId = "default-user",
    voiceSettings: initialVoiceSettings,
    onMessage,
    onError,
    onAudioStart,
    autoRestart = false,
    ttsProvider = 'browser', // Default to browser TTS (free, no setup)
    ttsLanguage = 'vi-VN', // Default to Vietnamese
    browserVoiceName, // Specific voice name to use
  } = options;

  // State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(
    initialVoiceSettings || {
      voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
      stability: 0.5,
      similarityBoost: 0.75,
    }
  );

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);
  const finalizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null); // NEW: Track restart timeout
  const lastInterimTextRef = useRef<string>("");
  const isRestartingRef = useRef(false); // NEW: Prevent double restart
  const isProcessingMessageRef = useRef(false); // NEW: Prevent double message processing
  const handleUserMessageRef = useRef<((text: string) => Promise<void>) | null>(null); // NEW: Ref to latest handler

  // Computed state
  const currentState: AvatarState = isSpeaking
    ? "speaking"
    : isThinking
      ? "thinking"
      : isListening
        ? "listening"
        : "idle";

  /**
   * Safely start recognition - prevents double starts
   */
  const safeStartRecognition = useCallback(() => {
    if (!recognitionRef.current || !isActiveRef.current) {
      console.log("Cannot start: no recognition or not active");
      return;
    }

    // Prevent double start
    if (isRestartingRef.current) {
      console.log("Already restarting, skip");
      return;
    }

    try {
      isRestartingRef.current = true;
      recognitionRef.current.start();
      console.log("Recognition started safely");
    } catch (e) {
      console.warn("Recognition already started or error:", e);
    } finally {
      // Reset flag after a short delay
      setTimeout(() => {
        isRestartingRef.current = false;
      }, 100);
    }
  }, []);

  /**
   * Clear any pending restart timeout
   */
  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  /**
   * Schedule recognition restart
   */
  const scheduleRestart = useCallback(
    (delay = 800) => {
      // Clear any existing restart
      clearRestartTimeout();

      // Only restart if conditions are met
      if (!autoRestart || !isActiveRef.current) {
        return;
      }

      restartTimeoutRef.current = setTimeout(() => {
        // Double-check conditions before actually restarting
        if (isActiveRef.current && !isSpeaking && !isProcessing) {
          safeStartRecognition();
        }
      }, delay);
    },
    [autoRestart, isSpeaking, isProcessing, safeStartRecognition, clearRestartTimeout]
  );

  /**
   * Initialize Web Speech API
   * FIXED: Removed isSpeaking from dependencies
   */
  const initializeSpeechRecognition = useCallback(() => {
    if (!isWebSpeechSupported) {
      const errorMsg = "Web Speech API is not supported in this browser";
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return null;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "vi-VN";

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const transcriptResult = event.results[current];

      if (!transcriptResult?.[0]) {
        return;
      }

      const transcriptText = transcriptResult[0].transcript;
      setTranscript(transcriptText);

      if (transcriptResult.isFinal) {
        console.log("Final transcript:", transcriptText);
        if (finalizeTimeoutRef.current) {
          clearTimeout(finalizeTimeoutRef.current);
          finalizeTimeoutRef.current = null;
        }
        lastInterimTextRef.current = "";
        // Call through ref to avoid stale closure
        handleUserMessageRef.current?.(transcriptText);
      } else {
        // Auto-finalize after 1.5s of silence
        if (finalizeTimeoutRef.current) {
          clearTimeout(finalizeTimeoutRef.current);
        }

        lastInterimTextRef.current = transcriptText;

        finalizeTimeoutRef.current = setTimeout(() => {
          if (lastInterimTextRef.current.trim().length > 0) {
            console.log("Auto-finalizing:", lastInterimTextRef.current);
            // Call through ref to avoid stale closure
            handleUserMessageRef.current?.(lastInterimTextRef.current);
            lastInterimTextRef.current = "";
          }
        }, 1500);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      const errorMsg = `Speech recognition error: ${event.error}`;
      setError(errorMsg);
      onError?.(new Error(errorMsg));

      if (event.error === "not-allowed" || event.error === "permission-denied") {
        isActiveRef.current = false;
        setIsListening(false);
        return;
      }

      // Auto-restart on recoverable errors
      if (event.error === "no-speech" || event.error === "audio-capture") {
        scheduleRestart(1000);
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);

      // FIXED: Remove auto-restart from here - only do it from audio.onended
      // This prevents double restart
    };

    return recognition;
  }, [onError, scheduleRestart]); // Uses handleUserMessageRef.current - no need for dep

  /**
   * Handle user message
   */
  const handleUserMessage = useCallback(
    async (text: string) => {
      if (!text || text.trim().length === 0) {
        return;
      }

      // GUARD: Prevent double message processing
      if (isProcessingMessageRef.current) {
        console.log("Already processing a message, skip duplicate:", text);
        return;
      }

      // Clear any pending restart
      clearRestartTimeout();

      isProcessingMessageRef.current = true;
      setIsProcessing(true);
      setTranscript("");

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMessage]);
      onMessage?.(userMessage);

      // Stop listening
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }

      setIsListening(false);
      setIsThinking(true);

      try {
        await sendMessage(text);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to process message";
        setError(errorMsg);
        onError?.(new Error(errorMsg));
      } finally {
        setIsThinking(false);
        setIsProcessing(false);
        isProcessingMessageRef.current = false; // Reset guard
      }
    },
    [onMessage, onError, clearRestartTimeout]
  );

  // Update ref whenever handleUserMessage changes
  useEffect(() => {
    handleUserMessageRef.current = handleUserMessage;
  }, [handleUserMessage]);

  /**
   * Send message to Dify
   */
  const sendMessage = useCallback(
    async (text: string) => {
      try {
        const response = await fetch("/api/avatar/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            conversationId,
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat API error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let aiResponseText = "";
        let newConversationId = conversationId;
        let messageId = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data:")) {
              const data = line.slice(5).trim();
              if (!data) {
                continue;
              }

              try {
                const event: DifyEvent = JSON.parse(data);

                if (event.event === "message" || event.event === "agent_message") {
                  if (event.answer) {
                    aiResponseText += event.answer;
                  }
                  messageId = event.message_id;
                  newConversationId = event.conversation_id;
                } else if (event.event === "message_end") {
                  newConversationId = event.conversation_id;
                }
              } catch (e) {
                console.warn("Failed to parse SSE event:", e);
              }
            }
          }
        }

        if (newConversationId && newConversationId !== conversationId) {
          setConversationId(newConversationId);
        }

        const aiMessage: Message = {
          id: messageId || Date.now().toString(),
          role: "assistant",
          content: aiResponseText,
          timestamp: Date.now(),
        };

        setMessages(prev => [...prev, aiMessage]);
        onMessage?.(aiMessage);

        await generateSpeech(aiResponseText);
      } catch (err) {
        console.error("Send message error:", err);
        throw err;
      }
    },
    [conversationId, userId, onMessage]
  );

  /**
   * Generate speech using server TTS (original function)
   */
  const generateAndPlayAudio = useCallback(
    async (text: string) => {
      try {
        // Clean up old audio FIRST to prevent multiple onended handlers
        if (audioRef.current) {
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
          audioRef.current.onloadedmetadata = null;
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Stop mic before speaking
        clearRestartTimeout();
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore
          }
        }
        setIsListening(false);
        setIsSpeaking(true);

        const response = await fetch("/api/avatar/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);

          // FIXED: Only ONE place to restart - right here
          // Schedule restart with delay to prevent echo
          scheduleRestart(800);
        };

        audio.onerror = e => {
          console.error("Audio playback error:", e);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        // Wait for metadata
        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => {
            console.log("Audio metadata loaded, duration:", audio.duration);
            resolve();
          };
          audio.onerror = () => reject(new Error("Failed to load audio metadata"));
        });

        // Start lip sync BEFORE playing audio
        const durationMs = audio.duration * 1000;
        console.log("Starting lip sync with duration:", durationMs, "ms");
        onAudioStart?.(durationMs);

        // Play audio
        await audio.play();
        console.log("Audio playing");

        return audioUrl;
      } catch (err) {
        console.error("Generate speech error:", err);
        setIsSpeaking(false);
        throw err;
      }
    },
    [voiceSettings, onAudioStart, scheduleRestart, clearRestartTimeout]
  );

  /**
   * Generate and play audio using Browser TTS (Web Speech Synthesis API)
   */
  const generateAndPlayAudioBrowser = useCallback(
    async (text: string) => {
      try {
        console.log("[Browser TTS] Generating speech:", text);

        // Check if browser TTS is supported
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          throw new Error('Browser TTS not supported');
        }

        // Stop any ongoing playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Cancel any ongoing browser speech
        window.speechSynthesis.cancel();

        // Stop mic before speaking
        clearRestartTimeout();
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore
          }
        }
        setIsListening(false);
        setIsSpeaking(true);

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = ttsLanguage;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Select appropriate voice
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice: SpeechSynthesisVoice | undefined;

        // Priority 1: Use specific voice name if provided
        if (browserVoiceName) {
          selectedVoice = voices.find(v => v.name === browserVoiceName);
          if (selectedVoice) {
            console.log(`[Browser TTS] Using specified voice: ${selectedVoice.name}`);
          }
        }

        // Priority 2: Find voice by language
        if (!selectedVoice) {
          const languageCode = ttsLanguage.split('-')[0] || ttsLanguage; // 'vi' from 'vi-VN'
          selectedVoice = voices.find(v => v.lang.startsWith(languageCode));
        }

        // Priority 3: Fallback to any voice
        if (!selectedVoice && voices.length > 0) {
          selectedVoice = voices[0];
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log(`[Browser TTS] Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
        }

        // Estimate duration (rough approximation: ~150 words per minute)
        const words = text.split(/\s+/).length;
        const estimatedDuration = (words / 150) * 60 * 1000; // milliseconds
        console.log("[Browser TTS] Estimated duration:", estimatedDuration, "ms");

        // Start lip sync with estimated duration
        onAudioStart?.(estimatedDuration);

        // Set up event handlers
        utterance.onstart = () => {
          console.log("[Browser TTS] Started speaking");
        };

        utterance.onend = () => {
          console.log("[Browser TTS] Finished speaking");
          setIsSpeaking(false);

          // Schedule restart with delay
          scheduleRestart(800);
        };

        utterance.onerror = (event) => {
          console.error("[Browser TTS] Error:", event.error);
          setIsSpeaking(false);
          throw new Error(`Browser TTS error: ${event.error}`);
        };

        // Speak
        window.speechSynthesis.speak(utterance);

        return 'browser-tts'; // Return identifier instead of URL
      } catch (err) {
        console.error("Browser TTS error:", err);
        setIsSpeaking(false);
        throw err;
      }
    },
    [ttsLanguage, browserVoiceName, onAudioStart, scheduleRestart, clearRestartTimeout]
  );

  /**
   * Generate speech (routes to correct TTS provider)
   */
  const generateSpeech = useCallback(
    async (text: string) => {
      try {
        console.log(`[TTS] Using provider: ${ttsProvider}`);

        // Route to correct TTS provider
        if (ttsProvider === 'browser') {
          await generateAndPlayAudioBrowser(text);
        } else {
          await generateAndPlayAudio(text);
        }
      } catch (err) {
        console.error("Generate speech error:", err);
        setError(err instanceof Error ? err.message : "Speech generation failed");
        onError?.(err instanceof Error ? err : new Error("Speech generation failed"));
      }
    },
    [ttsProvider, generateAndPlayAudioBrowser, generateAndPlayAudio, onError]
  );

  /**
   * Start conversation
   */
  const startConversation = useCallback(async () => {
    if (!isWebSpeechSupported) {
      const errorMsg =
        "Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.";
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return;
    }

    // CORRECT APPROACH: Request microphone permission using getUserMedia FIRST
    // getUserMedia and SpeechRecognition share the same audio permission
    // This is more reliable than Permissions API
    try {
      console.log("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Permission granted! Stop the stream immediately - we don't need it
      // We just needed to trigger the permission request
      stream.getTracks().forEach(track => track.stop());
      console.log("Microphone permission granted");
    } catch (err) {
      // Permission denied or error
      const error = err as Error;
      console.error("Microphone permission error:", error);

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        const errorMsg =
          "Microphone access was denied. Please click the 🔒 lock icon in your browser's address bar, allow microphone access, then reload the page.";
        setError(errorMsg);
        onError?.(new Error(errorMsg));
      } else if (error.name === "NotFoundError") {
        const errorMsg = "No microphone found. Please connect a microphone and try again.";
        setError(errorMsg);
        onError?.(new Error(errorMsg));
      } else {
        const errorMsg = `Microphone error: ${error.message}`;
        setError(errorMsg);
        onError?.(error);
      }
      return;
    }

    isActiveRef.current = true;
    setError(null);

    // CRITICAL FIX: Always recreate recognition to get fresh event handlers
    // This prevents stale closure issues
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }

    recognitionRef.current = initializeSpeechRecognition();

    if (recognitionRef.current) {
      safeStartRecognition();
    }
  }, [initializeSpeechRecognition, safeStartRecognition, onError]);

  /**
   * Stop conversation
   */
  const stopConversation = useCallback(() => {
    isActiveRef.current = false;
    isProcessingMessageRef.current = false;
    clearRestartTimeout();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
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
    setTranscript("");
  }, [clearRestartTimeout]);

  /**
   * Pause conversation
   */
  const pauseConversation = useCallback(() => {
    clearRestartTimeout();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setIsListening(false);
  }, [clearRestartTimeout]);

  /**
   * Resume conversation
   */
  const resumeConversation = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    } else if (recognitionRef.current && isActiveRef.current) {
      safeStartRecognition();
    }
  }, [safeStartRecognition]);

  /**
   * Clear conversation
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setTranscript("");
    setError(null);
  }, []);

  /**
   * Update voice settings
   */
  const updateVoiceSettings = useCallback((settings: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => ({ ...prev, ...settings }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (finalizeTimeoutRef.current) {
        clearTimeout(finalizeTimeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      isActiveRef.current = false;
      isProcessingMessageRef.current = false;
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

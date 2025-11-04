/**
 * Browser-based Text-to-Speech Hook
 * Uses Web Speech Synthesis API (free, no API key needed)
 * Supports Vietnamese (vi-VN) and other languages
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface BrowserTTSOptions {
  language?: string; // BCP-47 language code (e.g., 'vi-VN', 'en-US')
  voiceName?: string; // Specific voice name (optional)
  rate?: number; // Speech rate (0.1 to 10, default 1)
  pitch?: number; // Speech pitch (0 to 2, default 1)
  volume?: number; // Speech volume (0 to 1, default 1)
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface BrowserTTSState {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
}

export interface BrowserTTSActions {
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  setVoice: (voiceName: string) => void;
}

const isWebSpeechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export function useBrowserTTS(
  options: BrowserTTSOptions = {}
): BrowserTTSState & BrowserTTSActions {
  const {
    language = "vi-VN",
    voiceName,
    rate = 1,
    pitch = 1,
    volume = 1,
    onStart,
    onEnd,
    onError,
  } = options;

  // State
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Refs
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    if (!isWebSpeechSupported) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      // Auto-select voice based on language or voiceName
      if (voices.length > 0) {
        let voice: SpeechSynthesisVoice | undefined;

        if (voiceName) {
          // Try to find exact voice name match
          voice = voices.find(v => v.name === voiceName);
        }

        if (!voice) {
          const languageCode = language.split("-")[0];

          // For Vietnamese, prefer HoaiMy (female) voice
          if (languageCode === "vi") {
            // Try to find HoaiMy specifically
            voice = voices.find(
              v =>
                v.lang.startsWith("vi") && (v.name.includes("HoaiMy") || v.name.includes("Hoài My"))
            );

            // If HoaiMy not found, try any female Vietnamese voice
            if (!voice) {
              voice = voices.find(
                v =>
                  v.lang.startsWith("vi") &&
                  (v.name.includes("Female") || v.name.includes("Linh") || v.name.includes("My"))
              );
            }
          }

          // Fallback: find any voice by language
          if (!voice) {
            const languageCode = language.split("-")[0] || language;
            voice = voices.find(v => v.lang.startsWith(languageCode));
          }
        }

        if (!voice) {
          // Fallback: use first available voice
          voice = voices[0];
        }

        setSelectedVoice(voice || null);

        console.log("[BrowserTTS] Available voices:", voices.length);
        console.log(
          "[BrowserTTS] Vietnamese voices:",
          voices.filter(v => v.lang.startsWith("vi")).map(v => v.name)
        );
        console.log("[BrowserTTS] Selected voice:", voice?.name, voice?.lang);
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
  }, [language, voiceName]);

  // Speak function
  const speak = useCallback(
    (text: string) => {
      if (!isWebSpeechSupported) {
        onError?.(new Error("Browser TTS not supported"));
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Event handlers
      utterance.onstart = () => {
        console.log("[BrowserTTS] Started speaking:", text.substring(0, 50));
        setIsSpeaking(true);
        setIsPaused(false);
        onStart?.();
      };

      utterance.onend = () => {
        console.log("[BrowserTTS] Finished speaking");
        setIsSpeaking(false);
        setIsPaused(false);
        onEnd?.();
      };

      utterance.onerror = event => {
        console.error("[BrowserTTS] Error:", event.error);
        setIsSpeaking(false);
        setIsPaused(false);
        onError?.(new Error(`Speech synthesis error: ${event.error}`));
      };

      utterance.onpause = () => {
        console.log("[BrowserTTS] Paused");
        setIsPaused(true);
      };

      utterance.onresume = () => {
        console.log("[BrowserTTS] Resumed");
        setIsPaused(false);
      };

      utteranceRef.current = utterance;

      // Speak
      window.speechSynthesis.speak(utterance);
    },
    [language, rate, pitch, volume, selectedVoice, onStart, onEnd, onError]
  );

  // Pause function
  const pause = useCallback(() => {
    if (isWebSpeechSupported && isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
    }
  }, [isSpeaking, isPaused]);

  // Resume function
  const resume = useCallback(() => {
    if (isWebSpeechSupported && isSpeaking && isPaused) {
      window.speechSynthesis.resume();
    }
  }, [isSpeaking, isPaused]);

  // Cancel function
  const cancel = useCallback(() => {
    if (isWebSpeechSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, []);

  // Set voice by name
  const setVoice = useCallback(
    (name: string) => {
      const voice = availableVoices.find(v => v.name === name);
      if (voice) {
        setSelectedVoice(voice);
        console.log("[BrowserTTS] Voice changed to:", voice.name, voice.lang);
      }
    },
    [availableVoices]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isWebSpeechSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    // State
    isSupported: isWebSpeechSupported,
    isSpeaking,
    isPaused,
    availableVoices,
    selectedVoice,

    // Actions
    speak,
    pause,
    resume,
    cancel,
    setVoice,
  };
}

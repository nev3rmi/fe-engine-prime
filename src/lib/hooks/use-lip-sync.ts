/**
 * useLipSync Hook
 * Manages lip sync animation based on audio playback
 */

import { useState, useEffect, useRef, useCallback } from "react";

import type { Viseme, LipSyncState, LipSyncActions, VisemeTiming } from "@/types/avatar";

export function useLipSync(): LipSyncState & LipSyncActions {
  const [currentViseme, setCurrentViseme] = useState<Viseme>("neutral");
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const visemesRef = useRef<VisemeTiming[]>([]);
  const startTimeRef = useRef<number>(0);
  const isPausedRef = useRef(false);

  /**
   * Simple audio analysis for lip sync
   * Maps audio amplitude to mouth shapes
   */
  const analyzeAudio = useCallback((audio: HTMLAudioElement): VisemeTiming[] => {
    // For demo purposes, create a simple pattern based on audio duration
    // In production, you'd want to analyze the actual audio waveform
    const duration = audio.duration * 1000; // Convert to milliseconds
    const visemes: VisemeTiming[] = [];
    const visemeTypes: Viseme[] = ["A", "E", "I", "O", "U", "closed"];

    // Generate viseme pattern
    const visemeCount = Math.floor(duration / 150); // One viseme every 150ms

    for (let i = 0; i < visemeCount; i++) {
      const time = i * 150;
      const visemeIndex = Math.floor(Math.random() * visemeTypes.length);
      const viseme = visemeTypes[visemeIndex] || "neutral";

      visemes.push({
        viseme,
        time,
        duration: 150,
      });
    }

    // Add a closing neutral viseme at the end
    visemes.push({
      viseme: "neutral",
      time: duration - 100,
      duration: 100,
    });

    return visemes;
  }, []);

  /**
   * Update viseme based on elapsed time
   */
  const updateViseme = useCallback(() => {
    if (!isAnimating || isPausedRef.current) {
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;

    // Find the current viseme
    const currentVisemeTiming = visemesRef.current.find(
      v => elapsed >= v.time && elapsed < v.time + v.duration
    );

    if (currentVisemeTiming) {
      setCurrentViseme(currentVisemeTiming.viseme);
    } else {
      setCurrentViseme("neutral");
    }

    // Update progress (estimate based on visemes)
    if (visemesRef.current.length > 0) {
      const lastViseme = visemesRef.current[visemesRef.current.length - 1];
      const totalDuration = lastViseme ? lastViseme.time + lastViseme.duration : 1;
      setProgress(Math.min(elapsed / totalDuration, 1));
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(updateViseme);
  }, [isAnimating]);

  /**
   * Start lip sync animation (audio is played elsewhere)
   * @param duration - Animation duration in milliseconds
   * @param customVisemes - Optional custom viseme timings
   */
  const startLipSync = useCallback(
    (duration = 5000, customVisemes?: VisemeTiming[]) => {
      // Stop any existing animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use custom visemes if provided, otherwise generate simple pattern
      if (customVisemes && customVisemes.length > 0) {
        visemesRef.current = customVisemes;
      } else {
        // Generate viseme pattern based on duration
        const visemes: VisemeTiming[] = [];
        const visemeTypes: Viseme[] = ["A", "E", "I", "O", "U", "closed"];
        const visemeCount = Math.floor(duration / 150); // One viseme every 150ms

        for (let i = 0; i < visemeCount; i++) {
          const time = i * 150;
          const visemeIndex = Math.floor(Math.random() * visemeTypes.length);
          const viseme = visemeTypes[visemeIndex] || "neutral";

          visemes.push({
            viseme,
            time,
            duration: 150,
          });
        }

        // Add a closing neutral viseme at the end
        visemes.push({
          viseme: "neutral",
          time: duration - 100,
          duration: 100,
        });

        visemesRef.current = visemes;
      }

      // Start animation (without playing audio)
      setIsAnimating(true);
      startTimeRef.current = Date.now();
      isPausedRef.current = false;
      animationFrameRef.current = requestAnimationFrame(updateViseme);

      // Auto-stop animation after duration
      setTimeout(() => {
        setIsAnimating(false);
        setCurrentViseme("neutral");
        setProgress(0);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      }, duration);
    },
    [updateViseme]
  );

  /**
   * Stop lip sync
   */
  const stopLipSync = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsAnimating(false);
    setCurrentViseme("neutral");
    setProgress(0);
    isPausedRef.current = false;
  }, []);

  /**
   * Pause lip sync
   */
  const pauseLipSync = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    isPausedRef.current = true;
  }, []);

  /**
   * Resume lip sync
   */
  const resumeLipSync = useCallback(() => {
    if (audioRef.current && isPausedRef.current) {
      audioRef.current.play();
      isPausedRef.current = false;
      animationFrameRef.current = requestAnimationFrame(updateViseme);
    }
  }, [updateViseme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    currentViseme,
    isAnimating,
    progress,
    startLipSync,
    stopLipSync,
    pauseLipSync,
    resumeLipSync,
  };
}

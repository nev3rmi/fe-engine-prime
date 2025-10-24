/**
 * VoiceControls Component
 * Controls for voice conversation (mic toggle, status display)
 */

'use client';

import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VoiceControlsProps } from '@/types/avatar';

export function VoiceControls({
  isListening,
  isSpeaking,
  isThinking,
  onStartListening,
  onStopListening,
  volume = 0,
  className,
}: VoiceControlsProps) {
  const isActive = isListening || isSpeaking || isThinking;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Main control button */}
      <div className="relative">
        <Button
          size="lg"
          variant={isListening ? 'destructive' : 'default'}
          onClick={isListening ? onStopListening : onStartListening}
          disabled={isSpeaking || isThinking}
          className={cn(
            'relative w-20 h-20 rounded-full transition-all duration-300',
            isListening && 'animate-pulse'
          )}
        >
          {isThinking ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : isListening ? (
            <MicOff className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </Button>

        {/* Volume indicator */}
        {isListening && volume > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="absolute rounded-full border-2 border-primary bg-primary/10"
              style={{
                width: `${80 + volume * 40}px`,
                height: `${80 + volume * 40}px`,
                opacity: volume,
                transition: 'all 0.1s ease-out',
              }}
            />
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-sm font-medium">
          {isListening && 'Listening... Speak now'}
          {isThinking && 'Processing your message...'}
          {isSpeaking && 'Avatar is speaking...'}
          {!isActive && 'Click to start conversation'}
        </p>

        {isListening && (
          <p className="text-xs text-muted-foreground mt-1">
            Click again to stop listening
          </p>
        )}
      </div>

      {/* Browser compatibility warning */}
      {typeof window !== 'undefined' &&
        !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
            ⚠️ Voice input requires Chrome, Edge, or Safari
          </div>
        )}
    </div>
  );
}

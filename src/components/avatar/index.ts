/**
 * Avatar Components
 * Export all avatar-related components
 */

export { ConversationalAvatar } from './ConversationalAvatar';
export { AvatarDisplay } from './AvatarDisplay';
export { VoiceControls } from './VoiceControls';
export { ChatHistory } from './ChatHistory';

// Re-export hooks for convenience
export { useVoiceConversation } from '@/lib/hooks/use-voice-conversation';
export { useLipSync } from '@/lib/hooks/use-lip-sync';

// Re-export types
export type {
  ConversationalAvatarProps,
  AvatarDisplayProps,
  VoiceControlsProps,
  ChatHistoryProps,
  Message,
  Viseme,
  AvatarState,
  AvatarStyle,
} from '@/types/avatar';

/**
 * Avatar System Type Definitions
 * Real-time conversational avatar with voice interaction
 */

/**
 * Viseme types for lip sync animation
 * Based on simplified phoneme mapping
 */
export type Viseme = 'A' | 'E' | 'I' | 'O' | 'U' | 'closed' | 'neutral';

/**
 * Avatar speaking state
 */
export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

/**
 * Avatar visual styles
 */
export type AvatarStyle = 'simple' | 'realistic' | 'animated';

/**
 * Message role in conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Conversation message
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  audioUrl?: string;
  duration?: number; // Audio duration in seconds
}

/**
 * Conversation state
 */
export interface ConversationState {
  messages: Message[];
  conversationId: string | null;
  isActive: boolean;
  currentSpeaker: MessageRole | null;
}

/**
 * Voice settings for TTS
 */
export interface VoiceSettings {
  voiceId: string;
  stability?: number; // 0-1
  similarityBoost?: number; // 0-1
  style?: number; // 0-1
  useSpeakerBoost?: boolean;
}

/**
 * Viseme timing for lip sync
 */
export interface VisemeTiming {
  viseme: Viseme;
  time: number; // milliseconds
  duration: number; // milliseconds
}

/**
 * Audio analysis result
 */
export interface AudioAnalysis {
  visemes: VisemeTiming[];
  duration: number;
  sampleRate: number;
}

/**
 * Dify chat message request
 */
export interface DifyChatRequest {
  query: string;
  inputs?: Record<string, unknown>;
  response_mode: 'streaming' | 'blocking';
  conversation_id?: string;
  user: string;
  files?: Array<{
    type: 'image' | 'document' | 'audio' | 'video';
    transfer_method: 'remote_url' | 'local_file';
    url?: string;
    upload_file_id?: string;
  }>;
  auto_generate_name?: boolean;
}

/**
 * Dify streaming event types
 */
export type DifyEventType =
  | 'message'
  | 'message_end'
  | 'message_replace'
  | 'agent_thought'
  | 'agent_message'
  | 'tts_message'
  | 'tts_message_end'
  | 'error'
  | 'ping';

/**
 * Dify message event
 */
export interface DifyMessageEvent {
  event: 'message';
  message_id: string;
  conversation_id: string;
  answer: string;
  created_at: number;
}

/**
 * Dify message end event
 */
export interface DifyMessageEndEvent {
  event: 'message_end';
  id: string;
  message_id: string;
  conversation_id: string;
  metadata: {
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      prompt_price: string;
      completion_price: string;
      total_price: string;
      currency: string;
      latency: number;
    };
  };
}

/**
 * Dify TTS message event
 */
export interface DifyTTSMessageEvent {
  event: 'tts_message' | 'tts_message_end';
  conversation_id: string;
  message_id: string;
  task_id: string;
  audio: string; // base64 encoded audio
  created_at: number;
}

/**
 * Dify error event
 */
export interface DifyErrorEvent {
  event: 'error';
  message_id?: string;
  status: number;
  code: string;
  message: string;
}

/**
 * Union type for all Dify events
 */
export type DifyEvent =
  | DifyMessageEvent
  | DifyMessageEndEvent
  | DifyTTSMessageEvent
  | DifyErrorEvent;

/**
 * ElevenLabs TTS request
 */
export interface ElevenLabsTTSRequest {
  text: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

/**
 * Speech recognition result
 */
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

/**
 * Voice conversation hook state
 */
export interface VoiceConversationState {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  isProcessing: boolean;
  currentState: AvatarState;
  transcript: string;
  messages: Message[];
  conversationId: string | null;
  error: string | null;
}

/**
 * Voice conversation hook actions
 */
export interface VoiceConversationActions {
  startConversation: () => void;
  stopConversation: () => void;
  pauseConversation: () => void;
  resumeConversation: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearConversation: () => void;
  setVoiceSettings: (settings: Partial<VoiceSettings>) => void;
}

/**
 * Lip sync hook state
 */
export interface LipSyncState {
  currentViseme: Viseme;
  isAnimating: boolean;
  progress: number; // 0-1
}

/**
 * Lip sync hook actions
 */
export interface LipSyncActions {
  startLipSync: (audioUrl: string, visemes?: VisemeTiming[]) => void;
  stopLipSync: () => void;
  pauseLipSync: () => void;
  resumeLipSync: () => void;
}

/**
 * Conversational Avatar Props
 */
export interface ConversationalAvatarProps {
  /** AI personality/system prompt override */
  aiPersonality?: string;

  /** ElevenLabs voice ID */
  voiceId?: string;

  /** Avatar visual style */
  avatarStyle?: AvatarStyle;

  /** Auto-start conversation on mount */
  autoStart?: boolean;

  /** Show chat history */
  showChatHistory?: boolean;

  /** Enable/disable voice input */
  enableVoiceInput?: boolean;

  /** Enable/disable text input fallback */
  enableTextInput?: boolean;

  /** Custom class name */
  className?: string;

  /** User identifier for Dify */
  userId?: string;

  /** Callback when conversation starts */
  onConversationStart?: () => void;

  /** Callback when conversation ends */
  onConversationEnd?: () => void;

  /** Callback when message is received */
  onMessage?: (message: Message) => void;

  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

/**
 * Avatar Display Props
 */
export interface AvatarDisplayProps {
  currentViseme: Viseme;
  state: AvatarState;
  style: AvatarStyle;
  className?: string;
}

/**
 * Voice Controls Props
 */
export interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  volume?: number; // 0-1
  className?: string;
}

/**
 * Chat History Props
 */
export interface ChatHistoryProps {
  messages: Message[];
  className?: string;
  maxHeight?: string;
  autoScroll?: boolean;
}

/**
 * Audio playback state
 */
export interface AudioPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

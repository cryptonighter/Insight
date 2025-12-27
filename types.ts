
export interface UserContext {
  onboardingCompleted: boolean;
  name?: string;
}

export interface Insight {
  id: string;
  text: string;
  timestamp: number;
  type: 'voice' | 'text';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  suggestion?: {
    focus: string;
    feeling: string;
    duration: number;
  };
}

export interface Pattern {
  id: string;
  title: string;
  description: string;
  observationCount: number;
  lastObserved: number; // timestamp
  insights: string[]; // IDs of related insights
  color: string; // Hex code for dot
  status: 'pending' | 'active' | 'archived';
  userNotes?: string;
}

// Valid Gemini Voices
export type VoiceId = 'Kore' | 'Fenrir' | 'Puck' | 'Charon' | 'Aoede';

// Soundscape Types
export type SoundscapeType = 'deep-space' | 'rain' | 'stream' | 'silence';

// Admin / Soundscape Types
export interface SoundscapeMetadata {
  mood: string;
  intensity: 'low' | 'medium' | 'high';
  suitableTopics: string[];
  instrumentation: string;
  description: string;
}

export interface Soundscape {
  id: string;
  name: string;
  audioBase64: string; // Stored locally for demo purposes
  metadata: SoundscapeMetadata;
  createdAt: number;
}

export interface AudioSegment {
  text: string;
  audioBase64: string;
  duration?: number; // Duration in seconds (calculated after decode)
}

export interface MeditationConfig {
  focus: string;
  feeling: string;
  duration: number;
  voice: VoiceId;
  speed: number; // 0.8 - 1.2
  soundscapeId: string;
  background?: SoundscapeType;
}

// --- NEW: THE SONIC DIRECTOR TYPES ---
export type AudioActionType = 'FADE_VOL' | 'SET_BINAURAL' | 'WAIT';

export interface SonicInstruction {
  action: AudioActionType;
  layer: 'atmosphere' | 'resonance' | 'voice';
  targetValue?: number; // Target volume (0-1) or Frequency (Hz)
  duration?: number; // How long the transition takes (seconds)
}

// Updated for Progressive Playback with Screenplay logic
export interface PlayableSegment {
  id: string;
  audioUrl: string; // Blob URL of the processed WAV segment
  text: string;
  duration: number;
  // Instructions to execute WHEN this segment starts playing
  instructions?: SonicInstruction[]; 
}

export interface FeedbackData {
    pacing: number; // 0 (Too Slow) - 100 (Too Fast), 50 is perfect
    voice: number; // 0 (Distracting) - 100 (Soothing)
    immersion: number; // 0 (Generic) - 100 (Deeply Personal)
    note?: string;
}

export interface Meditation {
  id: string;
  title: string;
  durationMinutes: number;
  createdAt: number;
  transcript: string; 
  lines: string[]; 
  
  // Progressive Playback Fields
  audioQueue: PlayableSegment[]; // Segments are added here as they are generated
  isGenerating: boolean; // True while chunks are still being added
  
  played: boolean;
  feedback?: FeedbackData; // Updated to complex object
  patternsUsed?: string[]; 
  soundscapeId?: string; // ID of the soundscape used
  backgroundType?: SoundscapeType;
  config?: MeditationConfig; 
  
  // Legacy support (optional)
  audioUrl?: string; 
}

export interface GenerationRequest {
  focus: string;
  feeling: string;
  duration: number;
  userInsights: Insight[];
  activePatterns: Pattern[];
}

export enum ViewState {
  ONBOARDING = 'ONBOARDING',
  HOME = 'HOME',
  LOADING = 'LOADING', 
  CARDS = 'CARDS',
  MEDITATIONS = 'MEDITATIONS',
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN' // New View
}

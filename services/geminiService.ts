import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabaseClient";
import {
  Pattern, Insight, ChatMessage, VoiceId, SoundscapeMetadata, SonicInstruction, MethodologyType, PlayableSegment
} from "../types";
import { CLINICAL_PROTOCOLS } from "./protocols";

// Initialize Gemini Client
const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY || "";

console.log("🛠️ AI Service Init:", {
  hasGoogleKey: !!googleApiKey,
});

if (!googleApiKey || googleApiKey === "") {
  console.error("🚨 CRITICAL: VITE_GOOGLE_API_KEY is missing. Check .env and RESTART your dev server.");
}

const ai = new GoogleGenAI({ apiKey: googleApiKey });

// Constants for models
const TEXT_MODEL = "gemini-2.5-flash-preview-09-2025"; // Keeping 2.5 as stable base for Logic, but User asked for 3.
// UPDATED: Using Gemini 3 Flash Preview as requested
const BRAIN_MODEL = "gemini-3-flash-preview";
// TTS models: Lite is faster/lower latency, regular has better quality
const AUDIO_MODEL_LITE = "gemini-2.5-flash-lite-preview-tts"; // Faster, lower latency
const AUDIO_MODEL = "gemini-2.5-flash-preview-tts"; // Higher quality fallback

// Resemble AI TTS (Primary - much faster than Gemini)
const RESEMBLE_API_KEY = import.meta.env.VITE_RESEMBLE_API_KEY || "";
const RESEMBLE_VOICE_UUID = import.meta.env.VITE_RESEMBLE_VOICE_UUID || "";
const RESEMBLE_STREAM_URL = "https://f.cluster.resemble.ai/stream";
const USE_RESEMBLE = !!RESEMBLE_API_KEY && !!RESEMBLE_VOICE_UUID;

console.log("🎙️ RESEMBLE CONFIG DEBUG:", {
  hasApiKey: !!RESEMBLE_API_KEY,
  hasVoiceUuid: !!RESEMBLE_VOICE_UUID,
  USE_RESEMBLE,
  keyPreview: RESEMBLE_API_KEY ? RESEMBLE_API_KEY.substring(0, 8) + '...' : 'MISSING',
  voiceUuid: RESEMBLE_VOICE_UUID || 'MISSING'
});

if (USE_RESEMBLE) {
  console.log("🎙️ Resemble AI TTS enabled (faster streaming)");
} else {
  console.log("🎙️ Using Gemini TTS (Resemble not configured)");
}

// Voice Profiles Strategy
const VOICE_PROFILES: Record<string, string> = {
  'Kore': `
# AUDIO PROFILE: Kore
## THE SCENE: The Inner Sanctuary
A vast, boundless space of perfect stillness. The acoustics are warm and intimate, as if the guide is speaking directly next to the listener's ear, yet the environment feels expansive. There is a sense of safety and timelessness.

### DIRECTOR'S NOTES
Style:
* "The Grounding Mother": Deeply rooted, stable, and compassionate.
* Tone: Warm, ethereal, slightly airy but consistent.
* Dynamics: Soft, intimate projection. No "announcer" voice.

Pacing:
* "The Drift": Incredibly slow, liquid tempo.
* [Audible Inhale/Exhale]: Perform these sounds audibly.
* [Silence]: Pause for 3-5 seconds.
`,
  'Fenrir': `
# AUDIO PROFILE: Fenrir
## THE SCENE: The Ancient Forest
A deep, old growth forest at twilight. The air is cool and heavy with the scent of pine. The acoustics are dry and grounded, absorbing sound.

### DIRECTOR'S NOTES
Style:
* "The Sage": Deep, rumbling, authoritative but gentle.
* Tone: Lower register, rich resonance, protective.
* Dynamics: Steady, unwavering, calming.

Pacing:
* "The Mountain": Slow, deliberate, with weight behind every word.
* [Audible Inhale/Exhale]: Deep, audible chest breaths.
* [Silence]: profound silence.
`,
  'Puck': `
# AUDIO PROFILE: Puck
## THE SCENE: The Sunlit Studio
A warm, acoustically treated space filled with soft natural light. It feels safe, clear, and focused.

### DIRECTOR'S NOTES
Style:
* "The Balanced Companion": Grounded, mellow, and clear.
* Tone: Warm mid-range, relaxed, conversational but deeply present.
* Dynamics: Gentle, even, reassuring.

Pacing:
* "The Flow": Smooth, steady, relaxed tempo. Not rushed.
* [Audible Inhale/Exhale]: Do not speak the words. Perform a deep, audible breath.
`
};

// Director Tool Definitions
const directorTools = [
  {
    name: "select_meditation_protocol",
    description: "Selects the optimal meditation methodology and configuration.",
    parameters: {
      type: "object",
      properties: {
        methodology: { type: "string", enum: ["IFS", "SOMATIC_AGENCY", "NSDR", "GENERAL"] },
        focus: { type: "string" },
        targetFeeling: { type: "string" },
        intensity: { type: "string", enum: ["SOFT", "MODERATE", "DEEP"] },
        rationale: { type: "string" }
      },
      required: ["methodology", "focus", "targetFeeling", "intensity"]
    }
  }
];

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Silent MP3 (1 second) to prevent playback crashes
const getSilentMp3Base64 = (): string => {
  return "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//oeAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwAM=";
};

export const runDirectorOrchestration = async (
  input: string,
  triage: { valence: number; arousal: number },
  growthHistory: { parts: any[]; patterns: any[] }
): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('director', {
      body: { input, triage, growthHistory }
    });

    if (error) throw error;

    console.log("Director Decision (Edge):", data);

    // The AI returns { name: '...', parameters: { ... } }
    // We map parameters to args for the AppContext
    return {
      type: 'TOOL_CALL',
      name: data.name || 'select_meditation_protocol',
      args: data.parameters || data // Fallback if data is already the args
    };
  } catch (e) {
    console.error("Director orchestration failed", e);
    // Return safe fallback
    return {
      type: 'TOOL_CALL',
      name: 'select_meditation_protocol',
      args: {
        methodology: "NSDR",
        focus: "Grounding",
        targetFeeling: "Calm",
        intensity: "MODERATE",
        rationale: "Connectivity restored (Local fallback used)"
      }
    };
  }
};

export const chatWithInsight = async (
  history: ChatMessage[],
  latestInput: string,
  userVariables: Record<string, any> = {},
  directorSuggestion: any = null
): Promise<{
  reply: string;
  shouldOfferMeditation: boolean;
  meditationData?: { focus: string; feeling: string; duration: number; methodology: MethodologyType }
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { history, latestInput, userVariables, directorSuggestion }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Chat error", error);
    return { reply: "I hear you. Tell me more.", shouldOfferMeditation: false };
  }
};

/**
 * Generates a session summary preview for the unified setup UX.
 * Director chooses methodology, soundscape, and creates a short preview of what to expect.
 */
export const generateSessionSummary = async (
  theme: string,
  duration: number,
  customContext?: string,
  refinementRequest?: string,
  availableSoundscapes?: { id: string; name: string; mood?: string }[]
): Promise<{
  title: string;
  methodology: MethodologyType;
  focus: string;
  soundscapeId: string;
  preview: string;
}> => {
  const soundscapeList = availableSoundscapes?.map(s => `${s.id}: ${s.name} (${s.mood || 'ambient'})`).join('\n') || 'default: Ambient';

  const prompt = `You are a meditation session director. Create a personalized session based on user input.

USER THEME: ${theme}
DURATION: ${duration} minutes
${customContext ? `ADDITIONAL CONTEXT: ${customContext}` : ''}
${refinementRequest ? `USER REFINEMENT REQUEST: ${refinementRequest}` : ''}

AVAILABLE METHODOLOGIES:
- NSDR: Non-Sleep Deep Rest for stress relief and recovery
- SOMATIC_AGENCY: Body-based practices for releasing tension and trauma
- IFS: Internal Family Systems for inner dialogue and parts work  
- GENERAL: Mindfulness and breath awareness

AVAILABLE SOUNDSCAPES:
${soundscapeList}

Return a JSON object with:
{
  "title": "Short evocative session title (3-5 words)",
  "methodology": "NSDR" | "SOMATIC_AGENCY" | "IFS" | "GENERAL",
  "focus": "Refined focus statement based on user's theme",
  "soundscapeId": "ID of the best matching soundscape",
  "preview": "2-3 sentence description of what the user will experience. Be specific about techniques used."
}

${refinementRequest ? `IMPORTANT: The user requested "${refinementRequest}" - incorporate this into the session design.` : ''}

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await ai.models.generateContent({
      model: BRAIN_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const text = response.text?.trim() || '';
    const parsed = JSON.parse(text);

    return {
      title: parsed.title || "Mindful Session",
      methodology: parsed.methodology || "NSDR",
      focus: parsed.focus || theme,
      soundscapeId: parsed.soundscapeId || availableSoundscapes?.[0]?.id || 'default',
      preview: parsed.preview || "A guided meditation tailored to your needs."
    };
  } catch (error) {
    console.error("generateSessionSummary error:", error);
    // Fallback
    return {
      title: "Calming Session",
      methodology: "NSDR",
      focus: theme,
      soundscapeId: availableSoundscapes?.[0]?.id || 'default',
      preview: `A ${duration}-minute session focused on ${theme.toLowerCase()}. We'll begin with grounding, move into deep relaxation, and close with gentle awareness.`
    };
  }
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
  // OpenRouter doesn't always support native webm transcription as a direct model call (it's text-to-text)
  // For now, keep transcription on Google Native SDK if it's specialized, 
  // OR we can try to send it as a multimodal part to 1.5-Pro on OpenRouter if supported.
  // Given user wants 3-flash-preview, we stay on Google Native for audio safety.

  const prompt = "Transcribe the spoken audio into text. Return ONLY the transcription.";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Direct Google call for transcription
      contents: [{
        parts: [
          { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
          { text: prompt }
        ]
      }],
    });
    return response.text?.trim() || "";
  } catch (e) {
    return "";
  }
};

export const analyzeSoundscape = async (audioBase64: string): Promise<SoundscapeMetadata> => {
  const prompt = `
    Listen to this audio track. It is a background soundscape for meditation.
    Analyze it and return a JSON object describing it:
    {
      "mood": "e.g., Ethereal, Dark, Grounding, Flowing",
      "intensity": "low" | "medium" | "high",
      "suitableTopics": ["Anxiety", "Sleep", "Focus", etc],
      "instrumentation": "e.g., Synth pads, Rain, Cello",
      "description": "A short poetic description of the sound."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        parts: [
          { inlineData: { mimeType: "audio/mp3", data: audioBase64 } },
          { text: prompt }
        ]
      }],
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Soundscape analysis failed", e);
    return {
      mood: "Unknown",
      intensity: "low",
      suitableTopics: ["General"],
      instrumentation: "Ambient",
      description: "An ambient soundscape."
    };
  }
};

interface ScriptBlock {
  text: string;
  instructions?: SonicInstruction[];
}

/**
 * Generate a FAST, personalized greeting for immediate playback (~30-40 words)
 * This runs while the main script generates in parallel
 * CRITICAL: Must be context-aware, not generic
 */
export const generateFastGreeting = async (
  focus: string,
  targetFeeling: string,
  methodology: MethodologyType = 'NSDR',
  contextHint?: string // e.g., "morning", "evening", recent reflection theme
): Promise<{ text: string }> => {

  const greetingPrompt = `
You are a meditation guide. Generate ONLY an opening greeting (30-40 words max).

CONTEXT:
- User's focus: "${focus}"
- Desired feeling: "${targetFeeling}"
- Protocol: ${methodology}
${contextHint ? `- Additional context: ${contextHint}` : ''}

RULES:
1. Do NOT use generic phrases like "Welcome to this meditation" or "Find a comfortable position"
2. DO reference their specific focus or feeling naturally
3. Start with something evocative related to their intention
4. End with an invitation to settle or breathe
5. Include one "[Silence]" marker at the end

STYLE:
- Present tense, sensory language
- Warm but not saccharine
- Direct experience, not explanation

OUTPUT: Return ONLY the greeting text, nothing else.
  `;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleApiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: greetingPrompt }] }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) throw new Error('Greeting generation failed');

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Ensure the greeting ends with silence marker
    const finalText = text.includes('[Silence]') ? text : `${text} [Silence]`;

    console.log('⚡ Fast Greeting Generated:', finalText.substring(0, 50) + '...');
    return { text: finalText };

  } catch (error) {
    console.warn('Fast greeting failed, using contextual fallback');
    // Contextual fallback - NOT generic
    const fallbacks: Record<MethodologyType, string> = {
      'NSDR': `Arriving here... letting ${focus} settle into awareness. The body knowing how to rest. [Silence]`,
      'IFS': `Turning inward with curiosity... noticing what surfaces around ${focus}. Breathing with it. [Silence]`,
      'SOMATIC_AGENCY': `Feeling the body's presence... inviting awareness to ${focus}. Grounding here. [Silence]`,
      'FUTURE_SELF': `Breathing into possibility... ${targetFeeling} already beginning to emerge. [Silence]`,
      'GENERAL': `Settling into this moment... ${focus} present... breath arriving. [Silence]`
    };
    return { text: fallbacks[methodology] || fallbacks['GENERAL'] };
  }
};


export const generateMeditationScript = async (
  focus: string,
  targetFeeling: string,
  durationMinutes: number,
  soundscapeDesc: string,
  voice: VoiceId = 'Kore',
  contextInsights: string[],
  methodology: MethodologyType = 'NSDR',
  variables: Record<string, any> = {}
): Promise<{ title: string; lines: string[]; batches: any[] }> => {

  try {
    const { data, error } = await supabase.functions.invoke('generate-meditation', {
      body: { focus, targetFeeling, durationMinutes, voice, contextInsights, methodology, variables }
    });

    if (error) throw error;

    // Return the raw structure so the Pipeline can manage audio generation
    const { title, batches, lines } = data;
    return { title, lines, batches };

  } catch (error) {
    console.error("Error generating meditation script:", error);
    throw new Error("Failed to create meditation script.");
  }
};

// Preprocess text for meditation pacing - sentence-by-sentence with natural pauses
const preprocessMeditationText = (text: string): string => {
  return text
    // FIRST: Remove stage directions like [Silence], [Breath], [Pause for 5 seconds]
    .replace(/\[([^\]]+)\]/g, '')
    // Add a small pause after each sentence (period, !, ?)
    // Resemble handles "..." as a short pause
    .replace(/([.!?])\s+/g, '$1 ... ')
    // Small pause after colons
    .replace(/:\s+/g, ': ... ')
    // Normalize multiple ellipsis (don't stack)
    .replace(/\.{4,}/g, '...')
    .replace(/(\.\.\.\s*){2,}/g, '... ')
    // Clean up whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
};

// Resemble AI TTS - Much faster than Gemini (~100ms vs 30s+)
const generateAudioChunkResemble = async (
  text: string
): Promise<{ audioData: string; mimeType: string }> => {
  // Preprocess for meditation pacing
  const processedText = preprocessMeditationText(text);
  console.log(`🎙️ Resemble TTS: Generating audio for ${processedText.length} chars`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("Resemble timeout after 15s"), 15000);

  try {
    const response = await fetch(RESEMBLE_STREAM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEMBLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_uuid: RESEMBLE_VOICE_UUID,
        data: processedText,
        model: 'chatterbox-turbo', // Fast turbo model
        sample_rate: 44100,
        precision: 'PCM_16',
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🎙️ Resemble API Error: ${response.status} - ${errorText}`);
      throw new Error(`Resemble API Error ${response.status}: ${errorText}`);
    }

    // Response is streaming PCM WAV - collect all chunks
    const arrayBuffer = await response.arrayBuffer();
    console.log(`🎙️ Resemble: Received ${arrayBuffer.byteLength} bytes`);

    // Convert to base64 for consistent handling with Gemini
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = btoa(binary);

    return {
      audioData: base64Audio,
      mimeType: 'audio/wav'
    };
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.error(`🎙️ Resemble TTS Failed:`, e.message);
    throw e;
  }
};

export const generateAudioChunk = async (
  text: string,
  voice: VoiceId,
  context?: { chunkIndex: number; totalChunks: number; previousChunkEnd?: string }
): Promise<{ audioData: string; mimeType: string }> => {

  // Try Resemble AI first (much faster ~100ms vs 30s+)
  if (USE_RESEMBLE) {
    try {
      return await generateAudioChunkResemble(text);
    } catch (e) {
      console.warn(`🎙️ Resemble failed, falling back to Gemini TTS`);
      // Fall through to Gemini
    }
  }

  // Gemini TTS fallback
  let retries = 0;
  const MAX_RETRIES = 3;

  // Enhancing the prompt with STRICT consistency for batches
  const baseProfile = VOICE_PROFILES[voice] || VOICE_PROFILES['Kore'];

  // Add context for voice consistency between chunks
  const contextSection = context ? `
## CONTINUITY CONTEXT
This is chunk ${context.chunkIndex + 1} of ${context.totalChunks}.
${context.previousChunkEnd ? `Previous chunk ended with: "${context.previousChunkEnd}"` : 'This is the session beginning.'}
CRITICAL: Maintain IDENTICAL voice characteristics, tone, pacing, and energy as the previous chunk.
` : '';

  const directorPrompt = `
${baseProfile}
${contextSection}
#### TRANSCRIPT
${text}
`;

  while (retries < MAX_RETRIES) {
    try {
      if (retries > 0) await delay(1000 * Math.pow(2, retries));

      // Use Lite model for first 3 attempts (faster), then fall back to regular (higher quality)
      const currentModel = retries < 3 ? AUDIO_MODEL_LITE : AUDIO_MODEL;
      console.log(`🎤 TTS Attempt ${retries + 1}/${MAX_RETRIES} - Model: ${currentModel} (REST)`);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${googleApiKey}`;

      const payload = {
        contents: [{ parts: [{ text: directorPrompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice || 'Charon' } // Charon is more grounded than Kore
            }
          }
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort("Request timed out after 30s"), 30000); // 30 second timeout for faster retry
      console.log(`🎤 TTS Connecting to API...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`TTS API Error: ${response.status} - ${errorText}`);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("🎤 TTS Response Received (REST)");

      const audioPart = data.candidates?.[0]?.content?.parts?.[0];
      if (audioPart?.inlineData?.data) {
        console.log("🎤 API MimeType:", audioPart.inlineData.mimeType);
        return {
          audioData: audioPart.inlineData.data,
          mimeType: audioPart.inlineData.mimeType || 'audio/mp3'
        };
      } else {
        throw new Error("Empty audio response in JSON");
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.warn(`TTS Failed (Attempt ${retries + 1}):`, msg);
      if (msg.includes('429')) await delay(10000); // Rate limit backoff
      retries++;
    }
  }
  throw new Error("TTS Generation Exhausted");
};


export const generateDailyContext = async (
  resolution: string,
  lastReflection: string,
  timeOfDay: 'MORNING' | 'AFTERNOON' | 'EVENING'
): Promise<{ angle: string; protocol: string; reason: string }> => {
  const prompt = `
    Role: Personal Meditation Director.
    User's North Star (Resolution): "${resolution}"
    Last Journal Note: "${lastReflection}"
    Current Time Category: ${timeOfDay}

    Task: Suggest a specific 'Daily Angle' (3-6 words) for today's session.
    - The Angle should make progress on the North Star but be adapted to the immediate context (Time/Last Note).
    - If Morning: Focus on priming, energy, or intention (e.g. "Visualizing the win").
    - If Evening: Focus on integration, release, or sleep (e.g. "Letting go of the day").
    - If Last Note was stressed: Focus on relief/reframing.

    Also select the BEST Clinical Protocol ID from:
    - [NSDR] (Rest/Focus/Sleep)
    - [IFS] (Internal Conflict/Parts)
    - [SOMATIC_AGENCY] (Confidence/Body)
    - [FUTURE_SELF] (Vision/Motivation)
    - [ACT] (Acceptance/Action)
    - [NVC] (Relationships/Empathy)

    Return JSON: { "angle": "string", "protocol": "string", "reason": "string" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: BRAIN_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    const parsed = JSON.parse(response.text || '{}');
    return {
      angle: parsed.angle || resolution,
      protocol: parsed.protocol || "NSDR",
      reason: parsed.reason || "Default"
    };
  } catch (e) {
    console.error("Context Generation Failed", e);
    return { angle: resolution || "Daily Focus", protocol: "NSDR", reason: "Expert System Offline" };
  }
};

export const analyzeInsightsForPatterns = async (insights: Insight[]): Promise<Pattern[]> => {
  if (insights.length < 2) return [];
  const insightTexts = insights.map(i => `"${i.text}"`).join('\n');
  const prompt = `Analyze these journal entries for patterns. Return JSON: [{title, description, color, observationCount}]\nEntries:\n${insightTexts}`;
  try {
    const response = await ai.models.generateContent({
      model: BRAIN_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    const patternsRaw = JSON.parse(response.text || "[]");
    return patternsRaw.map((p: any, index: number) => ({
      id: `pat-${Date.now()}-${index}`,
      title: p.title,
      description: p.description,
      observationCount: p.observationCount || 1,
      lastObserved: Date.now(),
      insights: insights.slice(0, 3).map(i => i.id || ''),
      color: p.color || "#94a3b8",
      status: 'pending'
    }));
  } catch (e) { return []; }
};

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: BaseAudioContext): Promise<AudioBuffer> {
  // Use the native browser decoder to handle WAV headers, MP3, etc.
  return await ctx.decodeAudioData(data.buffer as ArrayBuffer);
}

export function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels: Float32Array[] = [];
  let i; let sample; let offset = 0; let pos = 0;
  function setUint16(data: number) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: number) { view.setUint32(pos, data, true); pos += 4; }
  // Write WAV header
  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
  setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164);
  setUint32(length - pos - 4);
  // Get channel data
  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  // Write sample data - use separate index variable for samples
  let sampleIdx = 0;
  while (sampleIdx < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][sampleIdx]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(44 + offset, sample, true); offset += 2;
    }
    sampleIdx++;
  }
  return new Blob([bufferArr], { type: 'audio/wav' });
}

/**
 * Wraps raw PCM data with a WAV header for browser playback.
 * Use this for Gemini TTS output which returns raw 24kHz 16-bit mono little-endian PCM.
 * 
 * @param pcmData - Raw PCM bytes
 * @param sampleRate - Sample rate (default 24000 for Gemini TTS)
 * @param numChannels - Number of channels (default 1 for mono)
 * @returns Blob with WAV format
 */
export function wrapPcmToWav(
  pcmData: Uint8Array,
  sampleRate: number = 24000,
  numChannels: number = 1
): Blob {
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Copy PCM data (already little-endian from Gemini)
  const headerBytes = new Uint8Array(buffer);
  headerBytes.set(pcmData, 44);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}


/**
 * Processes a batch of audio data (base64) and returns PlayableSegments.
 * Wraps raw PCM with WAV header if needed, then creates blob URLs for playback.
 * 
 * @param audioBase64 - Base64 encoded audio data from TTS API
 * @param batchIndex - Index of this batch for ID generation
 * @param instructions - Optional sonic instructions for this segment
 * @param mimeType - Optional MIME type hint
 */
export async function processBatchWithSilenceSplitting(
  audioBase64: string,
  batchIndex: number,
  instructions?: SonicInstruction[],
  mimeType?: string
): Promise<PlayableSegment[]> {
  // Decode base64 to bytes
  const bytes = decodeBase64(audioBase64);

  // Check if already has WAV header
  const binaryCheck = String.fromCharCode(...bytes.slice(0, 12));
  const hasWavHeader = bytes.length > 12 &&
    binaryCheck.slice(0, 4) === 'RIFF' &&
    binaryCheck.slice(8, 12) === 'WAVE';

  let audioBlob: Blob;

  if (hasWavHeader) {
    // Already WAV, use as-is
    audioBlob = new Blob([bytes.slice().buffer], { type: 'audio/wav' });
  } else if (mimeType && (mimeType.includes('mp3') || mimeType.includes('mpeg'))) {
    // MP3 format
    audioBlob = new Blob([bytes.slice().buffer], { type: 'audio/mp3' });
  } else {
    // Raw PCM, wrap with WAV header (24kHz mono)
    audioBlob = wrapPcmToWav(bytes, 24000, 1);
  }

  // Create blob URL for playback
  const audioUrl = URL.createObjectURL(audioBlob);

  // Estimate duration from audio data size
  // Raw PCM: 24kHz, 16-bit, mono = 48000 bytes per second
  // WAV: same but subtract 44-byte header
  // MP3: can't reliably estimate from size, use 0 and let AudioService calculate it
  let estimatedDuration: number;
  if (hasWavHeader) {
    estimatedDuration = (bytes.length - 44) / 48000;
  } else if (mimeType && (mimeType.includes('mp3') || mimeType.includes('mpeg'))) {
    estimatedDuration = 0; // AudioService will calculate actual duration when decoding
  } else {
    estimatedDuration = bytes.length / 48000;
  }

  // Return as a single segment (silence splitting is disabled for simplicity)
  const segment: PlayableSegment = {
    id: `segment-${batchIndex}-0`,
    audioUrl,
    text: '',  // Text will be set by the caller
    duration: estimatedDuration,
    instructions
  };

  return [segment];
}

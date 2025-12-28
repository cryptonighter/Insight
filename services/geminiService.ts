import { GoogleGenAI } from "@google/genai";
import {
  Pattern, Insight, ChatMessage, VoiceId, SoundscapeMetadata, SonicInstruction, MethodologyType
} from "../types";
import { CLINICAL_PROTOCOLS } from "./protocols";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Constants for models
const TEXT_MODEL = "gemini-2.0-pro-exp-02-05";
const AUDIO_MODEL = "gemini-2.5-flash-preview-tts";

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Generate silent PCM audio (Base64) for fallback
const createSilentPCM = (durationSec: number): string => {
  const sampleRate = 24000;
  const numSamples = sampleRate * durationSec;
  const buffer = new Int16Array(numSamples).fill(0);
  const uint8 = new Uint8Array(buffer.buffer);

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
};

export const chatWithInsight = async (
  history: ChatMessage[],
  latestInput: string,
  userVariables: Record<string, any> = {}
): Promise<{
  reply: string;
  shouldOfferMeditation: boolean;
  meditationData?: { focus: string; feeling: string; duration: number; methodology: MethodologyType }
}> => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, latestInput, userVariables })
    });
    return await response.json();
  } catch (error) {
    console.error("Chat error", error);
    return { reply: "I hear you. Tell me more.", shouldOfferMeditation: false };
  }
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
  const prompt = "Transcribe the spoken audio into text. Return ONLY the transcription, no markdown, no quotes, no labels.";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        parts: [
          { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
          { text: prompt }
        ]
      }],
    });
    return response.text?.trim() || "";
  } catch (e) {
    console.error("Transcription failed", e);
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

export const generateMeditationStream = async (
  focus: string,
  targetFeeling: string,
  durationMinutes: number,
  soundscapeDesc: string,
  voice: VoiceId = 'Kore',
  contextInsights: string[],
  onChunkGenerated: (chunkBase64: string, batchIndex: number, instructions?: SonicInstruction[]) => Promise<void>,
  onComplete: () => void,
  methodology: MethodologyType = 'NSDR',
  variables: Record<string, any> = {}
): Promise<{ title: string; lines: string[] }> => {

  try {
    const response = await fetch('/api/meditation/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focus, targetFeeling, durationMinutes, voice, contextInsights, methodology, variables })
    });

    const { title, batches, lines } = await response.json();

    // The audio generation still happens on the client for the prototype to avoid complex binary streaming backends
    (async () => {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch.text) continue;
        if (i > 0) await delay(400);

        let retries = 0;
        let success = false;
        const MAX_RETRIES = 3;
        while (!success && retries < MAX_RETRIES) {
          try {
            if (retries > 0) await delay(1000 * Math.pow(2, retries));
            const speechResponse = await ai.models.generateContent({
              model: AUDIO_MODEL,
              contents: [{ role: 'user', parts: [{ text: batch.text }] }],
              config: {
                systemInstruction: "You are a meditation guide. Your voice is slow, deep, soft, and hypnotic.",
                responseModalities: ['AUDIO'] as any,
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice || 'Kore' }
                  }
                },
              },
            });

            const audioPart = speechResponse.candidates?.[0]?.content?.parts?.[0];
            if (audioPart?.inlineData?.data) {
              await onChunkGenerated(audioPart.inlineData.data, i, batch.instructions);
              success = true;
            } else {
              throw new Error("Empty audio response");
            }
          } catch (e: any) {
            console.warn(`Batch ${i} failed:`, e);
            if (retries === MAX_RETRIES - 1) {
              const mockAudio = createSilentPCM(3);
              await onChunkGenerated(mockAudio, i, []);
              success = true;
            } else {
              retries++;
            }
          }
        }
      }
      onComplete();
    })();

    return { title, lines };
  } catch (error) {
    console.error("Error generating meditation:", error);
    throw new Error("Failed to create meditation.");
  }
};

export const analyzeInsightsForPatterns = async (insights: Insight[]): Promise<Pattern[]> => {
  if (insights.length < 2) return [];
  const insightTexts = insights.map(i => `"${i.text}"`).join('\n');
  const prompt = `Analyze these journal entries for patterns. Return JSON: [{title, description, color, observationCount}]\nEntries:\n${insightTexts}`;
  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
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
  const sampleRate = 24000;
  const numChannels = 1;
  let bufferData = data;
  if (data.byteLength % 2 !== 0) {
    const newBuffer = new Uint8Array(data.byteLength + 1);
    newBuffer.set(data);
    bufferData = newBuffer;
  }
  const dataInt16 = new Int16Array(bufferData.buffer, bufferData.byteOffset, bufferData.byteLength / 2);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i] / 32768.0;
  return buffer;
}

export function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i; let sample; let offset = 0; let pos = 0;
  function setUint16(data: any) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: any) { view.setUint32(pos, data, true); pos += 4; }
  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
  setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164);
  setUint32(length - pos - 4);
  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(44 + offset, sample, true); offset += 2;
    }
    pos++;
  }
  return new Blob([bufferArr], { type: 'audio/wav' });
}

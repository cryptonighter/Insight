
import { GoogleGenAI } from "@google/genai";
import { Pattern, Insight, ChatMessage, VoiceId, SoundscapeMetadata, SonicInstruction } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  latestInput: string
): Promise<{ text: string; suggestion?: { focus: string; feeling: string; duration: number } }> => {
  
  const systemInstruction = `
    You are the 'Reality Selection Tool', a deep listening consciousness.
    Your goal: Help the user articulate what is "alive" for them right now.
    
    Rules:
    1. Be concise. Minimalist. 
    2. Do NOT give advice. Do NOT fix.
    3. Mirror back what they said with a subtle deepening question.
    4. If the user has shared enough emotional context (usually after 2-3 turns), offer to create a meditation.
    
    Output Format:
    Return JSON.
    {
      "reply": "Your response text...",
      "shouldOfferMeditation": boolean,
      "meditationData": { // Only if shouldOfferMeditation is true
        "focus": "The core theme identified",
        "feeling": "The implicit desired state (e.g. grounded, release)",
        "duration": 10
      }
    }
  `;

  const conversation = history.map(h => `${h.role === 'user' ? 'User' : 'System'}: ${h.text}`).join('\n');
  const prompt = `${conversation}\nUser: ${latestInput}`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    
    return {
      text: parsed.reply || "I hear you. Tell me more.",
      suggestion: parsed.shouldOfferMeditation ? parsed.meditationData : undefined
    };

  } catch (error) {
    console.error("Chat error", error);
    return { text: "I'm listening. Please go on." };
  }
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
  const prompt = "Transcribe the spoken audio into text. Return ONLY the transcription, no markdown, no quotes, no labels.";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Keep flash for simple transcription speed
      contents: {
        parts: [
          { inlineData: { mimeType: "audio/webm", data: audioBase64 } }, 
          { text: prompt }
        ]
      },
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
      contents: {
        parts: [
          { inlineData: { mimeType: "audio/mp3", data: audioBase64 } }, 
          { text: prompt }
        ]
      },
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
  onComplete: () => void
): Promise<{ title: string; lines: string[] }> => {
  
  // UPGRADE: The "Director" Prompt.
  // Instead of just text, we ask for a Screenplay with audio cues.
  const prompt = `
    You are a 'Sonic Director' for a high-end meditation experience.
    
    SESSION PARAMETERS:
    Focus: "${focus}"
    Desired Feeling: "${targetFeeling}"
    Duration: ${durationMinutes} mins.
    Background Audio: ${soundscapeDesc}
    Context: ${contextInsights.join(', ')}
    
    TASK:
    Write a JSON Screenplay. Each object is a "Beat".
    
    AUDIO DIRECTION RULES:
    1. Start with 'resonance' (Binaural) at 14Hz (Beta/Alert).
    2. Over the course of the session, drift 'resonance' down to 4Hz (Theta/Deep).
    3. Use 'FADE_VOL' on 'atmosphere' to 0.4 when speaking complex parts, raise to 0.8 during long silences.
    
    SCRIPTING RULES:
    1. Use ellipses (...) heavily for pacing.
    2. Start Somatic (Body focus), move to Emotional (Process), end with Integration.
    
    Output JSON format:
    {
      "title": "Poetic Title",
      "script": [
        {
          "text": "Start by finding a comfortable seat...", 
          "instructions": [
             { "action": "SET_BINAURAL", "layer": "resonance", "targetValue": 12, "duration": 0 },
             { "action": "FADE_VOL", "layer": "atmosphere", "targetValue": 0.6, "duration": 2 }
          ]
        },
        { 
           "text": "Taking a deep breath in... and holding...",
           "instructions": []
        }
      ]
    }
  `;

  try {
    // 1. Generate Text Script (The Screenplay)
    const textResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(textResponse.text || "{}");
    const scriptBlocks: ScriptBlock[] = parsed.script || [{ text: "Breathe...", instructions: [] }];
    const title = parsed.title || "Session";
    
    // 2. PRE-PROCESS & BATCH
    // We need to preserve the association between Text and Instructions.
    // We will attach instructions to the FIRST chunk of a text batch.
    
    const batches: { text: string; instructions: SonicInstruction[] }[] = [];
    let currentBatchText = "";
    let currentBatchInstructions: SonicInstruction[] = [];
    
    const TARGET_BATCH_CHARS = 400;

    for (const block of scriptBlocks) {
        // Prosody cleaning
        let cleaned = block.text.replace(/[\*\[\]#_`]/g, '').trim();
        if (!cleaned) continue;
        cleaned = cleaned.toLowerCase()
            .replace(/\./g, '... ')
            .replace(/,/g, '... ') 
            .replace(/\?/g, '...')
            .replace(/!/g, '...');

        // If this is the start of a new batch, grab instructions
        if (currentBatchText.length === 0 && block.instructions) {
            currentBatchInstructions = [...currentBatchInstructions, ...block.instructions];
        } else if (block.instructions) {
             // If we are mid-batch, we might lose precise timing of instruction, 
             // but for now, append them to the start of this batch is acceptable.
             currentBatchInstructions = [...currentBatchInstructions, ...block.instructions];
        }

        if ((currentBatchText.length + cleaned.length) < TARGET_BATCH_CHARS) {
            currentBatchText += cleaned + "\n\n";
        } else {
            batches.push({ text: currentBatchText, instructions: currentBatchInstructions });
            currentBatchText = cleaned + "\n\n";
            currentBatchInstructions = []; // Reset for next batch
        }
    }
    if (currentBatchText.length > 0) {
        batches.push({ text: currentBatchText, instructions: currentBatchInstructions });
    }

    // 3. Process Batches
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
                    contents: [{ parts: [{ text: batch.text }] }],
                    config: {
                        systemInstruction: "You are a meditation guide. Your voice is slow, deep, soft, and hypnotic. You pause frequently. You are calm and grounded. Maintain this exact tone.",
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
                    // Pass instructions along with the audio chunk
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

    return { title, lines: scriptBlocks.map(b => b.text) };

  } catch (error) {
    console.error("Error generating meditation:", error);
    throw new Error("Failed to create meditation.");
  }
};

export const analyzeInsightsForPatterns = async (insights: Insight[]): Promise<Pattern[]> => {
    if (insights.length < 2) return [];
    const insightTexts = insights.map(i => `"${i.text}"`).join('\n');
    
    const prompt = `
      Analyze these user journal entries. 
      Identify recurring psychological or behavioral patterns.
      Return JSON patterns: [{title, description, color, observationCount}]
      Entries:
      ${insightTexts}
    `;
    
    try {
        const response = await ai.models.generateContent({
        model: TEXT_MODEL, 
        contents: prompt,
        config: { responseMimeType: "application/json" }
        });
        const patternsRaw = JSON.parse(response.text || "[]");
        return patternsRaw.map((p: any, index: number) => ({
            id: `pat-${Date.now()}-${index}`,
            title: p.title,
            description: p.description,
            observationCount: p.observationCount || 1,
            lastObserved: Date.now(),
            insights: insights.slice(0, 3).map(i => i.id), 
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

  for(i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  while(pos < buffer.length) {
    for(i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos])); 
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; 
      view.setInt16(44 + offset, sample, true); offset += 2;
    }
    pos++;
  }
  return new Blob([bufferArr], { type: 'audio/wav' });
}

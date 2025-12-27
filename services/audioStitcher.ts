// This file is renamed from audioStitcher.ts to processAudioForPlayback.ts
// It now handles decoding a single full audio blob and preparing it for playback.

import { decodeBase64, decodeAudioData, bufferToWav } from "./geminiService";

/**
 * Processes a single full base64 encoded PCM audio blob:
 * 1. Decodes it into an AudioBuffer.
 * 2. Applies a subtle fade-in/fade-out.
 * 3. Converts the AudioBuffer to a WAV Blob.
 * 4. Returns an object URL for the WAV Blob.
 */
export const processAudioForPlayback = async (
  fullAudioBase64: string
): Promise<string> => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const tempCtx = new AudioContextClass(); // Use a temporary AudioContext for decoding

  try {
    // 1. Decode the full audio base64 (raw PCM)
    const bytes = decodeBase64(fullAudioBase64);
    const audioBuffer = await decodeAudioData(bytes, tempCtx);

    // 2. Apply a subtle fade-in and fade-out to the audio buffer
    const fadeDuration = Math.min(0.5, audioBuffer.duration / 4); // 0.5s fade, or quarter of duration if very short
    const gainFactor = new Float32Array(audioBuffer.length);

    for (let i = 0; i < audioBuffer.length; i++) {
      const time = i / audioBuffer.sampleRate;
      let gain = 1;

      // Fade in
      if (time < fadeDuration) {
        gain = time / fadeDuration;
      }
      // Fade out
      else if (time > audioBuffer.duration - fadeDuration) {
        gain = (audioBuffer.duration - time) / fadeDuration;
      }
      gainFactor[i] = gain;
    }

    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < audioBuffer.length; i++) {
      channelData[i] *= gainFactor[i];
    }

    // 3. Convert the modified AudioBuffer to a WAV Blob
    const wavBlob = bufferToWav(audioBuffer);
    
    // 4. Return an object URL for the WAV Blob
    return URL.createObjectURL(wavBlob);

  } catch (e) {
    console.error("Error processing full audio blob:", e);
    throw new Error("Failed to process audio for playback.");
  } finally {
    tempCtx.close(); // Ensure temporary AudioContext is closed
  }
};
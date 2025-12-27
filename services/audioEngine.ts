
import { decodeBase64, decodeAudioData, bufferToWav } from "./geminiService";
import { PlayableSegment, SonicInstruction } from "../types";

/**
 * Processes a single batch of voice audio (Base64) from Gemini.
 * 
 * UPDATE: Now supports attaching Sonic Instructions to the segment.
 */
export const processBatchWithSilenceSplitting = async (
  batchAudioBase64: string,
  batchIndex: number,
  instructions: SonicInstruction[] = []
): Promise<PlayableSegment[]> => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const tempCtx = new AudioContextClass(); 
    
    try {
        // Decode the full batch (usually a paragraph or two)
        const buffer = await decodeAudioData(decodeBase64(batchAudioBase64), tempCtx);
        
        // Convert the WHOLE buffer to a single WAV
        const wavBlob = bufferToWav(buffer);

        // Return as a single segment
        const segment: PlayableSegment = {
            id: `batch-${batchIndex}`,
            audioUrl: URL.createObjectURL(wavBlob),
            text: "", 
            duration: buffer.duration,
            instructions: instructions // Pass the instructions through
        };

        return [segment];
    } catch (e) {
        console.error("Batch processing failed", e);
        return [];
    } finally {
        tempCtx.close();
    }
};

/**
 * Legacy Support for fallback
 */
export const composeMeditation = async (): Promise<string> => {
   return "";
};

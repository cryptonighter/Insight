
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
    instructions: SonicInstruction[] = [],
    mimeType: string = 'audio/mp3'
): Promise<PlayableSegment[]> => {
    try {
        // DIRECT BLOB CREATION (Bypassing redundant decode/encode cycle)
        // Gemini TTS usually returns MP3 or WAV. We wrap it directly.
        // Even if the header is missing, browser decoders are robust.

        const byteCharacters = atob(batchAudioBase64);

        // DEBUG: Check Header
        const header = [];
        for (let i = 0; i < 8 && i < byteCharacters.length; i++) {
            header.push(byteCharacters.charCodeAt(i).toString(16).padStart(2, '0'));
        }
        console.log(`🔍 Audio Header [${mimeType}]:`, header.join(' ').toUpperCase());

        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Construct Blob using the actual mimeType from the AI
        const blob = new Blob([byteArray], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        const segment: PlayableSegment = {
            id: `batch-${batchIndex}`,
            audioUrl: blobUrl,
            text: "",
            duration: 10, // Approximate/Unknown duration until played. Player handles this.
            instructions: instructions
        };

        return [segment];
    } catch (e) {
        console.error("Batch processing failed", e);
        return [];
    }
};

/**
 * Legacy Support for fallback
 */
export const composeMeditation = async (): Promise<string> => {
    return "";
};

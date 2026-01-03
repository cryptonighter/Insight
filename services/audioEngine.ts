
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
        const byteCharacters = atob(batchAudioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        let finalBlob: Blob;

        // HANDLE RAW PCM (Gemini 2.5) => WRAP IN WAV HEADER
        if (mimeType.includes('pcm') || mimeType.includes('L16')) {
            console.log("🛠️ Packaging Raw PCM into WAV container...");
            finalBlob = addWavHeader(byteArray, 24000);
        } else {
            // STANDARD MP3/WAV
            finalBlob = new Blob([byteArray], { type: mimeType });
        }

        const blobUrl = URL.createObjectURL(finalBlob);

        const segment: PlayableSegment = {
            id: `batch-${batchIndex}`,
            audioUrl: blobUrl,
            text: "",
            duration: 10,
            instructions: instructions
        };

        return [segment];
    } catch (e) {
        console.error("Batch processing failed", e);
        return [];
    }
};

/**
 * Wraps raw PCM data with a valid WAV header so the browser can decode it.
 */
function addWavHeader(pcmData: Uint8Array, sampleRate: number): Blob {
    const numChannels = 1; // Gemini TTS is usually Mono
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

    // Write PCM data
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
 * Legacy Support for fallback
 */
export const composeMeditation = async (): Promise<string> => {
    return "";
};

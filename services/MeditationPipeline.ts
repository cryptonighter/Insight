
import { generateAudioChunk } from './geminiService';
import { processBatchWithSilenceSplitting } from './audioEngine';
import { VoiceId, PlayableSegment, SonicInstruction } from '../types';

interface Batch {
    text: string;
    instructions?: SonicInstruction[];
}

export class MeditationPipeline {
    private batches: Batch[];
    private voice: VoiceId;
    private onSegmentReady: (segments: PlayableSegment[]) => void;
    private onComplete: () => void;

    private isCancelled = false;
    private processingIndex = 0;

    constructor(
        batches: Batch[],
        voice: VoiceId,
        onSegmentReady: (segments: PlayableSegment[]) => void,
        onComplete: () => void
    ) {
        this.batches = batches;
        this.voice = voice;
        this.onSegmentReady = onSegmentReady;
        this.onComplete = onComplete;
    }

    public async start() {
        console.log("🚀 Pipeline Started: ", this.batches.length, "batches.");
        this.processQueue();
    }

    public stop() {
        this.isCancelled = true;
    }

    private async processQueue() {
        // Serial processing for now to ensure order, but decoupled from finding the text
        // Future: Could make this concurrent (Promise.all) if we handle ordering indices

        for (let i = 0; i < this.batches.length; i++) {
            if (this.isCancelled) break;

            const batch = this.batches[i];
            if (!batch.text) continue;

            try {
                // 1. Generate Audio
                const { audioData, mimeType } = await generateAudioChunk(batch.text, this.voice);

                // 2. Process Audio (Silence Splitting / Decode)
                // This returns an array of PlayableSegments (usually just one, but breaks on silence)
                const segments = await processBatchWithSilenceSplitting(
                    audioData,
                    i,
                    batch.instructions,
                    mimeType
                );

                if (this.isCancelled) break;

                // 3. Emit
                console.log(`✅ Batch ${i} Ready:`, segments.length, "segments");
                this.onSegmentReady(segments);

                // Small delay to prevent rate limit smashing (Free Tier is strict)
                await new Promise(r => setTimeout(r, 2500));

            } catch (error) {
                console.error(`❌ Batch ${i} Failed:`, error);
                // Continue to next batch? Or retry?
                // For now, skip to keep the session alive.
            }
        }

        if (!this.isCancelled) {
            this.onComplete();
        }
    }
}

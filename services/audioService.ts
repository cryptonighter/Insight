/**
 * AudioService - Unified audio management for meditation playback
 * 
 * Manages:
 * - Single AudioContext lifecycle
 * - Segment queue playback with gapless transitions
 * - Multi-layer volume control (voice, soundscape, binaural)
 * - Progress tracking with callbacks
 * - Error recovery
 */

import { PlayableSegment } from '../types';

type AudioLayer = 'voice' | 'soundscape' | 'binaural';

interface AudioServiceState {
    isPlaying: boolean;
    isPaused: boolean;
    currentSegmentIndex: number;
    totalSegments: number;
    progress: number; // 0-100
    currentTime: number; // seconds
    totalDuration: number; // seconds
}

type ProgressCallback = (state: AudioServiceState) => void;
type SegmentChangeCallback = (segmentIndex: number, segment: PlayableSegment) => void;

class AudioServiceClass {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private voiceGain: GainNode | null = null;
    private soundscapeGain: GainNode | null = null;
    private binauralGain: GainNode | null = null;

    // Playback state
    private segments: PlayableSegment[] = [];
    private currentSegmentIndex: number = 0;
    private currentSource: AudioBufferSourceNode | null = null;
    private currentBuffer: AudioBuffer | null = null;
    private segmentStartTime: number = 0;
    private pausedAt: number = 0;
    private isPlaying: boolean = false;
    private isPaused: boolean = false;

    // Duration tracking
    private segmentDurations: number[] = [];
    private totalDuration: number = 0;

    // Callbacks
    private onProgress: ProgressCallback | null = null;
    private onSegmentChange: SegmentChangeCallback | null = null;
    private onComplete: (() => void) | null = null;
    private progressInterval: number | null = null;

    // Volume levels (0-1)
    private volumes: Record<AudioLayer, number> = {
        voice: 0.8,
        soundscape: 0.5,
        binaural: 0.3
    };

    /**
     * Initialize the AudioContext and gain nodes
     * Call this on user interaction to unlock audio on iOS
     */
    async init(): Promise<void> {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            // Already initialized, just ensure it's resumed
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            return;
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass({ sampleRate: 24000 });

        // Create gain node hierarchy
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);

        this.voiceGain = this.audioContext.createGain();
        this.voiceGain.connect(this.masterGain);
        this.voiceGain.gain.value = this.volumes.voice;

        this.soundscapeGain = this.audioContext.createGain();
        this.soundscapeGain.connect(this.masterGain);
        this.soundscapeGain.gain.value = this.volumes.soundscape;

        this.binauralGain = this.audioContext.createGain();
        this.binauralGain.connect(this.masterGain);
        this.binauralGain.gain.value = this.volumes.binaural;

        // Ensure context is running
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        console.log('🔊 AudioService: Initialized with sample rate', this.audioContext.sampleRate);
    }

    /**
     * Load and play a queue of segments
     */
    async playQueue(
        segments: PlayableSegment[],
        callbacks: {
            onProgress?: ProgressCallback;
            onSegmentChange?: SegmentChangeCallback;
            onComplete?: () => void;
        } = {}
    ): Promise<void> {
        if (!this.audioContext) {
            await this.init();
        }

        this.segments = segments;
        this.currentSegmentIndex = 0;
        this.onProgress = callbacks.onProgress || null;
        this.onSegmentChange = callbacks.onSegmentChange || null;
        this.onComplete = callbacks.onComplete || null;
        this.isPlaying = true;
        this.isPaused = false;
        this.pausedAt = 0;

        // Pre-calculate durations for progress tracking
        await this.calculateDurations();

        // Start progress reporting
        this.startProgressTracking();

        // Play first segment
        await this.playSegment(0);
    }

    /**
     * Calculate durations of all segments for accurate progress tracking
     */
    private async calculateDurations(): Promise<void> {
        this.segmentDurations = [];
        this.totalDuration = 0;

        for (const segment of this.segments) {
            try {
                const buffer = await this.fetchAndDecodeSegment(segment);
                const duration = buffer.duration;
                this.segmentDurations.push(duration);
                this.totalDuration += duration;
            } catch (e) {
                console.warn('🔊 AudioService: Failed to calculate duration for segment', e);
                // Fallback: estimate based on segment.duration or default
                const estimatedDuration = segment.duration || 10;
                this.segmentDurations.push(estimatedDuration);
                this.totalDuration += estimatedDuration;
            }
        }

        console.log('🔊 AudioService: Total duration calculated:', this.totalDuration.toFixed(1), 'seconds');
    }

    /**
     * Fetch and decode a segment's audio data
     */
    private async fetchAndDecodeSegment(segment: PlayableSegment): Promise<AudioBuffer> {
        if (!this.audioContext) throw new Error('AudioContext not initialized');

        const response = await fetch(segment.audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    /**
     * Play a specific segment by index
     */
    private async playSegment(index: number): Promise<void> {
        if (!this.audioContext || !this.voiceGain) return;
        if (index >= this.segments.length) {
            this.handleQueueComplete();
            return;
        }

        const segment = this.segments[index];
        this.currentSegmentIndex = index;

        console.log(`🔊 AudioService: Playing segment ${index + 1} of ${this.segments.length}`);

        // Notify segment change
        if (this.onSegmentChange) {
            this.onSegmentChange(index, segment);
        }

        try {
            // Fetch and decode audio
            this.currentBuffer = await this.fetchAndDecodeSegment(segment);

            // Stop any current playback
            if (this.currentSource) {
                this.currentSource.onended = null;
                this.currentSource.stop();
            }

            // Create new source
            this.currentSource = this.audioContext.createBufferSource();
            this.currentSource.buffer = this.currentBuffer;
            this.currentSource.connect(this.voiceGain);

            // Handle segment completion
            this.currentSource.onended = () => {
                if (this.isPlaying && !this.isPaused) {
                    this.playSegment(this.currentSegmentIndex + 1);
                }
            };

            // Start playback
            this.segmentStartTime = this.audioContext.currentTime;
            const offset = this.pausedAt > 0 ? this.pausedAt : 0;
            this.currentSource.start(0, offset);
            this.pausedAt = 0;

        } catch (e) {
            console.error('🔊 AudioService: Error playing segment', index, e);
            // Try next segment
            if (this.isPlaying) {
                this.playSegment(index + 1);
            }
        }
    }

    /**
     * Start progress tracking interval
     */
    private startProgressTracking(): void {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        this.progressInterval = window.setInterval(() => {
            if (!this.isPlaying || this.isPaused) return;

            const state = this.getState();
            if (this.onProgress) {
                this.onProgress(state);
            }
        }, 100); // Update 10x per second for smooth progress
    }

    /**
     * Stop progress tracking
     */
    private stopProgressTracking(): void {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    /**
     * Get current playback state
     */
    getState(): AudioServiceState {
        if (!this.audioContext) {
            return {
                isPlaying: false,
                isPaused: false,
                currentSegmentIndex: 0,
                totalSegments: 0,
                progress: 0,
                currentTime: 0,
                totalDuration: 0
            };
        }

        // Calculate current time within segment
        let segmentElapsed = 0;
        if (this.isPlaying && !this.isPaused && this.currentBuffer) {
            segmentElapsed = this.audioContext.currentTime - this.segmentStartTime;
            segmentElapsed = Math.min(segmentElapsed, this.currentBuffer.duration);
        } else if (this.isPaused) {
            segmentElapsed = this.pausedAt;
        }

        // Calculate total elapsed time
        let totalElapsed = 0;
        for (let i = 0; i < this.currentSegmentIndex; i++) {
            totalElapsed += this.segmentDurations[i] || 0;
        }
        totalElapsed += segmentElapsed;

        const progress = this.totalDuration > 0 ? (totalElapsed / this.totalDuration) * 100 : 0;

        return {
            isPlaying: this.isPlaying,
            isPaused: this.isPaused,
            currentSegmentIndex: this.currentSegmentIndex,
            totalSegments: this.segments.length,
            progress: Math.min(progress, 100),
            currentTime: totalElapsed,
            totalDuration: this.totalDuration
        };
    }

    /**
     * Pause playback
     */
    pause(): void {
        if (!this.isPlaying || this.isPaused || !this.audioContext) return;

        this.isPaused = true;
        this.pausedAt = this.audioContext.currentTime - this.segmentStartTime;

        if (this.currentSource) {
            this.currentSource.onended = null;
            this.currentSource.stop();
            this.currentSource = null;
        }

        console.log('🔊 AudioService: Paused at', this.pausedAt.toFixed(2), 'seconds');
    }

    /**
     * Resume playback
     */
    async resume(): Promise<void> {
        if (!this.isPaused || !this.audioContext) return;

        this.isPaused = false;

        // Ensure context is running
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Resume current segment from paused position
        await this.playSegment(this.currentSegmentIndex);

        console.log('🔊 AudioService: Resumed from', this.pausedAt.toFixed(2), 'seconds');
    }

    /**
     * Stop playback completely
     */
    stop(): void {
        this.isPlaying = false;
        this.isPaused = false;
        this.stopProgressTracking();

        if (this.currentSource) {
            this.currentSource.onended = null;
            this.currentSource.stop();
            this.currentSource = null;
        }

        this.segments = [];
        this.currentSegmentIndex = 0;
        this.pausedAt = 0;

        console.log('🔊 AudioService: Stopped');
    }

    /**
     * Handle queue completion
     */
    private handleQueueComplete(): void {
        this.isPlaying = false;
        this.stopProgressTracking();

        console.log('✅ AudioService: Queue playback complete');

        if (this.onComplete) {
            this.onComplete();
        }
    }

    /**
     * Set volume for a specific layer
     */
    setVolume(layer: AudioLayer, value: number): void {
        const clampedValue = Math.max(0, Math.min(1, value));
        this.volumes[layer] = clampedValue;

        const gainNode = {
            voice: this.voiceGain,
            soundscape: this.soundscapeGain,
            binaural: this.binauralGain
        }[layer];

        if (gainNode) {
            // Smooth transition over 100ms
            gainNode.gain.linearRampToValueAtTime(
                clampedValue,
                (this.audioContext?.currentTime || 0) + 0.1
            );
        }
    }

    /**
     * Get current volume for a layer
     */
    getVolume(layer: AudioLayer): number {
        return this.volumes[layer];
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        this.stop();

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(e => console.warn('AudioContext close error:', e));
        }

        this.audioContext = null;
        this.masterGain = null;
        this.voiceGain = null;
        this.soundscapeGain = null;
        this.binauralGain = null;

        console.log('🔊 AudioService: Cleaned up');
    }

    /**
     * Check if audio is currently playing
     */
    get playing(): boolean {
        return this.isPlaying && !this.isPaused;
    }

    /**
     * Check if audio is paused
     */
    get paused(): boolean {
        return this.isPaused;
    }
}

// Export singleton instance
export const AudioService = new AudioServiceClass();

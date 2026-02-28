
import { useState, useRef, useEffect } from 'react';
import { Meditation, MeditationConfig, Soundscape, ViewState, Resolution, PlayableSegment, MethodologyType } from '../types';
import { generateMeditationScript, generateAudioChunk, wrapPcmToWav, decodeBase64 } from './geminiService';
import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { generateSonicTimeline, SonicTimeline } from './sonicDirector';

// Generation phase tracking for UX feedback
export type GenerationPhase =
    | 'idle'
    | 'greeting'
    | 'script'
    | 'tts'  // includes batch index info via generationProgress
    | 'complete'
    | 'error';

export interface GenerationState {
    phase: GenerationPhase;
    error: string | null;
    /** Current batch being processed (1-indexed) */
    currentBatch: number;
    /** Total batches to process */
    totalBatches: number;
}

const GENERATION_TIMEOUT_MS = 120_000; // 2 minutes global timeout

// Helper to stitch audio blobs into a single valid WAV file
const stitchAudio = async (segments: PlayableSegment[]): Promise<Blob> => {
    const pcmChunks: Uint8Array[] = [];
    let sampleRate = 24000;  // Default
    let numChannels = 1;     // Default mono

    for (const seg of segments) {
        try {
            const resp = await fetch(seg.audioUrl);
            const arrayBuffer = await resp.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            // Check if it's a WAV file
            const header = String.fromCharCode(...bytes.slice(0, 4));
            if (header === 'RIFF' && bytes.length > 44) {
                // Extract sample rate and channels from header
                const view = new DataView(arrayBuffer);
                sampleRate = view.getUint32(24, true);
                numChannels = view.getUint16(22, true);
                // Extract PCM data (skip 44-byte header)
                pcmChunks.push(bytes.slice(44));
            } else {
                // Assume raw PCM
                pcmChunks.push(bytes);
            }
        } catch (e) { console.error("Segment fetch failed", e); }
    }

    // Calculate total PCM length
    const totalPcmLength = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);

    // Create combined buffer with WAV header
    const wavBuffer = new ArrayBuffer(44 + totalPcmLength);
    const view = new DataView(wavBuffer);
    const output = new Uint8Array(wavBuffer);

    // Write WAV header
    const setUint32 = (pos: number, val: number) => view.setUint32(pos, val, true);
    const setUint16 = (pos: number, val: number) => view.setUint16(pos, val, true);

    // "RIFF" chunk
    output.set([0x52, 0x49, 0x46, 0x46], 0);        // "RIFF"
    setUint32(4, 36 + totalPcmLength);              // file size - 8
    output.set([0x57, 0x41, 0x56, 0x45], 8);        // "WAVE"
    // "fmt " subchunk
    output.set([0x66, 0x6d, 0x74, 0x20], 12);       // "fmt "
    setUint32(16, 16);                              // subchunk1 size
    setUint16(20, 1);                               // audio format (PCM)
    setUint16(22, numChannels);                     // num channels
    setUint32(24, sampleRate);                      // sample rate
    setUint32(28, sampleRate * numChannels * 2);   // byte rate
    setUint16(32, numChannels * 2);                 // block align
    setUint16(34, 16);                              // bits per sample
    // "data" subchunk
    output.set([0x64, 0x61, 0x74, 0x61], 36);       // "data"
    setUint32(40, totalPcmLength);                  // data size

    // Write PCM data
    let offset = 44;
    for (const chunk of pcmChunks) {
        output.set(chunk, offset);
        offset += chunk.length;
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
};

/**
 * Creates an audio Blob from base64 data, respecting the mimeType.
 * Uses centralized wrapPcmToWav for raw PCM data.
 */
const createAudioBlob = (audioBase64: string, mimeType?: string): Blob => {
    const bytes = decodeBase64(audioBase64);
    const len = bytes.length;

    console.log('🔊 createAudioBlob - mimeType:', mimeType, 'length:', len);

    // Check for audio file signatures to detect actual format
    const binaryCheck = String.fromCharCode(...bytes.slice(0, 12));
    const hasWavHeader = len > 12 && binaryCheck.slice(0, 4) === 'RIFF' && binaryCheck.slice(8, 12) === 'WAVE';
    const hasMp3Header = len > 3 && (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) || // Frame sync
        (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33); // ID3 tag

    console.log('🔊 Format detection - hasWavHeader:', hasWavHeader, 'hasMp3Header:', hasMp3Header);

    // If already has WAV or MP3 header, return as-is
    if (hasWavHeader) {
        console.log('🔊 Audio already has WAV header, passing through');
        return new Blob([bytes.slice().buffer], { type: 'audio/wav' });
    }
    if (hasMp3Header) {
        console.log('🔊 Audio already has MP3 header, passing through');
        return new Blob([bytes.slice().buffer], { type: 'audio/mp3' });
    }

    // If mimeType indicates pre-encoded audio, pass through
    if (mimeType && (mimeType.includes('mp3') || mimeType.includes('mpeg') || mimeType.includes('wav'))) {
        console.log('🔊 MimeType indicates encoded audio:', mimeType);
        return new Blob([bytes.slice().buffer], { type: mimeType });
    }

    // Raw PCM data (L16 or no mimeType) - use centralized wrapPcmToWav
    console.log('🔊 Raw PCM detected, wrapping with WAV header (24kHz)');
    return wrapPcmToWav(bytes, 24000, 1);
};


export const useMeditationGenerator = (
    soundscapes: Soundscape[],
    activeResolution: Resolution | null,
    setView: (view: ViewState) => void,
    userId?: string
) => {
    const [meditations, setMeditations] = useState<Meditation[]>([]);
    const [activeMeditationId, setActiveMeditationId] = useState<string | null>(null);
    const [pendingMeditationConfig, setPendingMeditationConfig] = useState<Partial<MeditationConfig> | null>(null);

    // Generation state tracking for UX
    const [generationState, setGenerationState] = useState<GenerationState>({
        phase: 'idle',
        error: null,
        currentBatch: 0,
        totalBatches: 0
    });

    // Ref for cancellation
    const cancelledRef = useRef(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancelledRef.current = true;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const finalizeMeditationGeneration = async (configArg?: MeditationConfig) => {
        // Use provided config or fall back to pendingMeditationConfig
        const config = configArg || pendingMeditationConfig as MeditationConfig;

        // Defensive: Ensure config is valid
        if (!config || !config.soundscapeId) {
            console.error('❌ finalizeMeditationGeneration called with invalid config:', config);
            setGenerationState({ phase: 'error', error: 'Invalid session configuration. Please go back and try again.', currentBatch: 0, totalBatches: 0 });
            throw new Error('Invalid meditation config: missing required fields (soundscapeId)');
        }

        // Reset state
        cancelledRef.current = false;
        setGenerationState({ phase: 'greeting', error: null, currentBatch: 0, totalBatches: 0 });

        // Global timeout to prevent infinite hangs
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (generationState.phase !== 'complete' && generationState.phase !== 'error') {
                console.error('⏰ Generation timed out after 2 minutes');
                cancelledRef.current = true;
                setGenerationState(prev => ({ ...prev, phase: 'error', error: 'Generation timed out. Please try again.' }));
            }
        }, GENERATION_TIMEOUT_MS);

        const tempId = crypto.randomUUID();
        try {
            // 1. Base Context
            const contextTexts = [
                `Goal: ${activeResolution?.statement}`,
                `Why: ${activeResolution?.rootMotivation}`
            ];

            // 2. Fetch User Session History for Personalization
            if (userId) {
                try {
                    const { fetchSessionHistory, generatePersonalizationContext } = await import('./userHistoryService');
                    const history = await fetchSessionHistory(userId);

                    if (history.totalSessions > 0) {
                        const personalizationContext = generatePersonalizationContext(history);
                        contextTexts.push("### USER HISTORY ###");
                        contextTexts.push(personalizationContext);
                        contextTexts.push("### END HISTORY ###");
                        console.log('📊 Personalization context injected:', history.totalSessions, 'sessions analyzed');
                    }
                } catch (err) {
                    console.warn("Failed to fetch user history", err);
                }
            }

            // 3. Fetch Recent Reflections (Context Injection)
            if (userId) {
                try {
                    const { data: recentEntries } = await supabase
                        .from('daily_entries')
                        .select('date, reflection_summary')
                        .eq('user_id', userId)
                        .not('reflection_summary', 'is', null)
                        .order('date', { ascending: false })
                        .limit(3);

                    if (recentEntries && recentEntries.length > 0) {
                        console.log("🧠 Context Injection: Found", recentEntries.length, "entries");
                        contextTexts.push("### RECENT MEMORIES & PROGRESS ###");
                        recentEntries.forEach(entry => {
                            contextTexts.push(`[${entry.date}] User Reflection: ${entry.reflection_summary}`);
                        });
                        contextTexts.push("### END MEMORIES ###");
                    }
                } catch (err) {
                    console.warn("Failed to fetch context", err);
                }
            }

            console.log("🎵 Soundscape Selection Debug:", {
                requestedId: config.soundscapeId,
                availableCount: soundscapes.length,
                availableIds: soundscapes.map(s => s.id)
            });
            let selectedSoundscape = soundscapes.find(s => s.id === config.soundscapeId) || soundscapes[0];

            const newMeditation: Meditation = {
                id: tempId,
                title: "Morning Alignment",
                transcript: "",
                lines: [],
                audioQueue: [],
                isGenerating: true,
                durationMinutes: config.duration,
                createdAt: Date.now(),
                played: false,
                soundscapeId: selectedSoundscape.id,
                backgroundType: 'deep-space',
                config: config
            };

            setMeditations(prev => [newMeditation, ...prev]);
            setActiveMeditationId(tempId);
            setView(ViewState.LOADING);

            // ===== STREAMING ARCHITECTURE: FAST START =====
            // 1. Generate greeting immediately (short, fast)
            // 2. Start TTS on greeting while script generates in parallel
            // 3. Push greeting to queue and switch to player
            // 4. Continue generating remaining content in background

            console.log('⚡ Fast Start: Generating greeting...');

            // Determine context hint for personalized greeting
            const hour = new Date().getHours();
            const timeContext = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

            // Import dynamically to avoid circular dependency
            const { generateFastGreeting, generateAudioChunk } = await import('./geminiService');

            // PARALLEL EXECUTION: Greeting + Full Script
            const greetingPromise = generateFastGreeting(
                config.focus,
                config.feeling,
                config.methodology,
                timeContext
            ).then(async (greeting) => {
                // Immediately generate TTS for greeting
                console.log('⚡ Fast Start: Generating greeting audio...');
                try {
                    const { audioData, mimeType } = await generateAudioChunk(greeting.text, config.voice, {
                        chunkIndex: 0,
                        totalChunks: 3, // Estimated
                        previousChunkEnd: undefined
                    });
                    console.log('⚡ Greeting audio generated, length:', audioData?.length || 0, 'mimeType:', mimeType);
                    return { text: greeting.text, audioData, mimeType };
                } catch (ttsError) {
                    console.error('⚠️ Greeting TTS failed:', ttsError);
                    throw ttsError; // Re-throw to be caught by main handler
                }
            });

            const scriptPromise = generateMeditationScript(
                config.focus,
                config.feeling,
                config.duration,
                selectedSoundscape.metadata.description,
                config.voice,
                contextTexts,
                config.methodology,
                config.variables
            );

            // Wait for greeting (fast) - this completes in ~3-4s
            let greetingResult;
            try {
                greetingResult = await greetingPromise;
            } catch (greetingError) {
                console.error('❌ Fast greeting failed, proceeding without:', greetingError);
                // Skip greeting, wait for script and proceed with batches only
                greetingResult = null;
            }

            // Only create greeting segment if we have valid audio
            if (greetingResult && greetingResult.audioData) {
                // Create greeting audio blob with correct mimeType
                const greetingBlob = createAudioBlob(greetingResult.audioData, greetingResult.mimeType);
                const greetingUrl = URL.createObjectURL(greetingBlob);

                // Push greeting to queue IMMEDIATELY - user can start listening
                const greetingSegment: PlayableSegment = {
                    id: 'greeting',
                    text: greetingResult.text,
                    audioUrl: greetingUrl,
                    // Duration 0 = let AudioService calculate real duration from decoded audio
                    // This handles different sample rates (24kHz Gemini vs 44.1kHz Resemble)
                    duration: 0,
                    instructions: [] // Greeting has no special sonic instructions
                };

                // Update meditation with greeting - PLAYER CAN START NOW
                setMeditations(current => current.map(m => {
                    if (m.id === tempId) return {
                        ...m,
                        audioQueue: [greetingSegment],
                        isGenerating: true // Still generating remaining batches
                    };
                    return m;
                }));

                console.log('⚡ Fast Start: Greeting ready! Player can begin.');
            } else {
                console.log('⚠️ No greeting audio, player will wait for first batch');
            }

            // Now wait for full script
            setGenerationState(prev => ({ ...prev, phase: 'script' }));
            let { title, lines, batches } = await scriptPromise;

            // ===== BATCH SPLITTING FALLBACK =====
            // If AI returned too few batches, split them manually for better streaming
            const expectedBatches = Math.max(2, Math.round(config.duration));
            if (batches.length < expectedBatches && batches.length > 0) {
                console.log(`⚠️ AI returned ${batches.length} batches, expected ${expectedBatches}. Auto-splitting...`);
                const allText = batches.map(b => b.text).join(' ');
                const targetChunkSize = 500; // ~30 seconds of speech
                const splitBatches: { text: string }[] = [];

                // Split into chunks of roughly 500 chars at sentence boundaries
                let remaining = allText;
                while (remaining.length > 0) {
                    if (remaining.length <= targetChunkSize) {
                        splitBatches.push({ text: remaining.trim() });
                        break;
                    }
                    // Find a good split point (sentence end) around the target size
                    let splitPoint = remaining.slice(0, targetChunkSize + 100).lastIndexOf('. ');
                    if (splitPoint < 200) splitPoint = targetChunkSize; // Fallback if no sentence found
                    splitBatches.push({ text: remaining.slice(0, splitPoint + 1).trim() });
                    remaining = remaining.slice(splitPoint + 1).trim();
                }
                batches = splitBatches;
                console.log(`✅ Split into ${batches.length} batches`);
            }

            // Update title/transcript
            setMeditations(current => current.map(m => {
                if (m.id === tempId) return { ...m, title, transcript: lines.join('\n'), lines };
                return m;
            }));

            // --- SONIC DIRECTOR: Generate Timeline ---
            const sonicTimeline = generateSonicTimeline({
                protocol: (config.methodology || 'GENERAL') as MethodologyType,
                segmentCount: batches.length + 1, // +1 for greeting
                totalDurationMs: config.duration * 60 * 1000
            });
            console.log('🎵 Sonic Timeline Generated:', sonicTimeline.metadata);

            // --- REMAINING BATCH GENERATION (STREAMING) ---
            console.log(`🎤 Processing ${batches.length} remaining batches (streaming)...`);
            setGenerationState(prev => ({ ...prev, phase: 'tts', currentBatch: 1, totalBatches: batches.length }));

            // Process sequentially to maintain order and avoid rate limits
            for (let i = 0; i < batches.length; i++) {
                if (cancelledRef.current) break;
                const batch = batches[i];
                console.log(`🎤 Generating Batch ${i + 1}/${batches.length} (${batch.text.length} chars)...`);

                try {
                    // Pass context for voice consistency between chunks
                    const previousBatch = i > 0 ? batches[i - 1] : null;
                    const previousChunkEnd = previousBatch ? previousBatch.text.slice(-100) : greetingResult?.text?.slice(-100);

                    const { audioData, mimeType } = await generateAudioChunk(batch.text, config.voice, {
                        chunkIndex: i + 1, // +1 because greeting is index 0
                        totalChunks: batches.length + 1,
                        previousChunkEnd
                    });

                    // Use createAudioBlob which handles mimeType correctly
                    const blob = createAudioBlob(audioData, mimeType);
                    const url = URL.createObjectURL(blob);

                    const newSegment: PlayableSegment = {
                        id: `batch-${i}`,
                        text: batch.text,
                        audioUrl: url,
                        // Duration 0 = let AudioService calculate real duration from decoded audio
                        // This handles different sample rates (24kHz Gemini vs 44.1kHz Resemble)
                        duration: 0,
                        instructions: sonicTimeline.segmentInstructions[i + 1] || [] // +1 for greeting offset
                    };

                    // STREAM: Append this segment to queue immediately
                    setMeditations(current => current.map(m => {
                        if (m.id === tempId) {
                            return {
                                ...m,
                                audioQueue: [...m.audioQueue, newSegment],
                                isGenerating: i < batches.length - 1 // Still generating if not last batch
                            };
                        }
                        return m;
                    }));

                    console.log(`✅ Batch ${i + 1} streamed to queue`);
                    setGenerationState(prev => ({ ...prev, currentBatch: i + 2 })); // +2 because 1-indexed and moves to next

                } catch (batchErr) {
                    console.error(`❌ Batch ${i} failed:`, batchErr);
                    // Continue to next batch
                }
            }

            // Mark generation complete
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setGenerationState({ phase: 'complete', error: null, currentBatch: batches.length, totalBatches: batches.length });
            setMeditations(current => current.map(m => {
                if (m.id === tempId) {
                    return { ...m, isGenerating: false };
                }
                return m;
            }));

            // Calculate Approximate Total Duration (get from current meditation state)
            setMeditations(current => {
                const meditation = current.find(m => m.id === tempId);
                if (meditation) {
                    const totalDuration = meditation.audioQueue.reduce((acc, curr) => acc + curr.duration, 0);
                    console.log(`✅ Generation Complete. Total Audio: ${totalDuration.toFixed(1)}s`);
                }
                return current;
            });

            setPendingMeditationConfig(null);

            // 2. Upload Audio (Background) - Upload first chunk OR stitch?
            // For now, we only upload the *First* chunk as a preview, or we'd need to stitch them.
            // Stitching is expensive in JS. Let's upload the first chunk for the record.



            // 3. PERSISTENCE (Product Grade)
            if (userId) {
                try {
                    // A. Create Session Log
                    const { data: logData, error: logError } = await supabase
                        .from('session_logs')
                        .insert({
                            user_id: userId,
                            modality: config.methodology || 'MORNING_ALIGNMENT',
                            focus: config.focus,
                            feeling: config.feeling,
                            transcript: lines.join('\n'),
                            feedback: { config } // Store full config in JSONB
                        })
                        .select()
                        .single();

                    if (logData && !logError) {
                        // B. Link to Daily Entry
                        const today = new Date().toISOString().split('T')[0];
                        if (activeResolution) {
                            await supabase.from('daily_entries')
                                .update({
                                    morning_generated: true,
                                    morning_meditation_id: logData.id
                                })
                                .eq('user_id', userId)
                                .eq('date', today)
                                .eq('resolution_id', activeResolution.id || 'unknown');
                        }
                        console.log("✅ Session Persisted:", logData.id);

                        // 4. UPLOAD STITCHED AUDIO (Background) - Get current queue from state
                        setMeditations(current => {
                            const meditation = current.find(m => m.id === tempId);
                            if (meditation && meditation.audioQueue.length > 0) {
                                stitchAudio(meditation.audioQueue).then(blob => {
                                    console.log("☁️ Uploading stitched global audio...");
                                    storageService.uploadSessionAudio(userId, config.soundscapeId || 'default', blob).then(publicUrl => {
                                        if (publicUrl) {
                                            supabase.from('session_logs')
                                                .update({ audio_url: publicUrl })
                                                .eq('id', logData.id);
                                            console.log("✅ Audio successfully linked to session:", publicUrl);
                                        }
                                    });
                                });
                            }
                            return current;
                        });

                        // SAVE REAL ID TO STATE
                        setMeditations(current => current.map(m => {
                            if (m.id === tempId) return { ...m, supabaseId: logData.id };
                            return m;
                        }));
                    } else {
                        console.error("Failed to save session log", logError);
                    }
                } catch (persistErr) {
                    console.error("Persistence Error", persistErr);
                }
            }

        } catch (e: any) {
            console.error("Failed to generate meditation", e);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            const errorMessage = e?.message?.includes('429')
                ? 'Rate limited by the AI service. Please wait a moment and try again.'
                : e?.message?.includes('timeout') || e?.message?.includes('abort')
                    ? 'Generation timed out. Please try again.'
                    : e?.message?.includes('API Error')
                        ? 'AI service error. Please check your connection and try again.'
                        : 'Generation failed. Please try again.';
            setGenerationState({ phase: 'error', error: errorMessage, currentBatch: 0, totalBatches: 0 });
            setMeditations(prev => prev.filter(m => m.id !== tempId));
            // Don't navigate away - let the user see the error and retry from LoadingGeneration
        }
    };

    const playMeditation = (id: string) => {
        setActiveMeditationId(id);
        setView(ViewState.PLAYER);
    };

    return {
        meditations,
        activeMeditationId,
        pendingMeditationConfig,
        setPendingMeditationConfig, // EXPORTED
        finalizeMeditationGeneration,
        playMeditation,
        setMeditations,
        generationState // NEW: exposed for LoadingGeneration UX
    };
};


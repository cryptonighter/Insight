
import { useState, useRef, useEffect } from 'react';
import { Meditation, MeditationConfig, Soundscape, ViewState, Resolution, PlayableSegment, MethodologyType } from '../types';
import { generateMeditationScript, generateAudioChunk } from './geminiService';
import { MeditationPipeline } from './MeditationPipeline';
import { supabase } from './supabaseClient';
import { storageService } from './storageService';
import { generateSonicTimeline, SonicTimeline } from './sonicDirector';

// Helper to stitch audio blobs
const stitchAudio = async (segments: PlayableSegment[]): Promise<Blob> => {
    const buffers = [];
    for (const seg of segments) {
        try {
            const resp = await fetch(seg.audioUrl);
            const blob = await resp.blob();
            buffers.push(blob);
        } catch (e) { console.error("Segment fetch failed", e); }
    }
    return new Blob(buffers, { type: 'audio/wav' });
};

// Helper to create audio blob from base64
const createAudioBlob = (audioBase64: string): Blob => {
    const binary = atob(audioBase64);
    const len = binary.length;
    const buffer = new ArrayBuffer(44 + len);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };

    // WAV Header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + len, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 24000, true);
    view.setUint32(28, 24000 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, len, true);

    const pcmBytes = new Uint8Array(buffer, 44);
    for (let k = 0; k < len; k++) pcmBytes[k] = binary.charCodeAt(k);

    return new Blob([buffer], { type: 'audio/wav' });
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

    // Ref to hold the pipeline so we can stop it if unmounted
    const pipelineRef = useRef<MeditationPipeline | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pipelineRef.current) {
                console.log("🧹 Unmounting: Stopping Pipeline");
                pipelineRef.current.stop();
            }
        };
    }, []);

    const finalizeMeditationGeneration = async (config: MeditationConfig) => {
        // Prevent double submissions or cancel previous
        if (pipelineRef.current) {
            console.log("🛑 Stopping previous pipeline...");
            pipelineRef.current.stop();
            pipelineRef.current = null;
        }

        const tempId = Date.now().toString();
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
                const { audioData } = await generateAudioChunk(greeting.text, config.voice, {
                    chunkIndex: 0,
                    totalChunks: 3, // Estimated
                    previousChunkEnd: undefined
                });
                return { text: greeting.text, audioData };
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
            const greetingResult = await greetingPromise;

            // Create greeting audio blob
            const greetingBlob = await createAudioBlob(greetingResult.audioData);
            const greetingUrl = URL.createObjectURL(greetingBlob);

            // Push greeting to queue IMMEDIATELY - user can start listening
            const greetingSegment: PlayableSegment = {
                id: 'greeting',
                text: greetingResult.text,
                audioUrl: greetingUrl,
                duration: greetingResult.audioData.length / 48000, // Estimate
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

            // Now wait for full script
            const { title, lines, batches } = await scriptPromise;

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

            // Process sequentially to maintain order and avoid rate limits
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`🎤 Generating Batch ${i + 1}/${batches.length} (${batch.text.length} chars)...`);

                try {
                    // Pass context for voice consistency between chunks
                    const previousBatch = i > 0 ? batches[i - 1] : null;
                    const previousChunkEnd = previousBatch ? previousBatch.text.slice(-100) : greetingResult.text.slice(-100);

                    const { audioData } = await generateAudioChunk(batch.text, config.voice, {
                        chunkIndex: i + 1, // +1 because greeting is index 0
                        totalChunks: batches.length + 1,
                        previousChunkEnd
                    });

                    // Convert Base64 directly to Blob URL
                    const binary = atob(audioData);
                    const len = binary.length;
                    const buffer = new ArrayBuffer(44 + len);
                    const view = new DataView(buffer);

                    // Re-use simple WAV header logic for each chunk
                    const writeString = (view: DataView, offset: number, string: string) => {
                        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
                    };

                    // WAV Header
                    writeString(view, 0, 'RIFF');
                    view.setUint32(4, 36 + len, true);
                    writeString(view, 8, 'WAVE');
                    writeString(view, 12, 'fmt ');
                    view.setUint32(16, 16, true);
                    view.setUint16(20, 1, true);
                    view.setUint16(22, 1, true);
                    view.setUint32(24, 24000, true);
                    view.setUint32(28, 24000 * 2, true);
                    view.setUint16(32, 2, true);
                    view.setUint16(34, 16, true);
                    writeString(view, 36, 'data');
                    view.setUint32(40, len, true);

                    const pcmBytes = new Uint8Array(buffer, 44);
                    for (let k = 0; k < len; k++) pcmBytes[k] = binary.charCodeAt(k);

                    const blob = new Blob([buffer], { type: 'audio/wav' });
                    const url = URL.createObjectURL(blob);

                    const newSegment: PlayableSegment = {
                        id: `batch-${i}`,
                        text: batch.text,
                        audioUrl: url,
                        duration: len / 48000,
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

                } catch (batchErr) {
                    console.error(`❌ Batch ${i} failed:`, batchErr);
                    // Continue to next batch
                }
            }

            // Mark generation complete
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

        } catch (e) {
            console.error("Failed to generate meditation", e);
            alert("Generation failed.");
            setMeditations(prev => prev.filter(m => m.id !== tempId));
            setView(ViewState.DASHBOARD);
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
        setMeditations
    };
};


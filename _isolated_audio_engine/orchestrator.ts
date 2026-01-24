
import { useState, useRef, useEffect } from 'react';
import { Meditation, MeditationConfig, Soundscape, ViewState, Resolution, PlayableSegment } from '../types';
import { generateMeditationScript, generateAudioChunk } from './geminiService';
import { MeditationPipeline } from './MeditationPipeline';
import { supabase } from './supabaseClient';
import { storageService } from './storageService';

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

            // 2. Fetch Recent Reflections (Context Injection - Copied from previous step)
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

            // A. Generate Script (Text)
            const { title, lines, batches } = await generateMeditationScript(
                config.focus,
                config.feeling,
                config.duration,
                selectedSoundscape.metadata.description,
                config.voice,
                contextTexts,
                config.methodology,
                config.variables
            );

            // Update title/transcript immediately
            setMeditations(current => current.map(m => {
                if (m.id === tempId) return { ...m, title, transcript: lines.join('\n'), lines };
                return m;
            }));

            // --- BATCH GENERATION (Prevents Truncation) ---
            console.log(`🎤 Processing ${batches.length} batches to prevent audio truncation...`);

            const newAudioQueue: PlayableSegment[] = [];

            // Process sequentially to maintain order and avoid rate limits
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`🎤 Generating Batch ${i + 1}/${batches.length} (${batch.text.length} chars)...`);

                try {
                    const { audioData } = await generateAudioChunk(batch.text, config.voice);

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

                    newAudioQueue.push({
                        id: `batch-${i}`,
                        text: batch.text,
                        audioUrl: url,
                        // Estimate duration from bytes (24kHz * 2 bytes/sample = 48000 bytes/sec)
                        duration: len / 48000
                    });

                } catch (batchErr) {
                    console.error(`❌ Batch ${i} failed:`, batchErr);
                    // Continue to next batch? or stop? 
                    // For now, we skip.
                }
            }

            if (newAudioQueue.length === 0) {
                throw new Error("No audio generated from batches.");
            }

            // Update State with Full Queue
            setMeditations(current => current.map(m => {
                if (m.id === tempId) {
                    return {
                        ...m,
                        audioQueue: newAudioQueue,
                        isGenerating: false
                    };
                }
                return m;
            }));

            // Calculate Approximate Total Duration
            const totalDuration = newAudioQueue.reduce((acc, curr) => acc + curr.duration, 0);
            console.log(`✅ Generation Complete. Total Audio: ${totalDuration.toFixed(1)}s`);

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
                            modality: 'MORNING_ALIGNMENT',
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
                        console.log("✅ Morning Session Persisted:", logData.id);

                        // 4. UPLOAD STITCHED AUDIO (Background)
                        if (newAudioQueue.length > 0) {
                            stitchAudio(newAudioQueue).then(blob => {
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


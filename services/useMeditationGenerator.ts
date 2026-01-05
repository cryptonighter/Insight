
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

            let selectedSoundscape = soundscapes[0];

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

            // --- ATOMIC GENERATION (High Consistency) ---
            const fullText = batches.map((b: any) => b.text).join('\n\n');
            console.log("🎤 Generating Atomic Audio (" + fullText.length + " chars)...");

            try {
                const { audioData, mimeType } = await generateAudioChunk(fullText, config.voice);

                const writeString = (view: DataView, offset: number, string: string) => {
                    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
                };

                const binary = atob(audioData);
                const len = binary.length;
                const buffer = new ArrayBuffer(44 + len);
                const view = new DataView(buffer);

                // WAV Header for 24kHz Mono 16-bit PCM
                writeString(view, 0, 'RIFF');
                view.setUint32(4, 36 + len, true);
                writeString(view, 8, 'WAVE');
                writeString(view, 12, 'fmt ');
                view.setUint32(16, 16, true); // Subchunk1Size
                view.setUint16(20, 1, true); // AudioFormat (PCM)
                view.setUint16(22, 1, true); // NumChannels (Mono)
                view.setUint32(24, 24000, true); // SampleRate (24kHz for Gemini 2.5)
                view.setUint32(28, 24000 * 2, true); // ByteRate
                view.setUint16(32, 2, true); // BlockAlign
                view.setUint16(34, 16, true); // BitsPerSample
                writeString(view, 36, 'data');
                view.setUint32(40, len, true);

                // Write PCM Data
                const pcmBytes = new Uint8Array(buffer, 44);
                for (let i = 0; i < len; i++) {
                    pcmBytes[i] = binary.charCodeAt(i);
                }

                const blob = new Blob([buffer], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);

                // Update Queue with Single Atomic Chunk
                setMeditations(current => current.map(m => {
                    if (m.id === tempId) {
                        return {
                            ...m,
                            audioQueue: [{ id: 'atomic-1', text: fullText, audioUrl: url, duration: config.duration * 60 }],
                            isGenerating: false
                        };
                    }
                    return m;
                }));

                setPendingMeditationConfig(null);

                // 2. Upload Audio (Background)
                if (userId) {
                    setMeditations(current => {
                        const target = current.find(m => m.id === tempId);
                        if (target && target.supabaseId) {
                            (async () => {
                                try {
                                    console.log("☁️ Uploading session audio...");
                                    const publicUrl = await storageService.uploadSessionAudio(userId, target.supabaseId!, blob);

                                    if (publicUrl) {
                                        await supabase.from('session_logs')
                                            .update({ audio_url: publicUrl })
                                            .eq('id', target.supabaseId);
                                        console.log("✅ Audio persisted to DB:", publicUrl);
                                    }
                                } catch (err) {
                                    console.error("Audio persist failed", err);
                                }
                            })();
                        }
                        return current;
                    });
                }
            } catch (e) { /*...*/ }


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


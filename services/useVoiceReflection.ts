import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';
import { supabase } from '../services/supabaseClient';

const HOST = "generativelanguage.googleapis.com";
const MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025";

export const useVoiceReflection = () => {
    const { setView, completeEveningReflection, activeResolution, user, meditations } = useApp();
    const [currentQuestion, setCurrentQuestion] = useState("");

    const [isConnected, setIsConnected] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [isWrappingUp, setIsWrappingUp] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const summaryAccumulator = useRef<string>("");
    const transcriptAccumulator = useRef<string>("");

    const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => console.error("AudioContext close error:", e));
        }
        if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
        setIsConnected(false);
        setIsWrappingUp(false);
        summaryAccumulator.current = "";
    }, []);

    const fetchContext = async () => {
        if (!activeResolution || !user.supabaseId) return "";
        try {
            const embedding = await generateEmbedding(activeResolution.statement);
            const [explicit, contextual, recent] = await Promise.all([
                supabase.from('memories').select('content').eq('user_id', user.supabaseId).eq('type', 'explicit'),
                embedding ? supabase.rpc('match_memories', {
                    query_embedding: embedding,
                    match_threshold: 0.70,
                    match_count: 5
                }) : { data: [] },
                supabase.from('daily_entries')
                    .select('date, reflection_summary')
                    .eq('user_id', user.supabaseId)
                    .neq('reflection_summary', null)
                    .order('date', { ascending: false })
                    .limit(3)
            ]);

            const mandates = explicit.data?.map(m => `- [MANDATE]: ${m.content}`).join('\n') || "None";
            const context = contextual.data?.map((m: any) => `- [CONTEXT]: ${m.content}`).join('\n') || "None";
            const narrative = recent.data?.map(e => `[${e.date}]: ${e.reflection_summary}`).join('\n') || "None";

            return `
            1. MANDATES (Do not violate):
            ${mandates}
            2. RECENT NARRATIVE (Continuity):
            ${narrative}
            3. RELEVANT CONTEXT (For this goal):
            ${context}
            `;
        } catch (e) {
            console.error("📭 Memory Fetch Failed:", e);
            return "No memory context available.";
        }
    };

    const generateEmbedding = async (text: string) => {
        try {
            const resp = await fetch(`https://${HOST}/v1beta/models/text-embedding-004:embedContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "models/text-embedding-004",
                    content: { parts: [{ text }] }
                })
            });
            const json = await resp.json();
            return json.embedding.values;
        } catch (e) {
            console.error("Embedding Failed", e);
            return null;
        }
    };

    const setupAudioProcessing = async (stream: MediaStream, ctx: AudioContext, ws: WebSocket) => {
        try {
            await ctx.audioWorklet.addModule("data:text/javascript," + encodeURIComponent(`
            class RecorderProcessor extends AudioWorkletProcessor {
                process(inputs) {
                    const input = inputs[0];
                    if (input.length > 0) {
                        const float32 = input[0];
                        this.port.postMessage(float32);
                    }
                    return true;
                }
            }
            registerProcessor("recorder-processor", RecorderProcessor);
        `));
            const source = ctx.createMediaStreamSource(stream);
            const processor = new AudioWorkletNode(ctx, "recorder-processor");
            processor.port.onmessage = (e) => {
                if (ws.readyState === WebSocket.OPEN && !isWrappingUp) {
                    const float32 = e.data;
                    const int16 = new Int16Array(float32.length);
                    for (let i = 0; i < float32.length; i++) {
                        int16[i] = Math.max(-1, Math.min(1, float32[i])) * 0x7FFF;
                    }
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
                    ws.send(JSON.stringify({
                        realtimeInput: {
                            mediaChunks: [{ mimeType: "audio/pcm", data: base64 }]
                        }
                    }));
                }
            };
            source.connect(processor);
            workletNodeRef.current = processor;
        } catch (e: any) {
            console.error("Worklet error", e);
        }
    };

    const playPcmChunk = (base64: string, ctx: AudioContext) => {
        try {
            const binary = atob(base64);
            const len = binary.length;
            const int16 = new Int16Array(len / 2);
            const view = new DataView(new Uint8Array(new Uint8Array(len).map((_, i) => binary.charCodeAt(i))).buffer);
            for (let i = 0; i < len / 2; i++) int16[i] = view.getInt16(i * 2, true);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
            const buffer = ctx.createBuffer(1, float32.length, 24000);
            buffer.getChannelData(0).set(float32);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            const now = ctx.currentTime;
            const scheduledTime = Math.max(now, nextStartTimeRef.current);
            source.start(scheduledTime);
            nextStartTimeRef.current = scheduledTime + buffer.duration;
        } catch (e) { console.error("Playback error", e); }
    };

    const connect = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            mediaStreamRef.current = stream;
            const audioCtx = new AudioContext({ sampleRate: 24000 });
            audioContextRef.current = audioCtx;
            nextStartTimeRef.current = audioCtx.currentTime;
            await audioCtx.resume();

            const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onerror = (e) => {
                console.error("🚨 WebSocket Error:", e);
                setIsConnected(false);
            };



            ws.onopen = async () => {
                setIsConnected(true);
                const memoryContext = await fetchContext();

                // INJECT MORNING CONTEXT (Persistent / Product Grade)
                let morningContext = "4. MORNING SESSION CONTEXT:\n   No session data found for this morning.";

                if (user.supabaseId && activeResolution) {
                    try {
                        const today = new Date().toISOString().split('T')[0];
                        const { data: entry } = await supabase
                            .from('daily_entries')
                            .select('morning_meditation_id')
                            .eq('user_id', user.supabaseId)
                            .eq('date', today)
                            .eq('resolution_id', activeResolution.id) // Use local activeRes ID
                            .maybeSingle();

                        if (entry?.morning_meditation_id) {
                            const { data: log } = await supabase
                                .from('session_logs')
                                .select('focus, feeling, transcript')
                                .eq('id', entry.morning_meditation_id)
                                .single();

                            if (log) {
                                morningContext = `4. MORNING SESSION CONTEXT:\n   User practiced a Morning Alignment session.\n   Focus: "${log.focus}" (Feeling: ${log.feeling})\n   Transcript Excerpt: "${log.transcript?.substring(0, 400)}..."`;
                                console.log("✅ Encoded Morning Context from DB");
                            }
                        }
                    } catch (err) {
                        console.warn("Failed to fetch persistent morning context", err);
                    }
                }

                const systemPrompt = `
                You are a wise, collaborative, and mature executive partner. 
                User's Goal: "${activeResolution?.statement}". 
                Motivation: "${activeResolution?.rootMotivation}".
                BRAIN (LONG-TERM MEMORY):
                ${memoryContext}
                ${morningContext}
                YOUR ROLE:
                - Acknowledge the active goal with a brief, insightful observation.
                - Start with a specific, curious question about how a concrete action they took today felt in relation to their larger goal.
                `;

                const setupFrame = {
                    setup: {
                        model: MODEL,
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } }
                        },
                        systemInstruction: { parts: [{ text: systemPrompt }] }
                    }
                };
                ws.send(JSON.stringify(setupFrame));

                setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        const kickstartText = "I'm ready for the debrief. Let's start.";
                        transcriptAccumulator.current += `Explorer: ${kickstartText}\n\n`;
                        ws.send(JSON.stringify({
                            clientContent: {
                                turns: [{ role: "user", parts: [{ text: kickstartText }] }],
                                turnComplete: true
                            }
                        }));
                    }
                }, 500);

                setupAudioProcessing(stream, audioCtx, ws);
            };

            ws.onmessage = async (event) => {
                try {
                    let data = JSON.parse(event.data instanceof Blob ? await event.data.text() : event.data);
                    const parts = data.serverContent?.modelTurn?.parts;
                    if (parts) {
                        let turnText = "";
                        parts.forEach((p: any) => { if (p.text) turnText += p.text; });
                        if (turnText) {
                            if (isWrappingUp) summaryAccumulator.current += turnText;
                            else {
                                transcriptAccumulator.current += `Advisor: ${turnText}\n`;
                                setCurrentQuestion(prev => prev + turnText); // Stream to UI
                            }
                        }
                    }

                    if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData && !isWrappingUp) {
                        playPcmChunk(data.serverContent.modelTurn.parts[0].inlineData.data, audioCtx);
                        setIsTalking(true);
                    }

                    if (data.serverContent?.turnComplete) {
                        setTimeout(() => setIsTalking(false), 1000);
                        if (summaryAccumulator.current && summaryAccumulator.current.length > 5 && isWrappingUp) {
                            completeEveningReflection(summaryAccumulator.current, transcriptAccumulator.current).catch(err => {
                                console.error("❌ Failed to complete reflection:", err);
                            });
                            disconnect();
                            // setView(ViewState.DASHBOARD); // Handled by context now (Goes to Summary)
                        }
                        if (!isWrappingUp) {
                            transcriptAccumulator.current += "\n";
                            // Optional: clear question after user replies? Or keep it until next turn?
                            // For now keep it, but maybe reset it when user starts talking (which we don't track easily besides VAD)
                            // or when next turn starts. 
                            // Actually, let's reset it at the *start* of the AI turn?
                            // Hard to detect start of turn here easily without logic.
                            // For MVP, just appending is safer, but might get long.
                            // Let's rely on the fact that we might want to clear it somewhere.
                        }
                    }
                } catch (e) { console.error(e); }
            };

            ws.onclose = () => setIsConnected(false);
        } catch (e: any) {
            console.error("Live Connection Failed", e);
            setIsConnected(false);
        }
    };

    const handleEndSession = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            disconnect();
            return;
        }
        setIsWrappingUp(true);
        summaryAccumulator.current = "";
        if (audioContextRef.current) audioContextRef.current.suspend();
        if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());

        setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.warn("⚠️ Session End Timeout: Forcing completion.");
                disconnect();

                // Fallback Summary if AI hung
                const finalSummary = summaryAccumulator.current.trim().length > 5
                    ? summaryAccumulator.current
                    : "Session finalized. Detailed insights may appear in your daily log.";

                completeEveningReflection(finalSummary, transcriptAccumulator.current).catch(console.error);
            }
        }, 8000); // Increased to 8s to give AI more time

        wsRef.current.send(JSON.stringify({
            clientContent: {
                turns: [{ role: "user", parts: [{ text: "SESSION_END: Summarize our conversation in one concise first-person sentence starting with 'I realized...' or 'I focused on...' for my journal. Reply in TEXT ONLY." }] }],
                turnComplete: true
            }
        }));
    };

    useEffect(() => {
        return () => disconnect();
    }, [disconnect]);

    return {
        isConnected,
        isTalking,
        isWrappingUp,
        connect,
        disconnect,
        handleEndSession,
        currentQuestion
    };
};

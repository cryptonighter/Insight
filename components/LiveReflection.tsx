import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';
import { supabase } from '../services/supabaseClient';
import { Mic, MicOff, StopCircle, X, Keyboard, Send, Loader2, Sparkles } from 'lucide-react';

const API_KEY = "AIzaSyCUcUZKn1w3pYmW184zkpZ3AoS9Me-t54A";
const HOST = "generativelanguage.googleapis.com";
const MODEL = "models/gemini-2.0-flash-exp";

export const LiveReflection: React.FC = () => {
    const { setView, completeEveningReflection, activeResolution } = useApp();
    const [mode, setMode] = useState<'voice' | 'text'>('voice');

    // Voice State
    const [isConnected, setIsConnected] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [isWrappingUp, setIsWrappingUp] = useState(false);

    // Text State
    const [textInput, setTextInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const summaryAccumulator = useRef<string>("");

    useEffect(() => {
        return () => disconnect();
    }, []);

    // Switch Handlers
    const toggleMode = () => {
        if (mode === 'voice') {
            disconnect();
            setMode('text');
        } else {
            setMode('voice');
        }
    };

    const handleTextSubmit = async () => {
        if (!textInput.trim()) return;
        setIsSubmitting(true);
        await new Promise(r => setTimeout(r, 800));
        await completeEveningReflection(textInput);
        setView(ViewState.DASHBOARD);
    };

    const handleEndSession = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            disconnect();
            return;
        }

        setIsWrappingUp(true);

        // IMMEDIATE AUDIO SILENCE
        if (audioContextRef.current) {
            audioContextRef.current.suspend(); // Freeze any upcoming scheduled audio
        }

        // Send Summary Request
        wsRef.current.send(JSON.stringify({
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{ text: "SESSION_END: Summarize our conversation in one concise first-person sentence starting with 'I realized...' or 'I focused on...' for my journal. Reply in TEXT ONLY." }]
                }],
                turnComplete: true
            }
        }));
    };



    // --- MEMORY RETRIEVAL ---
    const fetchContext = async () => {
        if (!activeResolution) return "";

        try {
            // A. Embed Current Goal
            const embedding = await generateEmbedding(activeResolution.statement);

            // B. Fetch Buckets
            const [explicit, contextual, recent] = await Promise.all([
                // Bucket C: Explicit Mandates (The Law) - Filter by 'explicit' (or 'core' if we treat them similarly)
                supabase.from('memories').select('content').eq('user_id', useApp().user.supabaseId).eq('type', 'explicit'),

                // Bucket A: Contextual (Vector Search)
                embedding ? supabase.rpc('match_memories', {
                    query_embedding: embedding,
                    match_threshold: 0.70, // Strict relevancy
                    match_count: 5
                }) : { data: [] },

                // Bucket D: Recent Narrative (Last 3 entries)
                supabase.from('daily_entries')
                    .select('date, reflection_summary')
                    .eq('user_id', useApp().user.supabaseId)
                    .neq('reflection_summary', null)
                    .order('date', { ascending: false })
                    .limit(3)
            ]);

            // C. Format Output
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
            console.error("Memory Fetch Failed", e);
            return "";
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

    const connect = async () => {
        try {
            // 1. Setup Audio Input with Echo Cancellation
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            mediaStreamRef.current = stream;

            const audioCtx = new AudioContext({ sampleRate: 24000 });
            audioContextRef.current = audioCtx;
            nextStartTimeRef.current = audioCtx.currentTime;
            await audioCtx.resume();

            // 2. Setup WebSocket
            const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onerror = (e) => {
                console.error("Live API Error:", e);
                setIsConnected(false);
            };

            ws.onopen = async () => {
                setIsConnected(true);

                // 1. Fetch Memory Context
                const memoryContext = await fetchContext();
                console.log("Injected Memory:", memoryContext);

                const systemPrompt = `
                You are a serious, high-performance executive partner. 
                User's Goal: "${activeResolution?.statement}". 
                Motivation: "${activeResolution?.rootMotivation}".

                BRAIN (LONG-TERM MEMORY):
                ${memoryContext}

                YOUR ROLE:
                - NO fluff. NO cheerleading. NO robotic pleasantries.
                - Be direct, concise, and professional. 
                - Focus exclusively on execution, bottlenecks, and results.
                - If the user makes excuses, challenge them politely but firmly.
                - Speak like a senior advisor: Low arousal, slow pace, high gravity.
                - UNCERTAINTY PROTOCOL: If you are unsure about a preference or fact, ASK. Do not guess.

                OPENING:
                - Do not say "Hello". 
                - Acknowledge the goal and ask a specific question about today's execution.
                `;

                // 2. Send Setup
                ws.send(JSON.stringify({
                    setup: {
                        model: MODEL,
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            maxOutputTokens: 500,
                        },
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        }
                    }
                }));

                // 2. Force Hello (Kickstart) with DELAY
                setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            clientContent: {
                                turns: [{
                                    role: "user",
                                    parts: [{ text: "I am ready for my evening debrief." }] // Serious kickstart
                                }],
                                turnComplete: true
                            }
                        }));
                    }
                }, 500);

                setupAudioProcessing(stream, audioCtx, ws);
            };

            ws.onmessage = async (event) => {
                try {
                    let data;
                    if (event.data instanceof Blob) {
                        const text = await event.data.text();
                        data = JSON.parse(text);
                    } else {
                        data = JSON.parse(event.data);
                    }

                    // 1. Capture Text (Usage for Summary)
                    const textPart = data.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
                    if (textPart) {
                        summaryAccumulator.current += textPart;
                    }

                    // 2. Handle Audio (Ignore if wrapping up)
                    if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                        if (!isWrappingUp) { // Only play audio if not wrapping up
                            const pcmBase64 = data.serverContent.modelTurn.parts[0].inlineData.data;
                            playPcmChunk(pcmBase64, audioCtx);
                            setIsTalking(true);
                        }
                    }

                    // 3. Turn Complete
                    if (data.serverContent?.turnComplete) {
                        setTimeout(() => setIsTalking(false), 1000);

                        // If wrapping up, we assume the text we got is the summary
                        if (summaryAccumulator.current && summaryAccumulator.current.length > 5 && isWrappingUp) {
                            await completeEveningReflection(summaryAccumulator.current);
                            disconnect();
                            setView(ViewState.DASHBOARD);
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            };

            ws.onclose = (e) => {
                setIsConnected(false);
            };

        } catch (e: any) {
            console.error("Live Connection Failed", e);
            alert("Connection Failed: " + e.message);
            setIsConnected(false);
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
                if (ws.readyState === WebSocket.OPEN && !isWrappingUp) { // Stop sending audio if wrapping up
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

            for (let i = 0; i < len / 2; i++) {
                int16[i] = view.getInt16(i * 2, true);
            }

            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768.0;
            }

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

    const disconnect = () => {
        if (wsRef.current) {
            wsRef.current.onclose = null; // Prevent triggers
            wsRef.current.close();
        }
        if (audioContextRef.current) audioContextRef.current.close();
        if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
        setIsConnected(false);
        setIsWrappingUp(false);
        summaryAccumulator.current = "";
    };

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 animate-fade-in text-white p-6">
            <button onClick={() => { disconnect(); setView(ViewState.DASHBOARD); }} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <X />
            </button>

            {/* Mode Switcher */}
            <div className="absolute top-6 left-6 flex bg-slate-800 rounded-full p-1 border border-slate-700">
                <button
                    onClick={() => mode !== 'voice' && toggleMode()}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${mode === 'voice' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Mic size={14} /> Voice
                </button>
                <button
                    onClick={() => mode !== 'text' && toggleMode()}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${mode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Keyboard size={14} /> Text
                </button>
            </div>

            {mode === 'voice' ? (
                <>
                    <h2 className="text-2xl font-light text-white mb-2 tracking-wide">Evening Protocol</h2>
                    <p className="text-slate-500 mb-12 text-sm uppercase tracking-widest">{isConnected ? (isWrappingUp ? "GENERATING INSIGHT..." : "RECORDING") : "READY TO CONNECT"}</p>

                    <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 mb-12 relative ${isTalking ? 'bg-indigo-500/20 shadow-[0_0_80px_rgba(99,102,241,0.4)]' : 'bg-slate-800'}`}>
                        {/* Pulse Ring */}
                        {isTalking && <div className="absolute inset-0 rounded-full border border-indigo-500/50 animate-ping opacity-20" />}

                        {isConnected ? <Mic size={48} className={`transition-colors duration-300 ${isTalking ? "text-indigo-400" : "text-white"}`} /> : <MicOff size={48} className="text-slate-600" />}
                    </div>

                    {!isConnected && (
                        <button onClick={connect} className="px-10 py-4 bg-white text-slate-900 rounded-full font-medium transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                            Begin Debrief
                        </button>
                    )}

                    {isConnected && (
                        <div className="flex flex-col gap-4 items-center animate-fade-in">
                            <button
                                onClick={handleEndSession}
                                disabled={isWrappingUp}
                                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-full font-medium transition-all flex items-center gap-2 group"
                            >
                                {isWrappingUp ? <Loader2 className="animate-spin" size={18} /> :
                                    (isTalking ? <StopCircle size={18} className="text-red-400 group-hover:text-red-300" /> : <Sparkles size={18} />)
                                }
                                {isWrappingUp ? "Processing Insight..." : "Complete Session"}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="w-full max-w-md animate-fade-in">
                    <h2 className="text-2xl font-light text-white mb-6">Evening Reflection</h2>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2 block">How was your progress today?</label>
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="I made progress by..."
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 min-h-[150px] mb-4 outline-none focus:border-indigo-500 transition-colors resize-none"
                            autoFocus
                        />
                        <button
                            onClick={handleTextSubmit}
                            disabled={!textInput.trim() || isSubmitting}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <span className="animate-pulse">Saving...</span> : <>Complete & Earn Token <Send size={16} /></>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

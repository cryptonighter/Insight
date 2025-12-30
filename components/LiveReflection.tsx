import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';
import { Mic, MicOff, StopCircle, X, Keyboard, Send } from 'lucide-react';

const API_KEY = "AIzaSyCUcUZKn1w3pYmW184zkpZ3AoS9Me-t54A"; // Correct Key
const HOST = "generativelanguage.googleapis.com";
// PROTOCOL FIX: Try without 'models/' prefix for WebSocket if 'models/' fails
const MODEL = "models/gemini-2.0-flash-exp";

export const LiveReflection: React.FC = () => {
    const { setView, completeEveningReflection, activeResolution } = useApp();
    const [mode, setMode] = useState<'voice' | 'text'>('voice');

    // Voice State
    const [isConnected, setIsConnected] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    // DEBUG STATE
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const addLog = (msg: string) => setDebugLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);

    // Text State
    const [textInput, setTextInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);

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
        // Simulate a brief delay for "processing" feel
        await new Promise(r => setTimeout(r, 800));
        await completeEveningReflection(textInput);
        setView(ViewState.DASHBOARD);
    };

    const connect = async () => {
        try {
            addLog("Starting connection sequence...");

            // 1. Setup Audio Input
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
            mediaStreamRef.current = stream;
            addLog("Mic granted.");

            const audioCtx = new AudioContext({ sampleRate: 24000 });
            audioContextRef.current = audioCtx;
            nextStartTimeRef.current = audioCtx.currentTime;
            await audioCtx.resume();

            // 2. Setup WebSocket
            const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
            addLog(`Connecting to ws...`);
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onerror = (e) => {
                console.error("Live API Error:", e);
                addLog("WebSocket Error (Check Console)");
                setIsConnected(false);
            };

            ws.onopen = () => {
                addLog(`Connected! Sending Setup...`);
                setIsConnected(true);

                // 1. Send Setup
                ws.send(JSON.stringify({
                    setup: {
                        model: MODEL,
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            maxOutputTokens: 500,
                        },
                        systemInstruction: {
                            parts: [{
                                text: `You are a coach. User goal: "${activeResolution?.statement}". ask ONE question to check progress.`
                            }]
                        }
                    }
                }));
                addLog("Setup Sent.");

                // 2. Force Hello (Kickstart) with DELAY
                setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            clientContent: {
                                turns: [{
                                    role: "user",
                                    parts: [{ text: "Hello, I am ready." }]
                                }],
                                turnComplete: true
                            }
                        }));
                        addLog("Sent Kickstart (Hello) after 500ms.");
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

                    // Log Raw
                    // addLog(`Msg: ${JSON.stringify(data).slice(0, 30)}...`);

                    if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                        const pcmBase64 = data.serverContent.modelTurn.parts[0].inlineData.data;
                        if (Math.random() < 0.1) addLog(`Rx Audio: ${pcmBase64.length}b`);
                        playPcmChunk(pcmBase64, audioCtx);
                        setIsTalking(true);
                    }

                    if (data.serverContent?.turnComplete) {
                        addLog("AI Turn Complete.");
                        setTimeout(() => setIsTalking(false), 1000);
                    }
                } catch (e) {
                    addLog(`Msg Parse Error: ${e}`);
                }
            };

            ws.onclose = (e) => {
                addLog(`Closed: ${e.code} ${e.reason}`);
                setIsConnected(false);
            };

        } catch (e: any) {
            console.error("Live Connection Failed", e);
            addLog(`Conn Failed: ${e.message}`);
            alert("Connection Failed: " + e.message);
            setIsConnected(false);
        }
    };

    const sendPing = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            addLog("Ping Sent.");
            wsRef.current.send(JSON.stringify({
                clientContent: {
                    turns: [{
                        role: "user",
                        parts: [{ text: "Can you hear me?" }]
                    }],
                    turnComplete: true
                }
            }));
        } else {
            addLog("Ping Failed: Not Connected.");
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
                if (ws.readyState === WebSocket.OPEN) {
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
            // addLog("Audio Up.");
        } catch (e: any) {
            console.error("Worklet error", e);
            addLog(`Worklet Err: ${e.message}`);
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
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 mb-8 ${isTalking ? 'bg-indigo-500 scale-110 shadow-[0_0_50px_rgba(99,102,241,0.6)]' : 'bg-slate-700'}`}>
                        {isConnected ? <Mic size={40} className="text-white" /> : <MicOff size={40} className="text-slate-400" />}
                    </div>

                    <h2 className="text-2xl font-light text-white mb-2">Evening Reflection</h2>
                    <p className="text-slate-400 mb-8">{isConnected ? "Listening..." : "Connecting..."}</p>

                    {!isConnected && (
                        <div className="flex flex-col gap-4 items-center">
                            <button onClick={connect} className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-indigo-500/25">
                                Start Conversation
                            </button>
                        </div>
                    )}

                    {isConnected && (
                        <div className="flex flex-col gap-4 items-center animate-fade-in">
                            <button onClick={disconnect} className="px-8 py-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-200 rounded-full font-medium transition-all flex items-center gap-2">
                                <StopCircle size={20} />
                                End Session
                            </button>
                            <button onClick={sendPing} className="text-xs text-slate-500 hover:text-white border border-slate-700 px-3 py-1 rounded-full uppercase tracking-wider hover:border-slate-500 transition-colors">
                                FORCE RESPONSE (Ping)
                            </button>
                        </div>
                    )}

                    {/* DEBUG LOG */}
                    <div className="absolute bottom-6 left-6 right-6 h-32 overflow-y-auto bg-black/50 rounded-lg p-2 text-[10px] font-mono text-green-400 border border-green-900/50 backdrop-blur-sm">
                        {debugLog.length === 0 && <span className="text-slate-500">Debug log waiting for connection...</span>}
                        {debugLog.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                        <div className="h-4" />
                    </div>
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

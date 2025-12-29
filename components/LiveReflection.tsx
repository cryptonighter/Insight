import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';
import { Mic, MicOff, StopCircle, X } from 'lucide-react';

const API_KEY = "AIzaSyBx3c6VF9JnL-Qbc1rQKbAL-PHBA5anfys";
const HOST = "generativelanguage.googleapis.com";
const MODEL = "models/gemini-2.0-flash-exp";

export const LiveReflection: React.FC = () => {
    const { setView, completeEveningReflection, activeResolution } = useApp();
    const [isConnected, setIsConnected] = useState(false);
    const [isTalking, setIsTalking] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);

    const [transcript, setTranscript] = useState("");

    useEffect(() => {
        return () => disconnect();
    }, []);

    const connect = async () => {
        try {
            // 1. Setup Audio Input
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
            mediaStreamRef.current = stream;

            const audioCtx = new AudioContext({ sampleRate: 24000 }); // Gemini optimized
            audioContextRef.current = audioCtx;
            nextStartTimeRef.current = audioCtx.currentTime;

            // 2. Setup WebSocket
            const url = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                ws.send(JSON.stringify({
                    setup: {
                        model: MODEL,
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            maxOutputTokens: 300,
                        },
                        systemInstruction: {
                            parts: [{
                                text: `You are a warm, concise accountability coach. The user's goal is: "${activeResolution?.statement}". 
                                Why: "${activeResolution?.rootMotivation}". 
                                
                                Your Protocol:
                                1. Greet warmly (1 sentence).
                                2. Ask "Did you take action on your goal today?"
                                3. If yes -> Celebrate briefly. If no -> Ask "What got in the way?"
                                4. Ask "How do you feel about tomorrow?"
                                5. Say goodbye and end.
                                
                                CRITICAL: Keep responses under 2 sentences. Be encouraging but efficient.`
                            }]
                        }
                    }
                }));
                setupAudioProcessing(stream, audioCtx, ws);
            };

            ws.onmessage = async (event) => {
                if (event.data instanceof Blob) {
                    // Blob handling if needed
                } else {
                    const data = JSON.parse(event.data);

                    // Handle Audio Output
                    if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                        const pcmBase64 = data.serverContent.modelTurn.parts[0].inlineData.data;
                        playPcmChunk(pcmBase64, audioCtx);
                        setIsTalking(true);
                    }

                    if (data.serverContent?.turnComplete) {
                        setTimeout(() => setIsTalking(false), 1000); // Small buffer
                    }
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                completeEveningReflection("Session Completed");
                setView(ViewState.DASHBOARD);
            };

        } catch (e) {
            console.error("Live Connection Failed", e);
            alert("Could not connect to Live API");
            setIsConnected(false);
        }
    };

    const setupAudioProcessing = async (stream: MediaStream, ctx: AudioContext, ws: WebSocket) => {
        // Simple ScriptProcessor fallback for simplicity in this pivot or AudioWorklet if possible.
        // Using ScriptProcessor for wider compat in quick implementation, or a simpler Worklet.
        // Let's use a robust Worklet approach for INPUT.

        await ctx.audioWorklet.addModule("data:text/javascript," + encodeURIComponent(`
            class RecorderProcessor extends AudioWorkletProcessor {
                process(inputs) {
                    const input = inputs[0];
                    if (input.length > 0) {
                        const float32 = input[0];
                        // Downsample/Convert if needed, but Gemini accepts PCM
                        // Just sending raw chunks helps
                        this.port.postMessage(float32);
                    }
                    return true;
                }
            }
            registerProcessor("recorder-processor", RecorderProcessor);
        `));

        const source = ctx.createMediaStreamSource(stream);
        const processor = new AudioWorkletNode(ctx, "recorder-processor");

        // Downsampling/Encoding Logic
        // Gemini expects: 16kHz or 24kHz, 1 channel, PCM s16le usually
        // We will do a simple Float32 -> Int16 conversion here
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
    };

    const playPcmChunk = (base64: string, ctx: AudioContext) => {
        const binary = atob(base64);
        const len = binary.length;
        // Turn raw bytes into Int16
        const int16 = new Int16Array(len / 2);
        const view = new DataView(new Uint8Array(new Uint8Array(len).map((_, i) => binary.charCodeAt(i))).buffer);

        for (let i = 0; i < len / 2; i++) {
            int16[i] = view.getInt16(i * 2, true); // Little Endian
        }

        // Convert Int16 -> Float32 for playback
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }

        const buffer = ctx.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        // Schedule Ahead Logic (Jitter Buffer)
        const now = ctx.currentTime;
        // Schedule at next available slot, or now if we fell behind (add small latency)
        const scheduledTime = Math.max(now, nextStartTimeRef.current);

        source.start(scheduledTime);
        nextStartTimeRef.current = scheduledTime + buffer.duration;
    };

    const disconnect = () => {
        if (wsRef.current) wsRef.current.close();
        if (audioContextRef.current) audioContextRef.current.close();
        if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
        setIsConnected(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 animate-fade-in">
            <button onClick={() => { disconnect(); setView(ViewState.DASHBOARD); }} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white">
                <X />
            </button>

            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isTalking ? 'bg-indigo-500 scale-110 shadow-[0_0_50px_rgba(99,102,241,0.6)]' : 'bg-slate-700'}`}>
                {isConnected ? <Mic size={40} className="text-white" /> : <MicOff size={40} className="text-slate-400" />}
            </div>

            <h2 className="mt-8 text-2xl font-light text-white">Evening Reflection</h2>
            <p className="text-slate-400 mt-2">{isConnected ? "Listening..." : "Connecting..."}</p>

            {!isConnected && (
                <button onClick={connect} className="mt-8 px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full font-medium transition-all">
                    Start Conversation
                </button>
            )}

            {isConnected && (
                <button onClick={disconnect} className="mt-8 px-8 py-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-200 rounded-full font-medium transition-all flex items-center gap-2">
                    <StopCircle size={20} />
                    End Session
                </button>
            )}
        </div>
    );
};

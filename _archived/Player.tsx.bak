
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState, FeedbackData, SonicInstruction } from '../types';
import { Pause, Play, ChevronDown, SkipBack, SkipForward, Settings2, ArrowRight, Layers, Volume2, CloudRain, Waves, Sliders, Radio } from 'lucide-react';
import { decodeBase64 } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { ResonanceCheck } from './ResonanceCheck';

// --- Advanced Multi-Layer Sound Engine ---
class SoundEngine {
    ctx: AudioContext;
    masterGain: GainNode;

    // Reverb chain
    convolver: ConvolverNode;
    dryGain: GainNode;
    wetGain: GainNode;
    reverbMix: number = 0.1; // 10% wet - subtle, safe default

    // Track layers by ID
    layers: Map<string, { source: any, gain: GainNode, type: 'buffer' | 'procedural', params?: any }> = new Map();

    constructor(ctx: AudioContext) {
        this.ctx = ctx;
        this.masterGain = ctx.createGain();
        this.masterGain.connect(ctx.destination);
        this.masterGain.gain.value = 1.0;

        // Initialize reverb chain
        this.convolver = ctx.createConvolver();
        this.dryGain = ctx.createGain();
        this.wetGain = ctx.createGain();

        this.dryGain.connect(this.masterGain);
        this.wetGain.connect(this.masterGain);
        this.convolver.connect(this.wetGain);

        this.setReverbMix(0.1); // Start with subtle reverb to avoid noise
        this.generateImpulseResponse();
    }

    // Generate a synthetic impulse response for reverb (meditation hall)
    generateImpulseResponse() {
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * 2.5; // 2.5 second reverb tail
        const impulse = this.ctx.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Smooth exponential decay (no random artifacts)
                const decay = Math.exp(-4.0 * i / length);
                // Gentle noise - reduced amplitude to prevent harsh artifacts
                const noise = (Math.random() * 2 - 1) * 0.3;
                data[i] = noise * decay;
            }
        }

        this.convolver.buffer = impulse;
    }

    // Set reverb wet/dry mix (0 = fully dry, 1 = fully wet)
    setReverbMix(mix: number) {
        this.reverbMix = Math.max(0, Math.min(1, mix));
        this.dryGain.gain.setTargetAtTime(1 - this.reverbMix, this.ctx.currentTime, 0.1);
        this.wetGain.gain.setTargetAtTime(this.reverbMix, this.ctx.currentTime, 0.1);
    }

    // Connect a source through the reverb chain
    connectWithReverb(source: AudioNode, gain: GainNode) {
        source.connect(gain);
        gain.connect(this.dryGain);
        gain.connect(this.convolver);
    }

    setLayerVolume(id: string, val: number, duration: number = 0.5) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.gain.gain.setTargetAtTime(val, this.ctx.currentTime, duration);
        }
    }

    // Layer 1: Sample-based (The Soundscape)
    playBuffer(id: string, buffer: AudioBuffer, volume: number = 1.0, loop: boolean = true) {
        this.stopLayer(id);

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;

        const gain = this.ctx.createGain();
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.masterGain);

        source.start();
        this.layers.set(id, { source, gain, type: 'buffer' });
    }

    // Layer 2: Binaural Beats (The Resonance)
    playBinaural(id: string, baseFreq: number = 200, beatFreq: number = 6, volume: number = 0.1) {
        this.stopLayer(id);

        const merger = this.ctx.createChannelMerger(2);

        // Left Ear
        const oscL = this.ctx.createOscillator();
        oscL.type = 'sine';
        oscL.frequency.value = baseFreq;
        const panL = this.ctx.createStereoPanner();
        panL.pan.value = -1; // Hard Left
        oscL.connect(panL).connect(merger, 0, 0);

        // Right Ear
        const oscR = this.ctx.createOscillator();
        oscR.type = 'sine';
        oscR.frequency.value = baseFreq + beatFreq;
        const panR = this.ctx.createStereoPanner();
        panR.pan.value = 1; // Hard Right
        oscR.connect(panR).connect(merger, 0, 1);

        const gain = this.ctx.createGain();
        gain.gain.value = volume;

        merger.connect(gain);
        gain.connect(this.masterGain);

        oscL.start();
        oscR.start();

        const wrapper = {
            stop: () => {
                try { oscL.stop(); oscR.stop(); } catch (e) { }
                try { oscL.disconnect(); oscR.disconnect(); } catch (e) { }
                try { panL.disconnect(); panR.disconnect(); } catch (e) { }
                try { merger.disconnect(); } catch (e) { }
            }
        };

        this.layers.set(id, {
            source: wrapper,
            gain,
            type: 'procedural',
            params: { oscL, oscR, baseFreq, beatFreq }
        });
    }

    // Dynamically shift binaural frequencies over time (Drift)
    shiftBinaural(id: string, newBeatFreq: number, duration: number = 5) {
        const layer = this.layers.get(id);
        if (layer && layer.type === 'procedural' && layer.params) {
            const { oscR, baseFreq } = layer.params;
            // Ramp the Right Oscillator frequency
            const targetFreq = baseFreq + newBeatFreq;
            oscR.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + duration);
            // Update internal params so logic stays consistent
            layer.params.beatFreq = newBeatFreq;
        }
    }

    // Layer 3: Texture (Pink Noise for fullness)
    playTexture(id: string, volume: number = 0.05) {
        this.stopLayer(id);
        const bufferSize = 2 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Pink Noise approximation
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11; // compensate for gain
            b6 = white * 0.115926;
        }

        this.playBuffer(id, buffer, volume, true);
    }

    stopLayer(id: string) {
        const layer = this.layers.get(id);
        if (layer) {
            try {
                if (layer.source.stop) layer.source.stop();
                layer.gain.disconnect();
            } catch (e) { }
            this.layers.delete(id);
        }
    }

    stopAll() {
        this.layers.forEach((_, id) => this.stopLayer(id));
    }
}

export const Player: React.FC = () => {
    const { activeMeditationId, meditations, setView, rateMeditation, soundscapes } = useApp();
    const meditation = meditations.find(m => m.id === activeMeditationId);

    // Player Phases
    type PlayerPhase = 'playing' | 'lingering' | 'feedback';
    const [phase, setPhase] = useState<PlayerPhase>('playing');

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [statusText, setStatusText] = useState("Initializing...");
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

    // Feedback State
    const [feedback, setFeedback] = useState<FeedbackData>({
        pacing: 50,
        voice: 50,
        immersion: 50,
        note: ""
    });

    // Mix Settings - Load from localStorage if available
    const savedPrefs = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sonicPreferences') || '{}') : {};
    const [volVoice, setVolVoice] = useState(savedPrefs.voice ?? 1.0);
    const [volAtmosphere, setVolAtmosphere] = useState(savedPrefs.atmosphere ?? 0.5);
    const [volResonance, setVolResonance] = useState(savedPrefs.resonance ?? 0.15);
    const [voiceSpace, setVoiceSpace] = useState(savedPrefs.voiceSpace ?? 0.3); // Reverb amount
    const [showSettings, setShowSettings] = useState(false);

    // Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const soundEngineRef = useRef<SoundEngine | null>(null);
    const voiceSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const voiceGainRef = useRef<GainNode | null>(null);
    const timeoutRef = useRef<any>(null);

    const meditationRef = useRef(meditation);
    useEffect(() => {
        meditationRef.current = meditation;
    }, [meditation]);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (!meditation) return;
        let isMounted = true;

        const initCtx = async () => {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            if (ctx.state === 'suspended') {
                try { await ctx.resume(); } catch (e) { console.log("Autoplay waiting for interaction"); }
            }

            voiceGainRef.current = ctx.createGain();
            voiceGainRef.current.gain.value = volVoice;
            // Voice will be routed through SoundEngine's reverb chain

            soundEngineRef.current = new SoundEngine(ctx);
            soundEngineRef.current.setReverbMix(voiceSpace);

            // Connect voice gain through the reverb chain
            soundEngineRef.current.connectWithReverb(voiceGainRef.current, voiceGainRef.current);

            // Setup Layers
            let atmosphereLoaded = false;
            if (meditation.soundscapeId) {
                const sc = soundscapes.find(s => s.id === meditation.soundscapeId);
                if (sc) {
                    try {
                        let buffer: AudioBuffer | null = null;

                        // 1. Try Base64 (Legacy / Local)
                        let base64 = sc.audioBase64;
                        if (!base64 || base64.length < 100) {
                            base64 = await storageService.getSoundscapeAudio(sc.id) || '';
                        }

                        if (base64 && base64.length > 100) {
                            const bytes = decodeBase64(base64);
                            buffer = await ctx.decodeAudioData(bytes.buffer);
                        }
                        // 2. Try URL (Supabase)
                        else if (sc.audioUrl) {
                            console.log("Fetching soundscape from URL:", sc.audioUrl);
                            const resp = await fetch(sc.audioUrl);
                            const ab = await resp.arrayBuffer();
                            buffer = await ctx.decodeAudioData(ab);
                        }

                        if (buffer && isMounted) {
                            soundEngineRef.current.playBuffer('atmosphere', buffer, volAtmosphere);
                            atmosphereLoaded = true;
                        }
                    } catch (e) {
                        console.error("Failed soundscape load", e);
                    }
                }
            }

            if (isMounted) {
                if (!atmosphereLoaded) {
                    console.warn("No atmosphere loaded. Staying silent (User preference).");
                }

                // Initialize at Beta (14Hz) for alert focus, then drift down
                soundEngineRef.current.playBinaural('resonance', 110, 14, volResonance);

                setIsPlaying(true);
                processQueue(0);
            }
        };

        initCtx();

        return () => {
            isMounted = false;
            stopAll();
            audioContextRef.current?.close();
        };
    }, [meditation?.id]);

    // --- VOICE QUEUE LOGIC ---
    const processQueue = async (index: number) => {
        const currentMeditation = meditationRef.current;
        if (!currentMeditation || !audioContextRef.current) return;

        // Ensure we haven't been destroyed
        if (audioContextRef.current.state === 'closed') return;

        if (index < currentMeditation.audioQueue.length) {
            setCurrentSegmentIndex(index);
            setStatusText(currentMeditation.isGenerating ? "Streaming..." : "Flowing");

            // Safety: Wait if index 0 and audio buffer is not ready
            if (index === 0 && currentMeditation.audioQueue.length === 0) {
                if (currentMeditation.isGenerating) {
                    timeoutRef.current = setTimeout(() => processQueue(0), 1000);
                    return;
                }
            }

            const segment = currentMeditation.audioQueue[index];

            // 1. EXECUTE SONIC INSTRUCTIONS (The Director)
            if (segment.instructions && soundEngineRef.current) {
                segment.instructions.forEach(instr => {
                    if (instr.action === 'FADE_VOL') {
                        // Apply user preference scaling to the target value
                        let val = instr.targetValue || 0.5;
                        if (instr.layer === 'atmosphere') val *= volAtmosphere * 2; // normalize
                        if (instr.layer === 'resonance') val *= volResonance * 10; // normalize

                        soundEngineRef.current?.setLayerVolume(instr.layer, val, instr.duration || 1);
                    }
                    else if (instr.action === 'SET_BINAURAL' && instr.layer === 'resonance') {
                        if (instr.targetValue) {
                            soundEngineRef.current?.shiftBinaural('resonance', instr.targetValue, instr.duration || 5);
                        }
                    }
                });
            }

            try {
                const resp = await fetch(segment.audioUrl);
                const arrayBuffer = await resp.arrayBuffer();
                const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

                playSegmentBuffer(audioBuffer, () => {
                    // Intelligent gap calculation for fixed-length sessions
                    const targetDurationMs = (meditation?.config?.duration || 10) * 60 * 1000;
                    const totalSegments = currentMeditation.audioQueue.length;
                    const totalAudioDuration = currentMeditation.audioQueue.reduce((sum, s) => sum + (s.duration || 0), 0) * 1000;
                    const remainingSegments = totalSegments - (index + 1);

                    // Calculate ideal gap to reach target duration
                    let gap = 2500; // Default
                    if (remainingSegments > 0 && totalAudioDuration > 0) {
                        const silenceNeeded = Math.max(0, targetDurationMs - totalAudioDuration);
                        gap = Math.max(1500, Math.min(8000, silenceNeeded / totalSegments));
                    }

                    // Add slight randomness for natural feel (±15%)
                    gap = gap * (0.85 + Math.random() * 0.3);

                    timeoutRef.current = setTimeout(() => processQueue(index + 1), gap);
                });
            } catch (e) {
                console.error("Segment play error", e);
                // Skip bad segment
                processQueue(index + 1);
            }
        } else {
            // If queue is exhausted...
            if (currentMeditation.isGenerating) {
                setStatusText("Receiving transmission...");

                // Swell atmosphere volume to fill the gap
                soundEngineRef.current?.setLayerVolume('atmosphere', volAtmosphere * 1.3);

                // Poll every 1s
                timeoutRef.current = setTimeout(() => processQueue(index), 1000);
            } else {
                setPhase('lingering');
                setStatusText("Session Complete");
                soundEngineRef.current?.setLayerVolume('atmosphere', volAtmosphere);

                // Drift binaural to deep delta for resting
                soundEngineRef.current?.shiftBinaural('resonance', 2, 10);
            }
        }
    };

    const playSegmentBuffer = (buffer: AudioBuffer, onEnded: () => void) => {
        if (!audioContextRef.current || !voiceGainRef.current) return;

        if (voiceSourceRef.current) {
            try { voiceSourceRef.current.stop(); } catch (e) { }
        }

        // Auto-Duck if no explicit instructions were given
        // (Explicit instructions from AI are handled in processQueue)
        // This is a safety fallback
        if (volAtmosphere > 0.2) {
            soundEngineRef.current?.setLayerVolume('atmosphere', volAtmosphere * 0.6, 0.5);
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;

        // Route voice through the reverb chain for spatial effect
        if (soundEngineRef.current && voiceGainRef.current) {
            source.connect(voiceGainRef.current);
            // Voice gain already connected to reverb chain in init
        } else {
            source.connect(voiceGainRef.current!);
        }
        source.onended = () => {
            // Return volume to normal
            soundEngineRef.current?.setLayerVolume('atmosphere', volAtmosphere, 1.5);
            onEnded();
        };
        source.start();
        voiceSourceRef.current = source;
    };

    const stopAll = () => {
        if (voiceSourceRef.current) try { voiceSourceRef.current.stop(); } catch (e) { }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        soundEngineRef.current?.stopAll();
    };

    const togglePause = () => {
        if (isPlaying) {
            audioContextRef.current?.suspend();
            setIsPlaying(false);
        } else {
            audioContextRef.current?.resume();
            setIsPlaying(true);
        }
    };

    const updateVol = (type: 'voice' | 'atmosphere' | 'resonance' | 'voiceSpace', val: number) => {
        if (type === 'voice') {
            setVolVoice(val);
            if (voiceGainRef.current) voiceGainRef.current.gain.setTargetAtTime(val, audioContextRef.current!.currentTime, 0.1);
        } else if (type === 'atmosphere') {
            setVolAtmosphere(val);
            soundEngineRef.current?.setLayerVolume('atmosphere', val);
        } else if (type === 'resonance') {
            setVolResonance(val);
            soundEngineRef.current?.setLayerVolume('resonance', val);
        } else if (type === 'voiceSpace') {
            setVoiceSpace(val);
            soundEngineRef.current?.setReverbMix(val);
        }

        // Persist preferences to localStorage
        const currentPrefs = JSON.parse(localStorage.getItem('sonicPreferences') || '{}');
        const updatedPrefs = { ...currentPrefs, [type]: val };
        localStorage.setItem('sonicPreferences', JSON.stringify(updatedPrefs));
    };

    const submitFeedback = () => {
        rateMeditation(meditation!.id, feedback);
        setView(ViewState.HOME);
    };

    if (!meditation) return null;



    // 2. MAIN PLAYER
    return (
        <div className="fixed inset-0 bg-gradient-liquid z-50 flex flex-col app-text-primary transition-colors duration-1000">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-white/40 backdrop-blur-3xl z-10"></div>
                <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/50 rounded-full blur-[120px] transition-all duration-[5s] ${isPlaying ? 'scale-125' : 'scale-100'}`} style={{ opacity: 0.5 + volResonance }}></div>
                <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-200/50 rounded-full blur-[120px] transition-all duration-[7s] ${isPlaying ? 'scale-110' : 'scale-100'}`}></div>
            </div>

            <div className="relative z-20 flex-1 flex flex-col">
                <div className="p-6 flex justify-between items-center app-text-secondary">
                    <button onClick={() => setView(ViewState.HOME)} className="hover:text-slate-800">
                        <ChevronDown size={28} />
                    </button>
                    <div className="flex items-center gap-2">
                        {statusText === "Receiving transmission..." && <Radio size={14} className="animate-pulse text-indigo-500" />}
                        <span className={`text-xs tracking-widest uppercase text-slate-500 ${statusText === "Receiving transmission..." ? 'text-indigo-600 font-bold' : ''}`}>{statusText}</span>
                    </div>
                    <button onClick={() => setShowSettings(!showSettings)} className={`hover:text-slate-800 ${showSettings ? 'text-indigo-600' : ''}`}>
                        <Settings2 size={24} />
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-1000 ${isPlaying ? 'scale-105' : 'scale-100'}`}>
                        <div className="absolute inset-0 rounded-full border border-gray-300/50 animate-[spin_12s_linear_infinite]"></div>
                        <div className="absolute inset-[-20px] rounded-full border border-indigo-300/20" style={{ transform: `scale(${1 + volResonance})` }}></div>
                        <div className="absolute inset-4 rounded-full border border-gray-300/30 animate-[spin_18s_linear_infinite_reverse]"></div>

                        <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-indigo-100/80 to-teal-100/80 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-lg">
                            {isPlaying && phase === 'playing' ? (
                                <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] animate-pulse"></div>
                            ) : (
                                <div className="w-2 h-2 bg-slate-400/50 rounded-full"></div>
                            )}
                        </div>
                    </div>

                    <h2 className="mt-12 text-2xl font-light text-center px-8 max-w-md leading-relaxed tracking-wide text-slate-800">
                        {meditation.title || "Creating Session..."}
                    </h2>

                    {phase === 'lingering' && (
                        <div className="mt-8 flex flex-col items-center animate-fade-in gap-4 bg-white/60 p-6 rounded-2xl backdrop-blur-md shadow-lg border border-white/50">
                            <p className="text-sm text-slate-700 font-medium">Session Complete</p>
                            <p className="text-xs text-slate-500 italic mb-2">Rest in this space as long as you like.</p>
                            <button
                                onClick={() => setView(ViewState.FEEDBACK)}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-full text-sm hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2"
                            >
                                Complete Session <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {phase === 'playing' && (
                    <div className="px-8 pb-12 w-full max-w-md mx-auto animate-fade-in">
                        <div className="flex items-center justify-between px-6">
                            <button className="app-text-secondary opacity-30 cursor-not-allowed"><SkipBack size={28} strokeWidth={1} /></button>
                            <button
                                onClick={togglePause}
                                className="w-20 h-20 bg-indigo-500 text-white rounded-full flex items-center justify-center hover:scale-105 hover:bg-indigo-600 transition-all active:scale-95 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                            >
                                {isPlaying ? <Pause size={32} fill="currentColor" strokeWidth={0} /> : <Play size={32} fill="currentColor" strokeWidth={0} className="ml-1" />}
                            </button>
                            <button className="app-text-secondary opacity-30 cursor-not-allowed"><SkipForward size={28} strokeWidth={1} /></button>
                        </div>
                    </div>
                )}

                {phase === 'lingering' && <div className="h-32"></div>}

                {showSettings && (
                    <div className="absolute bottom-0 left-0 w-full px-6 animate-slide-up bg-white/90 backdrop-blur-xl border-t border-gray-200 py-8 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30">
                        <div className="space-y-6 max-w-sm mx-auto">
                            <div className="flex items-center gap-2 mb-2 border-b border-gray-200 pb-2">
                                <Layers size={14} className="text-indigo-500" />
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Sonic Layers</h3>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-8 flex justify-center"><Volume2 size={16} className="text-slate-400" /></div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs app-text-secondary mb-1">
                                        <span>Guide Voice</span>
                                        <span>{Math.round(volVoice * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1.5" step="0.1"
                                        value={volVoice} onChange={e => updateVol('voice', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-8 flex justify-center"><Sliders size={16} className="text-violet-400" /></div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs app-text-secondary mb-1">
                                        <span>Voice Space</span>
                                        <span>{voiceSpace < 0.2 ? 'Dry' : voiceSpace < 0.5 ? 'Intimate' : voiceSpace < 0.8 ? 'Spacious' : 'Cathedral'}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={voiceSpace} onChange={e => updateVol('voiceSpace', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-violet-400"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-8 flex justify-center"><CloudRain size={16} className="text-teal-400" /></div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs app-text-secondary mb-1">
                                        <span>Atmosphere</span>
                                        <span>{Math.round(volAtmosphere * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={volAtmosphere} onChange={e => updateVol('atmosphere', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-teal-400"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-8 flex justify-center"><Waves size={16} className="text-purple-400" /></div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs app-text-secondary mb-1">
                                        <span>Deep Resonance (Theta)</span>
                                        <span>{Math.round(volResonance * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="0.5" step="0.01"
                                        value={volResonance} onChange={e => updateVol('resonance', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-purple-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Check, Volume2, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';

// Voice configuration with pre-cached audio
const VOICES = [
    {
        id: 'ac7df359',
        name: 'James',
        description: 'Calm, measured male voice',
        greeting: "Hello... Let's begin this journey of awareness together."
    },
    {
        id: '018dc07a',
        name: 'Thomas',
        description: 'Deep, resonant male voice',
        greeting: "Greetings... I'll be your companion for this session."
    },
    {
        id: '7213a9ea',
        name: 'Sarah',
        description: 'Gentle, soothing female voice',
        greeting: "Hi there... Welcome to your time of reflection."
    },
    {
        id: '38a0b764',
        name: 'Marcus',
        description: 'Warm, grounded male voice',
        greeting: "Welcome... I'm here to guide you through your practice today."
    }
];

const RESEMBLE_API_KEY = import.meta.env.VITE_RESEMBLE_API_KEY || '';
const RESEMBLE_STREAM_URL = 'https://f.cluster.resemble.ai/stream';

// Cache key for localStorage
const AUDIO_CACHE_KEY = 'insight_voice_previews';

export const VoiceSelector: React.FC = () => {
    const { user, setView } = useApp();
    const [selectedVoice, setSelectedVoice] = useState(
        localStorage.getItem('insight_voice_id') || user.preferences?.voiceId || VOICES[0].id
    );
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
    const [preloadingAll, setPreloadingAll] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioCacheRef = useRef<Map<string, string>>(new Map());

    // Preload all voice samples on mount
    useEffect(() => {
        const preloadVoices = async () => {
            // Check localStorage cache first
            const cached = localStorage.getItem(AUDIO_CACHE_KEY);
            if (cached) {
                try {
                    const parsedCache = JSON.parse(cached);
                    // Convert base64 back to blob URLs
                    for (const [voiceId, base64] of Object.entries(parsedCache)) {
                        const binary = atob(base64 as string);
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            bytes[i] = binary.charCodeAt(i);
                        }
                        const blob = new Blob([bytes], { type: 'audio/wav' });
                        audioCacheRef.current.set(voiceId, URL.createObjectURL(blob));
                    }
                    console.log('🔊 Loaded voice previews from cache');
                    return;
                } catch (e) {
                    console.warn('Failed to parse audio cache');
                }
            }

            // Generate and cache all voices
            setPreloadingAll(true);
            const newCache: Record<string, string> = {};

            for (const voice of VOICES) {
                if (audioCacheRef.current.has(voice.id)) continue;

                try {
                    const response = await fetch(RESEMBLE_STREAM_URL, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${RESEMBLE_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            voice_uuid: voice.id,
                            data: voice.greeting,
                            model: 'chatterbox-turbo',
                            sample_rate: 44100,
                            precision: 'PCM_16',
                        }),
                    });

                    if (response.ok) {
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        audioCacheRef.current.set(voice.id, blobUrl);

                        // Also store as base64 for localStorage persistence
                        const arrayBuffer = await blob.arrayBuffer();
                        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                        newCache[voice.id] = base64;
                    }
                } catch (e) {
                    console.error(`Failed to preload ${voice.name}`);
                }
            }

            // Save to localStorage for next time
            if (Object.keys(newCache).length > 0) {
                try {
                    localStorage.setItem(AUDIO_CACHE_KEY, JSON.stringify(newCache));
                } catch (e) {
                    console.warn('Failed to cache audio (storage full?)');
                }
            }

            setPreloadingAll(false);
            console.log('🔊 Preloaded all voice previews');
        };

        preloadVoices();

        // Cleanup blob URLs on unmount
        return () => {
            audioCacheRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const playPreview = async (voice: typeof VOICES[0]) => {
        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        if (playingVoice === voice.id) {
            setPlayingVoice(null);
            return;
        }

        // Use cached audio if available
        let audioUrl = audioCacheRef.current.get(voice.id);

        if (!audioUrl) {
            // Fallback: generate on-demand
            setLoadingVoice(voice.id);
            try {
                const response = await fetch(RESEMBLE_STREAM_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEMBLE_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        voice_uuid: voice.id,
                        data: voice.greeting,
                        model: 'chatterbox-turbo',
                        sample_rate: 44100,
                        precision: 'PCM_16',
                    }),
                });

                if (!response.ok) throw new Error('Failed to generate preview');

                const blob = await response.blob();
                audioUrl = URL.createObjectURL(blob);
                audioCacheRef.current.set(voice.id, audioUrl);
            } catch (error) {
                console.error('Failed to play voice preview:', error);
                setLoadingVoice(null);
                return;
            }
            setLoadingVoice(null);
        }

        // Play the audio
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => setPlayingVoice(null);
        audio.onerror = () => setPlayingVoice(null);
        audio.onplay = () => setPlayingVoice(voice.id);
        await audio.play();
    };

    const handleSelectVoice = (voiceId: string) => {
        setSelectedVoice(voiceId);
        localStorage.setItem('insight_voice_id', voiceId);
    };

    const handleDone = () => {
        // Use setView to properly navigate back to dashboard
        setView(ViewState.DASHBOARD);
    };

    return (
        <div className="min-h-screen bg-background-dark text-white p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-lg mx-auto"
            >
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={handleDone}
                        className="p-2 rounded-full bg-surface/50 border border-white/10 hover:border-white/20 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-light">Choose Your Guide</h1>
                        <p className="text-white/40 text-sm">
                            {preloadingAll ? 'Loading voices...' : 'Select a voice for your meditation sessions'}
                        </p>
                    </div>
                </div>

                {/* Voice Cards */}
                <div className="space-y-3 mb-8">
                    {VOICES.map((voice) => {
                        const isCached = audioCacheRef.current.has(voice.id);
                        return (
                            <motion.div
                                key={voice.id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className={`
                                    relative p-4 rounded-2xl cursor-pointer transition-all
                                    ${selectedVoice === voice.id
                                        ? 'bg-primary/20 border-2 border-primary'
                                        : 'bg-surface/50 border-2 border-white/10 hover:border-white/20'}
                                `}
                                onClick={() => handleSelectVoice(voice.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center
                                            ${selectedVoice === voice.id ? 'bg-primary' : 'bg-white/10'}
                                        `}>
                                            <Volume2 size={18} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white">{voice.name}</h3>
                                            <p className="text-sm text-white/40">{voice.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Play Preview Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playPreview(voice);
                                            }}
                                            disabled={loadingVoice === voice.id}
                                            className={`
                                                p-2.5 rounded-full transition-all
                                                ${playingVoice === voice.id
                                                    ? 'bg-primary text-white'
                                                    : isCached
                                                        ? 'bg-white/10 hover:bg-white/20'
                                                        : 'bg-white/5 hover:bg-white/10'}
                                                ${loadingVoice === voice.id ? 'animate-pulse' : ''}
                                            `}
                                        >
                                            {loadingVoice === voice.id ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : playingVoice === voice.id ? (
                                                <Pause size={18} />
                                            ) : (
                                                <Play size={18} />
                                            )}
                                        </button>

                                        {/* Selected Indicator */}
                                        {selectedVoice === voice.id && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-7 h-7 rounded-full bg-primary flex items-center justify-center"
                                            >
                                                <Check size={14} />
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Done Button */}
                <button
                    onClick={handleDone}
                    className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/80 transition-colors font-medium"
                >
                    Done
                </button>

                <p className="text-center text-white/30 text-xs mt-4">
                    Your guide will narrate all meditation sessions
                </p>
            </motion.div>
        </div>
    );
};

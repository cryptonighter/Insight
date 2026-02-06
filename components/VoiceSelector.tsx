import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Check, Volume2, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';

// Voice configuration
const VOICES = [
    {
        id: '38a0b764',
        name: 'Marcus',
        description: 'Warm, grounded male voice',
        greeting: "Welcome... I'm here to guide you through your practice today. Together, we'll create space for stillness and insight."
    },
    {
        id: 'ac7df359',
        name: 'James',
        description: 'Calm, measured male voice',
        greeting: "Hello... Let's begin this journey of awareness together. Take a moment to arrive fully in this space."
    },
    {
        id: '018dc07a',
        name: 'Thomas',
        description: 'Deep, resonant male voice',
        greeting: "Greetings... I'll be your companion for this session. Allow yourself to settle into the present moment."
    },
    {
        id: '7213a9ea',
        name: 'Sarah',
        description: 'Gentle, soothing female voice',
        greeting: "Hi there... Welcome to your time of reflection. Let's explore the landscape of your inner experience together."
    }
];

const RESEMBLE_API_KEY = import.meta.env.VITE_RESEMBLE_API_KEY || '';
const RESEMBLE_STREAM_URL = 'https://f.cluster.resemble.ai/stream';

export const VoiceSelector: React.FC = () => {
    const { setView, user, updateUserPreferences } = useApp();
    const [selectedVoice, setSelectedVoice] = useState(user.preferences?.voiceId || VOICES[0].id);
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

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

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                setPlayingVoice(null);
                URL.revokeObjectURL(audioUrl);
            };

            audio.onplay = () => setPlayingVoice(voice.id);
            await audio.play();
        } catch (error) {
            console.error('Failed to play voice preview:', error);
        } finally {
            setLoadingVoice(null);
        }
    };

    const handleSelectVoice = async (voiceId: string) => {
        setSelectedVoice(voiceId);
        // Save to user preferences
        if (updateUserPreferences) {
            await updateUserPreferences({ voiceId });
        }
    };

    const handleSave = () => {
        setView(ViewState.DASHBOARD);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-lg mx-auto"
            >
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => setView(ViewState.DASHBOARD)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-light">Choose Your Guide</h1>
                        <p className="text-white/60 text-sm">Select a voice for your meditation sessions</p>
                    </div>
                </div>

                {/* Voice Cards */}
                <div className="space-y-4 mb-8">
                    {VOICES.map((voice) => (
                        <motion.div
                            key={voice.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                relative p-5 rounded-2xl cursor-pointer transition-all
                ${selectedVoice === voice.id
                                    ? 'bg-indigo-600/30 border-2 border-indigo-400'
                                    : 'bg-white/5 border-2 border-transparent hover:bg-white/10'}
              `}
                            onClick={() => handleSelectVoice(voice.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${selectedVoice === voice.id ? 'bg-indigo-500' : 'bg-white/10'}
                    `}>
                                            <Volume2 size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{voice.name}</h3>
                                            <p className="text-sm text-white/50">{voice.description}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Play Preview Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            playPreview(voice);
                                        }}
                                        disabled={loadingVoice === voice.id}
                                        className={`
                      p-3 rounded-full transition-all
                      ${playingVoice === voice.id
                                                ? 'bg-indigo-500 text-white'
                                                : 'bg-white/10 hover:bg-white/20'}
                      ${loadingVoice === voice.id ? 'animate-pulse' : ''}
                    `}
                                    >
                                        {loadingVoice === voice.id ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : playingVoice === voice.id ? (
                                            <Pause size={20} />
                                        ) : (
                                            <Play size={20} />
                                        )}
                                    </button>

                                    {/* Selected Indicator */}
                                    {selectedVoice === voice.id && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center"
                                        >
                                            <Check size={16} />
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-medium"
                >
                    Save Selection
                </button>

                <p className="text-center text-white/40 text-xs mt-4">
                    Your guide will narrate all meditation sessions
                </p>
            </motion.div>
        </div>
    );
};

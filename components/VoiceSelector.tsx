import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Check, Volume2, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';

// Voice configuration with STATIC pre-recorded audio files
const VOICES = [
    {
        id: 'ac7df359',
        name: 'James',
        description: 'Calm, measured male voice',
        audioFile: '/audio/voices/james.wav'
    },
    {
        id: '018dc07a',
        name: 'Thomas',
        description: 'Deep, resonant male voice',
        audioFile: '/audio/voices/thomas.wav'
    },
    {
        id: '7213a9ea',
        name: 'Sarah',
        description: 'Gentle, soothing female voice',
        audioFile: '/audio/voices/sarah.wav'
    },
    {
        id: '38a0b764',
        name: 'Marcus',
        description: 'Warm, grounded male voice',
        audioFile: '/audio/voices/marcus.wav'
    }
];

export const VoiceSelector: React.FC = () => {
    const { setView } = useApp();
    const [selectedVoice, setSelectedVoice] = useState(
        localStorage.getItem('insight_voice_id') || VOICES[0].id
    );
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const playPreview = (voice: typeof VOICES[0]) => {
        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        if (playingVoice === voice.id) {
            setPlayingVoice(null);
            audioRef.current = null;
            return;
        }

        // Play static file - no API call, instant
        const audio = new Audio(voice.audioFile);
        audioRef.current = audio;

        audio.onended = () => setPlayingVoice(null);
        audio.onerror = () => setPlayingVoice(null);
        audio.onplay = () => setPlayingVoice(voice.id);
        audio.play();
    };

    const handleSelectVoice = (voiceId: string) => {
        setSelectedVoice(voiceId);
        localStorage.setItem('insight_voice_id', voiceId);
    };

    const handleDone = () => {
        // Stop audio if playing
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
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
                        <p className="text-white/40 text-sm">Select a voice for your meditation sessions</p>
                    </div>
                </div>

                {/* Voice Cards */}
                <div className="space-y-3 mb-8">
                    {VOICES.map((voice) => (
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
                                        className={`
                                            p-2.5 rounded-full transition-all
                                            ${playingVoice === voice.id
                                                ? 'bg-primary text-white'
                                                : 'bg-white/10 hover:bg-white/20'}
                                        `}
                                    >
                                        {playingVoice === voice.id ? (
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
                    ))}
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

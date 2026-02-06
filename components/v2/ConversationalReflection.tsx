/**
 * ConversationalReflection - Voice-based post-session reflection UI
 * 
 * Features:
 * - Minimal, focused interface
 * - Hold-to-talk button for voice input
 * - Real-time AI response display
 * - Waveform visualization during speech
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Loader2, Volume2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useConversationalReflection } from '../../services/useConversationalReflection';
import { ViewState } from '../../types';

export const ConversationalReflection: React.FC = () => {
    const { setView } = useApp();
    const {
        isActive,
        isListening,
        isSpeaking,
        isProcessing,
        currentMessage,
        transcript,
        exchangeCount,
        start,
        end,
        startListening,
        stopListening,
    } = useConversationalReflection();

    // Auto-start on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            start();
        }, 500);
        return () => clearTimeout(timer);
    }, [start]);

    const handleClose = async () => {
        await end();
        setView(ViewState.SESSION_SUMMARY);
    };

    // Handle hold-to-talk
    const handlePointerDown = () => {
        if (!isSpeaking && !isProcessing) {
            startListening();
        }
    };

    const handlePointerUp = () => {
        if (isListening) {
            stopListening();
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                        Reflection
                    </span>
                </div>
                <button
                    onClick={handleClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                    <X className="w-5 h-5 text-white/60" />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-8">
                {/* AI Message Bubble */}
                <AnimatePresence mode="wait">
                    {currentMessage && (
                        <motion.div
                            key={currentMessage}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-sm mb-12"
                        >
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                                <p className="text-white/90 text-lg leading-relaxed">
                                    {currentMessage}
                                </p>
                            </div>
                            {isSpeaking && (
                                <div className="flex items-center gap-2 mt-3 justify-center">
                                    <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
                                    <span className="text-xs text-white/40">Speaking...</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* User Transcript Preview */}
                <AnimatePresence>
                    {isListening && transcript && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-40 left-0 right-0 px-8"
                        >
                            <div className="max-w-sm mx-auto">
                                <p className="text-white/60 text-sm text-center italic">
                                    "{transcript}"
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Processing Indicator */}
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 mb-8"
                    >
                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                        <span className="text-sm text-white/50">Thinking...</span>
                    </motion.div>
                )}
            </main>

            {/* Hold-to-Talk Button */}
            <footer className="pb-12 pt-6 px-8">
                <div className="flex flex-col items-center gap-4">
                    <motion.button
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        disabled={isSpeaking || isProcessing}
                        whileHover={{ scale: isSpeaking || isProcessing ? 1 : 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                            w-20 h-20 rounded-full flex items-center justify-center transition-all
                            ${isListening
                                ? 'bg-red-500 ring-4 ring-red-500/30'
                                : isSpeaking || isProcessing
                                    ? 'bg-white/10 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500'}
                        `}
                    >
                        {isListening ? (
                            <Mic className="w-8 h-8 text-white animate-pulse" />
                        ) : (
                            <MicOff className="w-8 h-8 text-white/60" />
                        )}
                    </motion.button>

                    <p className="text-xs text-white/40 text-center">
                        {isSpeaking
                            ? 'Listening to response...'
                            : isProcessing
                                ? 'Processing...'
                                : isListening
                                    ? 'Release to send'
                                    : 'Hold to speak'}
                    </p>

                    {/* Exchange counter */}
                    {exchangeCount > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                            {Array.from({ length: Math.min(exchangeCount, 5) }).map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                                />
                            ))}
                            {Array.from({ length: Math.max(0, 5 - exchangeCount) }).map((_, i) => (
                                <div
                                    key={i + exchangeCount}
                                    className="w-1.5 h-1.5 rounded-full bg-white/20"
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* End session hint after enough exchanges */}
                {exchangeCount >= 3 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mt-6"
                    >
                        <button
                            onClick={handleClose}
                            className="text-sm text-white/40 hover:text-white/60 underline transition-colors"
                        >
                            Ready to wrap up?
                        </button>
                    </motion.div>
                )}
            </footer>
        </div>
    );
};

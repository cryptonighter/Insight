/**
 * ConversationalCheckIn - Voice-first experience selection
 * 
 * Default entry point for the app. User speaks how they're feeling,
 * AI suggests the best experience, user confirms or adjusts.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Check, ChevronDown, ChevronUp, LayoutGrid, Loader2 } from 'lucide-react';
import { useCheckIn } from '../../services/useCheckIn';
import { THEMES } from '../../services/insightService';

export const ConversationalCheckIn: React.FC = () => {
    const {
        isActive,
        isListening,
        isSpeaking,
        isProcessing,
        transcript,
        state,
        start,
        startListening,
        stopListening,
        confirm,
        skip,
        adjustDuration
    } = useCheckIn();

    // Auto-start on mount
    useEffect(() => {
        const timer = setTimeout(() => start(), 500);
        return () => clearTimeout(timer);
    }, [start]);

    const theme = THEMES.find(t => t.id === state.suggestedTheme);

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                        Check-In
                    </span>
                </div>
                <button
                    onClick={skip}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-white/70"
                >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Quick Select</span>
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-8">
                {/* AI Message */}
                <AnimatePresence mode="wait">
                    {state.currentMessage && (
                        <motion.div
                            key={state.currentMessage}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-sm mb-8"
                        >
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                                <p className="text-white/90 text-lg leading-relaxed">
                                    {state.currentMessage}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Suggestion Card */}
                {state.phase === 'suggesting' && theme && !isSpeaking && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/5 rounded-2xl p-6 border border-white/10 max-w-sm w-full mb-8"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">{theme.emoji}</span>
                            <div>
                                <h3 className="text-lg font-semibold text-white">{theme.uxLabel}</h3>
                                <p className="text-sm text-white/60">{theme.description}</p>
                            </div>
                        </div>

                        {/* Duration Adjuster */}
                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 mb-4">
                            <span className="text-sm text-white/60">Duration</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => adjustDuration(-5)}
                                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20"
                                >
                                    <ChevronDown className="w-5 h-5 text-white/70" />
                                </button>
                                <span className="text-xl font-semibold text-white w-16 text-center">
                                    {state.suggestedDuration} min
                                </span>
                                <button
                                    onClick={() => adjustDuration(5)}
                                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20"
                                >
                                    <ChevronUp className="w-5 h-5 text-white/70" />
                                </button>
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <button
                            onClick={confirm}
                            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <Check className="w-5 h-5" />
                            Start Session
                        </button>
                    </motion.div>
                )}

                {/* Transcript Preview */}
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

                {/* Processing */}
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
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
                        onPointerDown={startListening}
                        onPointerUp={stopListening}
                        onPointerLeave={stopListening}
                        disabled={isSpeaking || isProcessing || state.phase === 'confirmed'}
                        whileHover={{ scale: 1.05 }}
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
                            ? 'Listening...'
                            : isProcessing
                                ? 'Processing...'
                                : isListening
                                    ? 'Release to send'
                                    : 'Hold to speak'}
                    </p>
                </div>
            </footer>
        </div>
    );
};

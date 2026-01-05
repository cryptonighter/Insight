import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ViewState } from '../../types';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Send, MessageSquare } from 'lucide-react';

const POSITIVE_TAGS = [
    "Perfect Pacing", "Voice Tone", "Music Sync",
    "Insightful", "Soothing", "Empowering",
    "Deep Focus", "Good Flow"
];

const NEGATIVE_TAGS = [
    "Too Fast", "Too Slow", "Distracting BG",
    "Voice Glitch", "Generic", "Confusing",
    "Abrupt End", "Low Energy"
];

export const FeedbackV2: React.FC = () => {
    const { setView, rateMeditation, activeMeditationId, completeEveningReflection, meditations } = useApp();
    const [selectedPositive, setSelectedPositive] = useState<string[]>([]);
    const [selectedNegative, setSelectedNegative] = useState<string[]>([]);
    const [customNote, setCustomNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleTag = (tag: string, type: 'POS' | 'NEG') => {
        if (type === 'POS') {
            setSelectedPositive(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
        } else {
            setSelectedNegative(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
        }
    };

    const handleSubmit = async () => {
        if (!activeMeditationId) return;
        setIsSubmitting(true);

        // Simple aggregate score logic for back-compat
        // If mostly positive, high score. If negative, low.
        const score = selectedNegative.length > 0 ? 3 : 5;

        // 1. Submit Feedback to DB
        await rateMeditation(activeMeditationId, {
            pacing: 5, // Legacy
            voice: 5, // Legacy
            immersion: score,
            note: {
                positive: selectedPositive,
                negative: selectedNegative,
                custom: customNote
            }
        });

        // 2. Complete Session Lifecycle (Grants tokens, updates Context for Summary View)
        const meditation = meditations.find(m => m.id === activeMeditationId);
        await completeEveningReflection(
            customNote || "Session completed successfully.",
            meditation?.transcript
        );

        // Note: completeEveningReflection handles routing to SESSION_SUMMARY
    };

    return (
        <div className="flex flex-col h-full bg-background-dark p-6 font-mono text-white overflow-y-auto">
            <header className="mb-8">
                <h1 className="text-xl font-bold text-primary mb-2 uppercase tracking-widest">System Diagnostic</h1>
                <p className="text-xs text-white/50">Help us calibrate the generator.</p>
            </header>

            <div className="space-y-8 flex-1">

                {/* POSITIVE CLOUD */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                        <ThumbsUp size={16} />
                        <span className="text-xs uppercase tracking-wider font-bold">Resonances (Good)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {POSITIVE_TAGS.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag, 'POS')}
                                className={`px-3 py-2 text-[10px] uppercase tracking-wider border transition-all ${selectedPositive.includes(tag)
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                    : 'bg-black/30 border-white/10 text-white/40 hover:border-emerald-500/50'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </section>

                {/* NEGATIVE CLOUD */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-red-400">
                        <ThumbsDown size={16} />
                        <span className="text-xs uppercase tracking-wider font-bold">Dissonance (Issues)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {NEGATIVE_TAGS.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag, 'NEG')}
                                className={`px-3 py-2 text-[10px] uppercase tracking-wider border transition-all ${selectedNegative.includes(tag)
                                    ? 'bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                    : 'bg-black/30 border-white/10 text-white/40 hover:border-red-500/50'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </section>

                {/* CUSTOM NOTE */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-primary">
                        <MessageSquare size={16} />
                        <span className="text-xs uppercase tracking-wider font-bold">Custom Report</span>
                    </div>
                    <textarea
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Detailed observations on generation quality..."
                        className="w-full h-24 bg-black/40 border border-white/10 p-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 resize-none"
                    />
                </section>

            </div>

            <footer className="pt-6">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="group w-full bg-primary text-black font-bold h-14 hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm relative overflow-hidden"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        {isSubmitting ? 'Transmitting...' : 'Submit Diagnostics'}
                        {!isSubmitting && <Send size={14} />}
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
            </footer>
        </div>
    );
};

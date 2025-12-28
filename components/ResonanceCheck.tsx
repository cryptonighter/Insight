import React, { useState } from 'react';
import { Heart, ThumbsUp, ThumbsDown, Sparkles, Send, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ResonanceCheckProps {
    onClose: () => void;
    sessionTitle: string;
}

export const ResonanceCheck: React.FC<ResonanceCheckProps> = ({ onClose, sessionTitle }) => {
    const { saveSessionResults } = useApp();
    const [resonance, setResonance] = useState<number | null>(null);
    const [feedback, setFeedback] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async () => {
        // Map resonance 1-5 to a 0-10 SUDS shift proxy or just Qualitative
        // For now, saveSessionResults takes (sudsAfter, insight)
        // We'll treat resonance as 10 - suds (5 -> 0 suds, 1 -> 8 suds)
        const sudsAfter = resonance ? (5 - resonance) * 2 : 5;
        await saveSessionResults(sudsAfter, feedback);
        setIsSubmitted(true);
        setTimeout(onClose, 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white/90 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm relative overflow-hidden">

                {isSubmitted ? (
                    <div className="text-center py-10 space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-2">
                            <Sparkles size={32} />
                        </div>
                        <h2 className="text-2xl font-light text-slate-800 tracking-tight">Integrated</h2>
                        <p className="text-slate-500 text-sm">Your feedback helps refine the Director's intuition.</p>
                    </div>
                ) : (
                    <>
                        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>

                        <div className="mb-8 text-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2 block">Resonance Check</span>
                            <h2 className="text-xl font-light text-slate-800 leading-tight">How did "{sessionTitle}" land for you?</h2>
                        </div>

                        <div className="flex justify-between items-center mb-10 px-2">
                            {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setResonance(val)}
                                    className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                        ${resonance === val
                                            ? 'bg-indigo-600 text-white scale-125 shadow-lg shadow-indigo-600/30'
                                            : 'bg-white text-slate-400 hover:bg-indigo-50/50 border border-slate-100'}
                    `}
                                >
                                    {val === 5 ? <Heart size={20} fill={resonance === 5 ? "currentColor" : "none"} /> : <span className="font-semibold">{val}</span>}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Any words on what resonated?"
                                    className="w-full bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 min-h-[100px] resize-none transition-all"
                                />
                            </div>

                            <button
                                disabled={resonance === null}
                                onClick={handleSubmit}
                                className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed text-white py-4 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Send size={18} />
                                <span>Send to Director</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

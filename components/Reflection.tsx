import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';
import { motion } from 'framer-motion';
import { Save, ArrowRight, Heart, Sparkles } from 'lucide-react';

export const Reflection: React.FC = () => {
    const { activeMeditationId, meditations, setView, triage, saveSessionResults } = useApp();
    const meditation = meditations.find(m => m.id === activeMeditationId);

    const [sudsAfter, setSudsAfter] = useState(3); // 1-10
    const [reflectionText, setReflectionText] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleComplete = async () => {
        setIsSaving(true);
        try {
            await saveSessionResults(sudsAfter, reflectionText);
            setView(ViewState.HOME);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 app-text-primary">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-12"
            >
                <div className="text-center space-y-4">
                    <div className="inline-flex p-3 bg-indigo-50 rounded-full text-indigo-500 mb-2">
                        <Heart size={24} />
                    </div>
                    <h1 className="text-3xl font-light text-slate-800">Integration</h1>
                    <p className="text-slate-500 font-light">The session has ended, but the resonance remains. <br />Take a moment to check in.</p>
                </div>

                <div className="space-y-10">
                    {/* SUDS Scale */}
                    <div className="space-y-6">
                        <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400 block text-center">Current Intensity (1-10)</label>
                        <div className="flex justify-between items-end h-12 gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                                <button
                                    key={level}
                                    onClick={() => setSudsAfter(level)}
                                    className={`flex-1 transition-all rounded-t-sm ${sudsAfter === level
                                        ? 'bg-indigo-500 h-full'
                                        : 'bg-indigo-100 hover:bg-indigo-200'
                                        }`}
                                    style={{ height: `${20 + (level * 8)}%` }}
                                />
                            ))}
                        </div>
                        <p className="text-center text-xs text-indigo-400 font-medium">
                            {sudsAfter <= 3 ? "Calm & Integrated" : sudsAfter <= 7 ? "Processing" : "Significant Intensity"}
                        </p>
                    </div>

                    {/* Qualitative Reflection */}
                    <div className="space-y-4">
                        <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400 block">Capture one insight</label>
                        <textarea
                            value={reflectionText}
                            onChange={(e) => setReflectionText(e.target.value)}
                            className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-6 text-slate-700 font-light focus:outline-none focus:ring-1 focus:ring-indigo-200 transition-all placeholder:text-slate-300"
                            placeholder="What shifted for you?"
                        />
                    </div>
                </div>

                <button
                    onClick={handleComplete}
                    disabled={isSaving}
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-medium tracking-wide flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                    {isSaving ? "Syncing to Memory..." : (
                        <>
                            <span>Seal Session</span>
                            <Save size={18} />
                        </>
                    )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-slate-300 py-4 border-t border-slate-100">
                    <Sparkles size={10} />
                    Protocol: {triage.selectedMethodology || 'General'} Complete
                </div>
            </motion.div>
        </div>
    );
};

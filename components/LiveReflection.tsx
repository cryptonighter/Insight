import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';
import { supabase } from '../services/supabaseClient';
import { Mic, MicOff, StopCircle, X, Keyboard, Send, Loader2, Sparkles } from 'lucide-react';

// Initialize API Keys
// In Vite, we prefer VITE_ prefix. We also allow direct process.env for custom builders.
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY ||
    "AIzaSyBx3c6VF9JnL-Qbc1rQKbAL-PHBA5anfys"; // Local Fallback

const HOST = "generativelanguage.googleapis.com";
const MODEL = "models/gemini-2.0-flash-exp";

import { useVoiceReflection } from '../services/useVoiceReflection';

export const LiveReflection: React.FC = () => {
    const { setView, completeEveningReflection, activeResolution, user } = useApp();
    const [mode, setMode] = useState<'voice' | 'text'>('voice');
    const [textInput, setTextInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        isConnected,
        isTalking,
        isWrappingUp,
        connect,
        disconnect,
        handleEndSession
    } = useVoiceReflection();

    useEffect(() => {
        return () => disconnect();
    }, [disconnect]);

    const toggleMode = () => {
        if (mode === 'voice') {
            disconnect();
            setMode('text');
        } else {
            setMode('voice');
        }
    };

    const handleTextSubmit = async () => {
        if (!textInput.trim()) return;
        setIsSubmitting(true);
        await new Promise(r => setTimeout(r, 800));
        await completeEveningReflection(textInput, textInput);
        setView(ViewState.DASHBOARD);
    };

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 animate-fade-in text-white p-6">
            <button onClick={() => { disconnect(); setView(ViewState.DASHBOARD); }} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <X />
            </button>

            {/* Mode Switcher */}
            <div className="absolute top-6 left-6 flex bg-slate-800 rounded-full p-1 border border-slate-700">
                <button
                    onClick={() => mode !== 'voice' && toggleMode()}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${mode === 'voice' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Mic size={14} /> Voice
                </button>
                <button
                    onClick={() => mode !== 'text' && toggleMode()}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${mode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Keyboard size={14} /> Text
                </button>
            </div>

            {mode === 'voice' ? (
                <>
                    <h2 className="text-2xl font-light text-white mb-2 tracking-wide">Evening Protocol</h2>
                    <p className="text-slate-500 mb-12 text-sm uppercase tracking-widest">{isConnected ? (isWrappingUp ? "GENERATING INSIGHT..." : "RECORDING") : "READY TO CONNECT"}</p>

                    <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 mb-12 relative ${isTalking ? 'bg-indigo-500/20 shadow-[0_0_80px_rgba(99,102,241,0.4)]' : 'bg-slate-800'}`}>
                        {/* Pulse Ring */}
                        {isTalking && <div className="absolute inset-0 rounded-full border border-indigo-500/50 animate-ping opacity-20" />}

                        {isConnected ? <Mic size={48} className={`transition-colors duration-300 ${isTalking ? "text-indigo-400" : "text-white"}`} /> : <MicOff size={48} className="text-slate-600" />}
                    </div>

                    {!isConnected && (
                        <button onClick={connect} className="px-10 py-4 bg-white text-slate-900 rounded-full font-medium transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                            Begin Debrief
                        </button>
                    )}

                    {isConnected && (
                        <div className="flex flex-col gap-4 items-center animate-fade-in">
                            <button
                                onClick={handleEndSession}
                                disabled={isWrappingUp}
                                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-full font-medium transition-all flex items-center gap-2 group"
                            >
                                {isWrappingUp ? <Loader2 className="animate-spin" size={18} /> :
                                    (isTalking ? <StopCircle size={18} className="text-red-400 group-hover:text-red-300" /> : <Sparkles size={18} />)
                                }
                                {isWrappingUp ? "Processing Insight..." : "Complete Session"}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="w-full max-w-md animate-fade-in">
                    <h2 className="text-2xl font-light text-white mb-6">Evening Reflection</h2>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2 block">How was your progress today?</label>
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="I made progress by..."
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 min-h-[150px] mb-4 outline-none focus:border-indigo-500 transition-colors resize-none"
                            autoFocus
                        />
                        <button
                            onClick={handleTextSubmit}
                            disabled={!textInput.trim() || isSubmitting}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <span className="animate-pulse">Saving...</span> : <>Complete & Earn Token <Send size={16} /></>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

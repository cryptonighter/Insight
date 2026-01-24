import React, { useMemo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';
import { Settings, History, ChevronRight, Zap, Activity } from 'lucide-react';
import { ViewState } from '../../types';

export const DashboardV2: React.FC = () => {
    const { userEconomy, activeResolution, startMorningSession, setView, todaysEntry, isLoading, setPendingMeditationConfig } = useApp();
    const [intentionInput, setIntentionInput] = useState('');

    const daysProgress = useMemo(() => {
        if (!activeResolution?.createdAt) return 0;
        const now = Date.now();
        const start = new Date(activeResolution.createdAt).getTime();
        const diff = now - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }, [activeResolution?.createdAt]);

    // FIRST RUN: If no active resolution, force flow to creation
    useEffect(() => {
        // Redirection Logic for First Run
        // Only redirect if we are NOT loading and still found no active resolution
        if (!isLoading && !activeResolution) {
            // Check if they are brand new (no tokens/economy set up)
            // We use 'lastDailyGrant' as a proxy for "has ever initialized"
            if (!userEconomy.lastDailyGrant) {
                setView(ViewState.ONBOARDING);
            } else {
                setView(ViewState.NEW_RESOLUTION);
            }
        }
    }, [activeResolution, setView, userEconomy, isLoading]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-dark text-primary">
                <Activity className="animate-spin w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-y-auto overflow-x-hidden bg-background-light dark:bg-background-dark transition-colors duration-300">
            {/* Background Effects */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-30"></div>

            <header className="relative z-10 flex items-center justify-between px-6 pt-12 pb-2 w-full shrink-0">
                <button
                    onClick={() => setView(ViewState.TRIAGE)} // Placeholder for settings
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <Settings className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 uppercase">Available Capital</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-primary tracking-widest">{userEconomy.balance} TOKENS</span>
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#4ade80]"></div>
                    </div>
                </div>
                <button
                    onClick={() => setView(ViewState.ADMIN)} // Placeholder for history
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <History className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 w-full max-w-md mx-auto pointer-events-none">
                {/* Active Protocol Display */}
                {activeResolution && (
                    <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-1000 slide-in-from-bottom-5">
                        <div className="flex items-center gap-2 mb-3 opacity-60">
                            <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                            <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">Current Directive</span>
                            <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-white/90 tracking-tight leading-normal max-w-xs text-glow-sm">
                            {activeResolution.statement}
                        </h1>
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent mt-6"></div>
                    </div>
                )}

                {/* Quick Theme Selection */}
                <div className="w-full max-w-sm mt-8 pointer-events-auto">
                    <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-3 text-center">
                        Today's focus
                    </label>
                    <div className="flex flex-wrap justify-center gap-2">
                        {[
                            { label: '🧘 Calm', value: 'Finding calm and peace' },
                            { label: '💪 Energy', value: 'Boosting energy and motivation' },
                            { label: '😴 Sleep', value: 'Better sleep and rest' },
                            { label: '🎯 Focus', value: 'Deep focus and clarity' },
                            { label: '💭 Stress', value: 'Releasing stress and tension' },
                            { label: '✨ Custom', value: '' }
                        ].map(theme => (
                            <button
                                key={theme.label}
                                onClick={() => setIntentionInput(theme.value)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${intentionInput === theme.value
                                    ? 'bg-primary/20 border-primary text-primary border'
                                    : 'bg-surface/50 border-white/10 text-white/70 border hover:border-white/30'
                                    }`}
                            >
                                {theme.label}
                            </button>
                        ))}
                    </div>
                    {intentionInput === '' && (
                        <input
                            type="text"
                            value=""
                            onChange={(e) => setIntentionInput(e.target.value)}
                            placeholder="Type your own intention..."
                            className="w-full mt-3 bg-surface/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:outline-none transition-colors text-center"
                        />
                    )}
                </div>
            </main>

            <footer className="relative z-10 w-full px-6 pb-8 pt-2 bg-gradient-to-t from-background-dark via-background-dark to-transparent shrink-0">
                <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
                    <motion.button
                        onClick={() => {
                            if (todaysEntry?.morningGenerated && !todaysEntry?.eveningCompleted) {
                                setView(ViewState.EVENING_REFLECTION);
                            } else {
                                // Navigate to pre-session prep screen for guided setup
                                setView(ViewState.SESSION_PREP);
                            }
                        }}
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="relative group w-64 h-64 rounded-full transition-all duration-500 overflow-hidden flex flex-col items-center justify-center bg-surface border border-primary/30 hover:border-primary/60 shadow-[0_0_20px_rgba(74,222,128,0.1)] hover:shadow-[0_0_40px_rgba(74,222,128,0.2)] cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute inset-0 rounded-full border border-white/5 scale-95 pointer-events-none"></div>

                        {/* Centered Content */}
                        <div className="flex flex-col items-center justify-center z-10">
                            <span className="text-5xl font-bold tracking-tight text-white group-hover:text-primary transition-colors duration-300 leading-none">START</span>
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 group-hover:text-white/80 transition-colors mt-3 max-w-[140px] text-center leading-relaxed">
                                {todaysEntry?.morningGenerated ? "Evening\nReflection" : "Alignment\nSession"}
                            </span>
                        </div>
                    </motion.button>
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <div className="flex items-center gap-2 opacity-60">
                            <Zap className="w-4 h-4 text-primary" />
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">
                                {todaysEntry?.morningGenerated ? "Earn: 1 Token" : "Cost: 1 Token"}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Dev Grant */}
                            <button
                                onClick={async () => {
                                    const code = prompt("Enter Admin Access Code:");
                                    if (code === "insight") {
                                        if (userEconomy.userId) {
                                            await supabase.from('user_economy').update({ balance: userEconomy.balance + 100 }).eq('user_id', userEconomy.userId);
                                            window.location.reload();
                                        }
                                    } else if (code) {
                                        alert("Invalid Access Code");
                                    }
                                }}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-xs text-white hover:bg-primary hover:text-black transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

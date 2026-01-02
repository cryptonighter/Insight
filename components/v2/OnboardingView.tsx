
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ViewState } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Key, Sparkles } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export const OnboardingView: React.FC = () => {
    const { setView, user } = useApp();
    const [accessCode, setAccessCode] = useState("");
    const [error, setError] = useState("");
    const [step, setStep] = useState<'AUTH' | 'INTRO'>('AUTH');
    const [isLoading, setIsLoading] = useState(false);

    const handleAccess = async () => {
        setIsLoading(true);
        setError("");

        // 1. Validate Code
        if (accessCode.toLowerCase().trim() !== "insight") {
            await new Promise(r => setTimeout(r, 800)); // Fake network delay for realism
            setError("Invalid Access Key");
            setIsLoading(false);
            return;
        }

        // 2. Grant Tokens / Init Economy
        if (user.supabaseId) {
            try {
                // Check if economy exists
                const { data: existing } = await supabase.from('user_economy').select('*').eq('user_id', user.supabaseId).maybeSingle();

                if (!existing) {
                    // Create new economy with Welcome Bonus
                    const { error: insertError } = await supabase.from('user_economy').insert({
                        user_id: user.supabaseId,
                        balance: 50, // Welcome Bonus
                        last_daily_grant: new Date().toISOString()
                    });
                    if (insertError) throw insertError;
                } else {
                    // Maybe top up if they are re-onboarding? Or just proceed.
                    // Let's ensure they have at least 50
                    if (existing.balance < 50) {
                        await supabase.from('user_economy').update({ balance: 50 }).eq('user_id', user.supabaseId);
                    }
                }

                // Success - Move to Intro
                setStep('INTRO');
            } catch (err) {
                console.error("Onboarding Error:", err);
                setError("Connection Failed. Try again.");
            }
        }
        setIsLoading(false);
    };

    return (
        <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-background-dark font-display max-w-md mx-auto shadow-2xl">
            {/* Background Ambience */}
            <div className="fixed top-0 left-0 w-full h-full bg-grid-pattern opacity-10 pointer-events-none"></div>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none animate-pulse-slow"></div>

            <AnimatePresence mode="wait">
                {step === 'AUTH' ? (
                    <motion.div
                        key="auth"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, filter: 'blur(10px)' }}
                        className="flex-1 flex flex-col items-center justify-center p-8 z-10"
                    >
                        <div className="mb-12 relative">
                            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full animate-pulse"></div>
                            <Key className="w-12 h-12 text-white relative z-10" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Insight Engine</h1>
                        <p className="text-white/40 text-sm mb-12 tracking-widest uppercase">Restricted Access</p>

                        <div className="w-full max-w-xs space-y-4">
                            <input
                                type="text"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                                placeholder="Enter Access Code"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-mono tracking-widest"
                                autoFocus
                            />

                            {error && (
                                <p className="text-red-400 text-xs text-center animate-shake">{error}</p>
                            )}

                            <button
                                onClick={handleAccess}
                                disabled={!accessCode || isLoading}
                                className="w-full bg-white text-black font-bold h-14 rounded-xl hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Initialize</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="intro"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                        className="flex-1 flex flex-col items-center justify-center p-8 z-10 text-center"
                    >
                        <div className="max-w-xs space-y-8">
                            <Sparkles className="w-8 h-8 text-primary mx-auto animate-spin-slow" />

                            <div className="space-y-6">
                                <h2 className="text-3xl font-bold text-white leading-tight">
                                    Welcome to the <span className="text-primary text-glow">Event Horizon</span>.
                                </h2>
                                <p className="text-white/70 leading-relaxed text-lg font-light">
                                    You have been granted <strong className="text-white">50 Tokens</strong>.
                                </p>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    This engine uses advanced psycholinguistics and neuro-audio to align your subconscious with your conscious intent.
                                </p>
                            </div>

                            <button
                                onClick={() => setView(ViewState.NEW_RESOLUTION)}
                                className="w-full bg-primary text-background-dark font-bold h-14 rounded-xl hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 flex items-center justify-center gap-2 mt-8"
                            >
                                <span>Design Your Reality</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

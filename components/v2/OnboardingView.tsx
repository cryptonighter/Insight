
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
            setError("Invalid Administrative Key");
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
        <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-black font-mono max-w-md mx-auto shadow-2xl border-x border-primary/20">
            {/* Background Ambience */}
            <div className="fixed top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none animate-pulse-slow"></div>

            <AnimatePresence mode="wait">
                {step === 'AUTH' ? (
                    <motion.div
                        key="auth"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, filter: 'blur(10px)' }}
                        className="flex-1 flex flex-col items-center justify-center p-8 z-10"
                    >
                        <div className="mb-12 relative group">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse group-hover:bg-primary/40 transition-all"></div>
                            <div className="relative w-24 h-24 border border-primary/30 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                <Key className="w-10 h-10 text-primary" />
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-primary mb-2 tracking-tighter uppercase glitch-text">Insight Engine</h1>
                        <p className="text-primary/50 text-xs mb-12 tracking-[0.3em] uppercase">Restricted Access // v2.0</p>

                        <div className="w-full max-w-xs space-y-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    placeholder="ENTER ACCESS KEY"
                                    className="w-full bg-black border border-primary/30 rounded-none p-4 text-center text-primary placeholder:text-primary/20 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(74,222,128,0.3)] transition-all font-mono tracking-widest uppercase text-lg"
                                    autoFocus
                                />
                                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary"></div>
                                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary"></div>
                            </div>

                            {error && (
                                <p className="text-red-500 text-xs text-center animate-shake font-bold bg-red-900/10 p-2 border border-red-500/20">{error}</p>
                            )}

                            <button
                                onClick={handleAccess}
                                disabled={!accessCode || isLoading}
                                className="group w-full bg-primary text-black font-bold h-14 hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm relative overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {isLoading ? 'Decrypting...' : 'Initialize System'}
                                    {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                </span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
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
                        <div className="max-w-md space-y-12">
                            <Sparkles className="w-12 h-12 text-primary mx-auto animate-spin-slow" />

                            <div className="space-y-8">
                                <h2 className="text-4xl font-bold text-white leading-none tracking-tighter">
                                    ACCESS <span className="text-primary text-glow">GRANTED</span>
                                </h2>

                                <div className="h-px w-24 bg-primary/30 mx-auto"></div>

                                <p className="text-primary/80 leading-relaxed text-lg font-mono">
                                    > Welcome to the Event Horizon.<br />
                                    > <span className="text-white font-bold">50 TOKENS</span> transferred.<br />
                                    > Reality Architecture initialized.
                                </p>
                            </div>

                            <button
                                onClick={() => setView(ViewState.NEW_RESOLUTION)}
                                className="w-full bg-transparent border border-primary text-primary font-bold h-16 hover:bg-primary hover:text-black transition-all shadow-[0_0_20px_rgba(74,222,128,0.1)] hover:shadow-[0_0_40px_rgba(74,222,128,0.4)] flex items-center justify-center gap-3 uppercase tracking-[0.2em] group"
                            >
                                <span>Design Your Reality</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ViewState } from '../../types';
import { ChevronRight, Target, Zap, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { cn } from '@/utils';

export const NewResolutionV2: React.FC = () => {
    const { setView, createNewResolution, userEconomy } = useApp();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [statement, setStatement] = useState("");
    const [motivation, setMotivation] = useState("");
    const [feeling, setFeeling] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNext = () => {
        if (step === 1 && statement.trim()) setStep(2);
        else if (step === 2 && motivation.trim()) setStep(3);
        else if (step === 3 && feeling.trim()) handleSubmit();
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Combine Motivation and Feeling for storage
            const combinedWhy = `WHY: ${motivation}\n\nSTATE: ${feeling}`;
            await createNewResolution(statement, combinedWhy);
            // Show Success State
            setStep(4);

            // Wait for user to absorb the success before redirecting
            setTimeout(() => {
                setView(ViewState.DASHBOARD);
            }, 4000);
        } catch (error) {
            console.error("Failed to create resolution:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-[100dvh] w-full flex-col overflow-y-auto bg-background-dark font-display max-w-md mx-auto shadow-2xl pb-32">
            {/* Background Ambience */}
            <div className="fixed top-0 left-0 w-full h-full bg-grid-pattern opacity-20 pointer-events-none"></div>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header */}
            <header className="relative z-20 flex items-center justify-between p-6 pt-8 shrink-0">
                <button
                    onClick={() => step === 1 ? setView(ViewState.DASHBOARD) : setStep(prev => (prev - 1) as any)}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">New Objective</span>
                    <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                        <span className="text-[10px] font-bold text-primary tracking-widest">COST: 5 TOKENS</span>
                    </div>
                </div>
                <div className="w-10"></div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col px-6 pt-4 relative z-10">
                {/* Progress Indicator */}
                <div className="flex gap-2 mb-8">
                    <div className={cn("h-1 flex-1 rounded-full transition-colors duration-500", step >= 1 ? "bg-primary shadow-[0_0_8px_#4ade80]" : "bg-white/10")}></div>
                    <div className={cn("h-1 flex-1 rounded-full transition-colors duration-500", step >= 2 ? "bg-primary shadow-[0_0_8px_#4ade80]" : "bg-white/10")}></div>
                    <div className={cn("h-1 flex-1 rounded-full transition-colors duration-500", step >= 3 ? "bg-primary shadow-[0_0_8px_#4ade80]" : "bg-white/10")}></div>
                </div>

                {/* Question Block */}
                <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 my-auto">
                    {step === 4 ? (
                        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                                <div className="relative w-20 h-20 bg-background-dark rounded-full border border-primary/50 flex items-center justify-center shadow-[0_0_30px_rgba(74,222,128,0.3)]">
                                    <CheckCircle className="w-10 h-10 text-primary animate-scale-in" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3 tracking-wide">Protocol Active</h2>
                            <p className="text-white/50 text-sm tracking-widest uppercase animate-pulse">Calibrating Insight Engine...</p>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                                {step === 1
                                    ? "Define Your North Star"
                                    : step === 2
                                        ? "Identify the Fire"
                                        : "Target Frequency"}
                            </h1>

                            <p className="text-primary/60 text-sm md:text-base font-mono mb-8 leading-relaxed max-w-sm">
                                {step === 1
                                    ? "Select one meaningful objective to align your life around for this cycle."
                                    : step === 2
                                        ? "Why does this matter? Dig deeper than surface level. Connect this goal to your identity or your survival."
                                        : "When this reality is manifest, how does it feel in your body? (The somatic state you must tune to)."}
                            </p>

                            <textarea
                                key={step} // Force re-render for autofocus
                                autoFocus
                                value={step === 1 ? statement : step === 2 ? motivation : feeling}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    step === 1 ? setStatement(val) : step === 2 ? setMotivation(val) : setFeeling(val);
                                }}
                                placeholder={
                                    step === 1 ? "e.g., Launch my design studio..."
                                        : step === 2 ? "e.g., I need to prove that my creativity has value in the real world..."
                                            : "e.g., Electric, Expanded, Grounded, Unstoppable..."
                                }
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all resize-none h-40"
                            />
                        </>
                    )}
                </div>
            </main>

            {/* Footer Actions */}
            <footer className="fixed bottom-0 w-full max-w-md z-40 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent">
                <button
                    onClick={handleNext}
                    disabled={(!statement && step === 1) || (!motivation && step === 2) || (!feeling && step === 3) || isSubmitting}
                    className="group w-full h-16 rounded-2xl bg-primary text-background-dark font-bold text-sm tracking-widest uppercase hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_40px_rgba(74,222,128,0.4)] flex items-center justify-center gap-3"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                    ) : step < 3 ? (
                        <>
                            Next Step
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    ) : (
                        <>
                            Initialize Protocol
                            <CheckCircle className="w-5 h-5" />
                        </>
                    )}
                </button>
            </footer>
        </div>
    );
};

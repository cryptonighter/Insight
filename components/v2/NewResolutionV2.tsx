
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ViewState } from '../../types';
import { ChevronRight, Target, Zap, ArrowLeft, CheckCircle } from 'lucide-react';
import { cn } from '@/utils';

export const NewResolutionV2: React.FC = () => {
    const { setView, createNewResolution, userEconomy } = useApp();
    const [step, setStep] = useState<1 | 2>(1);
    const [statement, setStatement] = useState("");
    const [motivation, setMotivation] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNext = () => {
        if (step === 1 && statement.trim()) {
            setStep(2);
        } else if (step === 2 && motivation.trim()) {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await createNewResolution(statement, motivation);
            // The hook handles transition, but we can force it just in case or show a success state
        } catch (error) {
            console.error("Failed to create resolution:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background-dark font-display max-w-md mx-auto shadow-2xl">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-20 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header */}
            <header className="relative z-20 flex items-center justify-between p-6 pt-8">
                <button
                    onClick={() => step === 1 ? setView(ViewState.DASHBOARD) : setStep(1)}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">New Objective</span>
                    <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                        <span className="text-[10px] font-bold text-primary tracking-widest">COST: 100 TOKENS</span>
                    </div>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col px-6 pt-8 pb-32 relative z-10 z-[30]">
                {/* Progress Indicator */}
                <div className="flex gap-2 mb-12">
                    <div className={cn("h-1 flex-1 rounded-full transition-colors duration-500", step >= 1 ? "bg-primary shadow-[0_0_8px_#4ade80]" : "bg-white/10")}></div>
                    <div className={cn("h-1 flex-1 rounded-full transition-colors duration-500", step >= 2 ? "bg-primary shadow-[0_0_8px_#4ade80]" : "bg-white/10")}></div>
                </div>

                {/* Question Block */}
                <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6 flex items-center gap-3 text-primary">
                        {step === 1 ? <Target className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                        <span className="text-xs font-bold uppercase tracking-widest">
                            {step === 1 ? "North Star" : "The Why"}
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-8">
                        {step === 1
                            ? "What represents your primary focus right now?"
                            : "Why is this critical to achieve at this moment?"}
                    </h1>

                    <textarea
                        autoFocus
                        value={step === 1 ? statement : motivation}
                        onChange={(e) => step === 1 ? setStatement(e.target.value) : setMotivation(e.target.value)}
                        placeholder={step === 1 ? "e.g. Launch the MVP by Q3..." : "e.g. To secure the next round of funding..."}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all resize-none h-40"
                    />
                </div>
            </main>

            {/* Footer Actions */}
            <footer className="absolute bottom-0 w-full z-20 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent">
                <button
                    onClick={handleNext}
                    disabled={(!statement && step === 1) || (!motivation && step === 2) || isSubmitting}
                    className="group w-full h-16 rounded-2xl bg-primary text-background-dark font-bold text-sm tracking-widest uppercase hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_40px_rgba(74,222,128,0.4)] flex items-center justify-center gap-3"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                    ) : step === 1 ? (
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

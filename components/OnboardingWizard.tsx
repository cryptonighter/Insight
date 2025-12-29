import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Check, Sparkles, Flame, Shield, Target } from 'lucide-react';
import { ViewState } from '../types';

export const OnboardingWizard: React.FC = () => {
    const { createNewResolution, setView } = useApp();
    const [step, setStep] = useState<number>(1);

    // Form State
    const [statement, setStatement] = useState("");
    const [motivation, setMotivation] = useState("");
    const [isCommitting, setIsCommitting] = useState(false);

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        setIsCommitting(true);
        try {
            await createNewResolution(statement, motivation);
            // Ideally wait for success, then move to Dashboard
            setView(ViewState.DASHBOARD);
        } catch (e) {
            alert("Failed to create commitment. Please try again.");
            setIsCommitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-amber-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-lg z-10 relative">

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 mb-12">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-500 ${step >= i ? 'w-12 bg-indigo-500' : 'w-4 bg-slate-800'}`} />
                    ))}
                </div>

                {/* STEP 1: THE AIM */}
                {step === 1 && (
                    <div className="animate-fade-in flex flex-col gap-6">
                        <div className="mb-4">
                            <Target className="text-indigo-400 w-12 h-12 mb-4" />
                            <h1 className="text-4xl font-light tracking-tight text-white mb-2">Define Your North Star.</h1>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                Insight is not a task manager. It is a Resolution Engine.
                                Select **one** meaningful objective to align your life around for 2025.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">I Resolved To...</label>
                            <input
                                type="text"
                                value={statement}
                                onChange={e => setStatement(e.target.value)}
                                placeholder="e.g. Launch my design studio"
                                className="w-full bg-slate-800/50 border border-slate-700 focus:border-indigo-500 text-white p-6 text-xl rounded-xl transition-all placeholder-slate-600 outline-none"
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={!statement.trim()}
                            className="mt-8 self-end bg-white text-slate-900 px-8 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {/* STEP 2: THE WHY */}
                {step === 2 && (
                    <div className="animate-fade-in flex flex-col gap-6">
                        <button onClick={handleBack} className="self-start text-slate-500 hover:text-white transition-colors mb-4">← Back</button>

                        <div className="mb-4">
                            <Flame className="text-amber-500 w-12 h-12 mb-4" />
                            <h1 className="text-4xl font-light tracking-tight text-white mb-2">Identify the Fire.</h1>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                Why does this matter? Dig deeper than surface level.
                                Connect this goal to your identity or your survival.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Because...</label>
                            <textarea
                                value={motivation}
                                onChange={e => setMotivation(e.target.value)}
                                placeholder="e.g. I need to prove that my creativity has value in the real world."
                                className="w-full bg-slate-800/50 border border-slate-700 focus:border-amber-500 text-white p-6 text-xl rounded-xl transition-all placeholder-slate-600 outline-none min-h-[160px] resize-none"
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={!motivation.trim()}
                            className="mt-8 self-end bg-white text-slate-900 px-8 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Review <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {/* STEP 3: THE COMMITMENT */}
                {step === 3 && (
                    <div className="animate-fade-in flex flex-col gap-6">
                        <button onClick={handleBack} className="self-start text-slate-500 hover:text-white transition-colors mb-4">← Back</button>

                        <div className="mb-8 border-l-2 border-indigo-500 pl-6 py-2">
                            <h3 className="text-slate-400 text-sm uppercase tracking-widest mb-2">The Contract</h3>
                            <p className="text-3xl text-white font-light leading-snug mb-4">"{statement}"</p>
                            <p className="text-lg text-slate-400 italic">Because {motivation}</p>
                        </div>

                        <div className="bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-2xl flex gap-4 items-start">
                            <Shield className="text-indigo-400 shrink-0 mt-1" />
                            <div>
                                <h4 className="text-indigo-200 font-medium mb-1">Commitment Protocol</h4>
                                <p className="text-indigo-200/60 text-sm leading-relaxed">
                                    By signing this, you agree to the Daily Alignment Loop.
                                    One morning visualization. One evening reflection. Every day.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isCommitting}
                            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold tracking-wide transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2"
                        >
                            {isCommitting ? <Sparkles className="animate-spin" /> : <Check />}
                            {isCommitting ? "Forging Commitment..." : "I COMMIT TO THIS PATH"}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

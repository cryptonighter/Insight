
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ViewState } from '../../types';
import { ChevronRight, ArrowLeft, CheckCircle, Sliders, MessageSquare } from 'lucide-react';
import { cn } from '@/utils';

export const FeedbackV2: React.FC = () => {
    const { setView, rateMeditation, activeMeditationId } = useApp();

    const [pacing, setPacing] = useState(50);
    const [voice, setVoice] = useState(50);
    const [immersion, setImmersion] = useState(50);
    const [reflection, setReflection] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        if (activeMeditationId) {
            // Send feedback to engine
            rateMeditation(activeMeditationId, {
                pacing,
                voice,
                immersion,
                note: reflection
            });
        }

        // Simulate a small delay for "Processing" feeling
        setTimeout(() => {
            setView(ViewState.DASHBOARD);
        }, 800);
    };

    const SliderControl = ({ label, value, onChange, leftLabel, rightLabel }: any) => (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <span className="text-xs font-bold uppercase tracking-widest text-white/50">{label}</span>
                <span className="text-xs font-mono text-primary">{value}%</span>
            </div>
            <input
                type="range"
                min="0" max="100"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary-dim transition-all"
            />
            <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-wider font-medium">
                <span>{leftLabel}</span>
                <span>{rightLabel}</span>
            </div>
        </div>
    );

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background-dark font-display max-w-md mx-auto shadow-2xl">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-10 pointer-events-none"></div>

            {/* Header */}
            <header className="relative z-20 flex items-center justify-between p-6 pt-8 border-b border-white/5 bg-background-dark/95 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary">
                        <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white leading-none">Feedback Channel</h2>
                        <span className="text-[10px] uppercase tracking-widest text-white/40">Tune the Engine</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col px-6 pt-8 pb-32 overflow-y-auto">
                {/* Sliders Section */}
                <div className="space-y-8 mb-10 animate-in slide-in-from-bottom-4 duration-500">
                    <SliderControl
                        label="Pacing"
                        value={pacing}
                        onChange={setPacing}
                        leftLabel="Too Slow"
                        rightLabel="Too Fast"
                    />
                    <SliderControl
                        label="Voice Resonance"
                        value={voice}
                        onChange={setVoice}
                        leftLabel="Distracting"
                        rightLabel="Soothing"
                    />
                    <SliderControl
                        label="Immersion Depth"
                        value={immersion}
                        onChange={setImmersion}
                        leftLabel="Shallow"
                        rightLabel="Deep"
                    />
                </div>

                <div className="h-[1px] w-full bg-white/5 mb-8"></div>

                {/* Reflection Input */}
                <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="flex items-center gap-2 text-white/50">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Reflection Log</span>
                    </div>
                    <textarea
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        placeholder="Any insights, feelings, or visualizations to record?"
                        className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition-all resize-none"
                    />
                </div>
            </main>

            {/* Footer */}
            <footer className="absolute bottom-0 w-full z-30 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="group w-full h-14 rounded-xl bg-primary text-background-dark font-bold text-sm tracking-widest uppercase hover:bg-primary-dim transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_40px_rgba(74,222,128,0.4)] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isSubmitting ? "Calibrating..." : "Submit & Complete"}
                    {!isSubmitting && <CheckCircle className="w-4 h-4" />}
                </button>
            </footer>
        </div>
    );
};

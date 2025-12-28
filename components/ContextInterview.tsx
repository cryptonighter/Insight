import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState, MethodologyType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Send, CheckCircle, Info, ChevronRight } from 'lucide-react';
import { CLINICAL_PROTOCOLS } from '../services/protocols';

interface Question {
    id: string;
    type: 'TEXT' | 'SELECT' | 'SLIDER' | 'SWIPE';
    label: string;
    subLabel?: string;
    placeholder?: string;
    options?: { value: string; label: string; icon?: any }[];
    key: string;
}

const getQuestionsForMethodology = (methodology: MethodologyType): Question[] => {
    const protocol = CLINICAL_PROTOCOLS[methodology] || CLINICAL_PROTOCOLS['NSDR'];

    return protocol.variables.map((v, index) => ({
        id: `${methodology.toLowerCase()}-${index}`,
        key: v.id,
        type: v.type === 'select' ? 'SELECT' : v.type === 'slider' ? 'SLIDER' : 'TEXT',
        label: v.name,
        subLabel: v.description || "Entering clinical variables...",
        placeholder: `Enter ${v.name}...`,
        options: v.options?.map(opt => ({ value: opt, label: opt }))
    }));
};

export const ContextInterview: React.FC = () => {
    const { pendingMeditationConfig, finalizeMeditationGeneration, triage } = useApp();
    const methodology = (pendingMeditationConfig?.methodology || triage.selectedMethodology || 'NSDR') as MethodologyType;

    const questions = useMemo(() => getQuestionsForMethodology(methodology), [methodology]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [inputValue, setInputValue] = useState("");

    const activeQuestion = questions[currentIndex];

    const handleNext = () => {
        const finalAnswers = { ...answers };
        if (activeQuestion.type === 'TEXT') {
            finalAnswers[activeQuestion.key] = inputValue;
        }

        setAnswers(finalAnswers);
        setInputValue("");

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Finish Context Interview
            const config = {
                ...pendingMeditationConfig!,
                variables: { ...pendingMeditationConfig?.variables, ...finalAnswers }
            };
            finalizeMeditationGeneration(config as any);
        }
    };

    const selectOption = (val: string) => {
        setAnswers({ ...answers, [activeQuestion.key]: val });
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleNext();
        }
    };

    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-gradient-liquid flex flex-col items-center justify-center p-6 app-text-primary">
            <div className="max-w-md w-full flex flex-col items-center">

                {/* Header */}
                <div className="w-full mb-12 flex flex-col gap-2 px-2">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-indigo-500 font-bold">Deepening Context</span>
                        <span className="text-xs text-slate-400 font-medium">{currentIndex + 1} / {questions.length}</span>
                    </div>
                    <div className="w-full h-1 bg-white/40 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeQuestion.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="w-full"
                    >
                        <div className="text-center mb-10">
                            <div className="inline-flex p-3 bg-indigo-50 rounded-2xl text-indigo-600 mb-6 shadow-sm">
                                <Sparkles size={24} />
                            </div>
                            <h1 className="text-2xl font-light text-slate-800 mb-2">{activeQuestion.label}</h1>
                            <p className="text-slate-500 font-light leading-relaxed">{activeQuestion.subLabel}</p>
                        </div>

                        <div className="space-y-4 w-full">
                            {activeQuestion.type === 'TEXT' && (
                                <div className="relative">
                                    <textarea
                                        autoFocus
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleNext()}
                                        placeholder={activeQuestion.placeholder}
                                        className="w-full bg-white/80 backdrop-blur-sm border border-white/80 rounded-[32px] p-8 text-lg font-light shadow-xl shadow-indigo-100/20 focus:outline-none focus:ring-2 focus:ring-indigo-100 min-h-[200px] resize-none text-slate-700 placeholder:text-slate-300 transition-all"
                                    />
                                    <button
                                        onClick={handleNext}
                                        className="absolute bottom-4 right-4 p-4 bg-slate-900 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                                    >
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            )}

                            {activeQuestion.type === 'SELECT' && activeQuestion.options && (
                                <div className="grid grid-cols-1 gap-3">
                                    {activeQuestion.options.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => selectOption(opt.value)}
                                            className="group w-full bg-white/80 backdrop-blur-sm border border-white/80 p-6 rounded-2xl text-left flex justify-between items-center hover:bg-indigo-50 hover:border-indigo-100 transition-all shadow-sm"
                                        >
                                            <span className="text-slate-700 font-medium group-hover:text-indigo-600 transition-colors">{opt.label}</span>
                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeQuestion.type === 'SLIDER' && (
                                <div className="space-y-8 bg-white/70 backdrop-blur-sm border border-white p-8 rounded-[32px] shadow-lg">
                                    <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
                                        <span>Low Intensity</span>
                                        <span>High Intensity</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="10"
                                        value={inputValue || 5}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <button
                                        onClick={handleNext}
                                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                                    >
                                        Continuue <ArrowRight size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                <p className="mt-12 text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2 opacity-60">
                    <Info size={12} />
                    Calm Interface • Clinical {methodology} Protocol
                </p>

            </div>
        </div>
    );
};

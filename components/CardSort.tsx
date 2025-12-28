import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState, MethodologyType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Info, Sparkles } from 'lucide-react';

interface Card {
    id: string;
    label: string;
    description: string;
    methodologyHint: MethodologyType;
}

const CARDS: Card[] = [
    { id: '1', label: "Inner Conflict", description: "I feel like I'm arguing with myself.", methodologyHint: 'IFS' },
    { id: '2', label: "Physical Tension", description: "My body feels tight or restless.", methodologyHint: 'NSDR' },
    { id: '3', label: "Feeling Stuck", description: "I'm caught in repetitive thoughts.", methodologyHint: 'ACT' },
    { id: '4', label: "Numb or Frozen", description: "I feel distant from my emotions.", methodologyHint: 'SOMATIC_AGENCY' },
    { id: '5', label: "Need Clarity", description: "I want to set a clear intention.", methodologyHint: 'WOOP' },
    { id: '6', label: "Emotional Weight", description: "Something heavy is sitting on my chest.", methodologyHint: 'NARRATIVE' }
];

export const CardSort: React.FC = () => {
    const { setView, startMeditationGeneration, triage } = useApp();
    const [index, setIndex] = useState(0);
    const [selectedMethodologies, setSelectedMethodologies] = useState<MethodologyType[]>([]);

    const activeCard = CARDS[index];

    const [exitX, setExitX] = useState(0);

    const handleSwipe = (direction: 'left' | 'right') => {
        setExitX(direction === 'right' ? 500 : -500);

        if (direction === 'right') {
            setSelectedMethodologies(prev => [...prev, activeCard.methodologyHint]);
        }

        setTimeout(() => {
            if (index < CARDS.length - 1) {
                setIndex(prev => prev + 1);
                setExitX(0);
            } else {
                // Finished sorting
                const finalMethodology = selectedMethodologies.length > 0
                    ? selectedMethodologies[selectedMethodologies.length - 1]
                    : activeCard.methodologyHint;

                startMeditationGeneration(
                    activeCard.label,
                    direction === 'right' ? "processed" : "general",
                    10,
                    finalMethodology
                );
            }
        }, 300);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-liquid p-6 overflow-hidden">
            <div className="max-w-md w-full flex flex-col items-center">

                {/* Progress Header */}
                <div className="w-full flex justify-between items-center mb-12 px-2">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-indigo-400 font-bold">Needs Assessment</span>
                    <span className="text-xs text-slate-400">{index + 1} / {CARDS.length}</span>
                </div>

                <div className="relative w-full aspect-[3/4] max-h-[500px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeCard.id}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.x > 100) handleSwipe('right');
                                else if (info.offset.x < -100) handleSwipe('left');
                            }}
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{
                                x: exitX,
                                opacity: 0,
                                rotate: exitX > 0 ? 20 : -20,
                                transition: { duration: 0.3 }
                            }}
                            className="absolute inset-0 bg-white rounded-[32px] p-8 shadow-2xl shadow-indigo-100 flex flex-col items-center justify-center text-center border border-white/80 cursor-grab active:cursor-grabbing"
                        >
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                <Sparkles className="text-indigo-500 w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-light text-slate-800 mb-4">{activeCard.label}</h2>
                            <p className="text-slate-500 font-light leading-relaxed px-4">{activeCard.description}</p>

                            <div className="mt-auto flex justify-between w-full opacity-20 text-[10px] uppercase tracking-widest font-bold">
                                <span>← No</span>
                                <span>Yes →</span>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Action Buttons for fallback */}
                <div className="flex gap-6 mt-12">
                    <button
                        onClick={() => handleSwipe('left')}
                        className="w-16 h-16 rounded-full bg-white shadow-lg border border-red-50 flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                    >
                        <X size={28} />
                    </button>
                    <button
                        onClick={() => handleSwipe('right')}
                        className="w-16 h-16 rounded-full bg-white shadow-lg border border-teal-50 flex items-center justify-center text-teal-500 hover:bg-teal-50 transition-colors"
                    >
                        <Check size={28} />
                    </button>
                </div>

                <p className="mt-8 text-xs text-slate-400 flex items-center gap-2">
                    <Info size={12} />
                    Slide or tap to choose what resonates
                </p>

            </div>
        </div>
    );
};

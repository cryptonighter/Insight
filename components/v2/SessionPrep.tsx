/**
 * SessionPrep - Step-by-Step Setup Wizard
 * One screen at a time, progress ring, back button, multi-select history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { ViewState, MethodologyType } from '../../types';
import { ArrowLeft, ChevronRight, Sparkles, Clock, MessageSquare, RefreshCw, Loader2, Check, History } from 'lucide-react';
import { generateSessionSummary } from '../../services/geminiService';
import { ProgressRing } from '../ui/ProgressRing';
import { fetchSessionHistory, SessionHistorySummary } from '../../services/userHistoryService';
import { cn } from '@/utils';

// Step definitions
type SetupStep = 'THEME' | 'FOCUS' | 'DURATION' | 'SUMMARY';

interface ThemeCategory {
    id: string;
    label: string;
    emoji: string;
    color: string;
    focusOptions: { label: string; value: string }[];
}

// Theme categories with relevant focus options
const THEME_CATEGORIES: ThemeCategory[] = [
    {
        id: 'calm',
        label: 'Calm',
        emoji: '🧘',
        color: 'bg-blue-500/20 border-blue-400',
        focusOptions: [
            { label: 'Release racing thoughts', value: 'Quieting the mind and releasing racing thoughts' },
            { label: 'Find inner peace', value: 'Connecting with deep inner peace and stillness' },
            { label: 'Body relaxation', value: 'Progressive relaxation through the body' },
            { label: 'Emotional balance', value: 'Restoring emotional equilibrium' },
        ]
    },
    {
        id: 'energy',
        label: 'Energy',
        emoji: '⚡',
        color: 'bg-yellow-500/20 border-yellow-400',
        focusOptions: [
            { label: 'Morning activation', value: 'Energizing start to the day' },
            { label: 'Overcome fatigue', value: 'Breaking through mental and physical fatigue' },
            { label: 'Boost motivation', value: 'Rekindling inner motivation and drive' },
            { label: 'Physical vitality', value: 'Awakening body energy and vitality' },
        ]
    },
    {
        id: 'sleep',
        label: 'Sleep',
        emoji: '🌙',
        color: 'bg-indigo-500/20 border-indigo-400',
        focusOptions: [
            { label: 'Fall asleep faster', value: 'Transitioning into deep restful sleep' },
            { label: 'Quiet the mind', value: 'Releasing the day and quieting mental chatter' },
            { label: 'Body scan relaxation', value: 'Progressive body relaxation for sleep' },
            { label: 'Peaceful dreams', value: 'Setting intentions for peaceful dreams' },
        ]
    },
    {
        id: 'focus',
        label: 'Focus',
        emoji: '🎯',
        color: 'bg-purple-500/20 border-purple-400',
        focusOptions: [
            { label: 'Clear mental fog', value: 'Cutting through mental fog for clarity' },
            { label: 'Deep concentration', value: 'Cultivating single-pointed attention' },
            { label: 'Creative flow', value: 'Entering a state of creative flow' },
            { label: 'Decision clarity', value: 'Gaining clarity for important decisions' },
        ]
    },
    {
        id: 'stress',
        label: 'Stress',
        emoji: '💨',
        color: 'bg-green-500/20 border-green-400',
        focusOptions: [
            { label: 'Release tension', value: 'Letting go of held tension and stress' },
            { label: 'Anxiety relief', value: 'Calming anxious thoughts and feelings' },
            { label: 'Reset nervous system', value: 'Resetting the nervous system to calm' },
            { label: 'Processing emotions', value: 'Safely processing difficult emotions' },
        ]
    },
    {
        id: 'growth',
        label: 'Growth',
        emoji: '🌱',
        color: 'bg-emerald-500/20 border-emerald-400',
        focusOptions: [
            { label: 'Self-discovery', value: 'Exploring inner landscape and patterns' },
            { label: 'Build confidence', value: 'Strengthening self-belief and confidence' },
            { label: 'Process a situation', value: 'Gaining perspective on a challenging situation' },
            { label: 'Set intentions', value: 'Clarifying and setting meaningful intentions' },
        ]
    },
];

const DURATION_OPTIONS = [
    { label: '5 min', value: 5, desc: 'Quick reset' },
    { label: '10 min', value: 10, desc: 'Standard' },
    { label: '15 min', value: 15, desc: 'Deep dive' },
    { label: '20 min', value: 20, desc: 'Extended' },
];

const METHODOLOGY_INFO: Record<string, { label: string; desc: string }> = {
    'NSDR': { label: 'NSDR', desc: 'Non-Sleep Deep Rest' },
    'SOMATIC_AGENCY': { label: 'Somatic', desc: 'Body-based release' },
    'IFS': { label: 'IFS', desc: 'Parts work' },
    'GENERAL': { label: 'Mindfulness', desc: 'Breath & awareness' },
};

export const SessionPrep: React.FC = () => {
    const { setView, soundscapes, user, setPendingMeditationConfig, finalizeMeditationGeneration } = useApp();

    // Step state
    const [currentStep, setCurrentStep] = useState<SetupStep>('THEME');

    // Selection state
    const [selectedTheme, setSelectedTheme] = useState<ThemeCategory | null>(null);
    const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);
    const [selectedDuration, setSelectedDuration] = useState<number>(5);
    const [customInput, setCustomInput] = useState('');

    // History state
    const [userHistory, setUserHistory] = useState<SessionHistorySummary | null>(null);

    // Summary state
    const [summary, setSummary] = useState<{
        title: string;
        methodology: MethodologyType;
        focus: string;
        soundscapeId: string;
        preview: string;
    } | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [showRefinement, setShowRefinement] = useState(false);
    const [refinementText, setRefinementText] = useState('');
    const [showMethodologyPicker, setShowMethodologyPicker] = useState(false);

    // Fetch user history
    useEffect(() => {
        if (user?.supabaseId) {
            fetchSessionHistory(user.supabaseId).then(history => {
                if (history.totalSessions > 0) {
                    setUserHistory(history);
                }
            }).catch(console.error);
        }
    }, [user?.supabaseId]);

    // Calculate progress
    const calculateProgress = useCallback(() => {
        let progress = 0;
        if (selectedTheme) progress += 25;
        if (selectedFocuses.length > 0) progress += 25;
        if (selectedDuration) progress += 25;
        if (summary) progress += 25;
        return progress;
    }, [selectedTheme, selectedFocuses, selectedDuration, summary]);

    const progress = calculateProgress();

    // Get current step number
    const getStepNumber = () => {
        switch (currentStep) {
            case 'THEME': return 1;
            case 'FOCUS': return 2;
            case 'DURATION': return 3;
            case 'SUMMARY': return 4;
        }
    };

    // Navigate between steps
    const goBack = () => {
        switch (currentStep) {
            case 'FOCUS':
                setCurrentStep('THEME');
                setSelectedFocuses([]);
                break;
            case 'DURATION':
                setCurrentStep('FOCUS');
                break;
            case 'SUMMARY':
                setCurrentStep('DURATION');
                setSummary(null);
                break;
            default:
                setView(ViewState.DASHBOARD);
        }
    };

    const goNext = () => {
        switch (currentStep) {
            case 'THEME':
                if (selectedTheme) setCurrentStep('FOCUS');
                break;
            case 'FOCUS':
                if (selectedFocuses.length > 0 || customInput) setCurrentStep('DURATION');
                break;
            case 'DURATION':
                setCurrentStep('SUMMARY');
                generateSummary();
                break;
        }
    };

    // Toggle focus selection (multi-select)
    const toggleFocus = (focusValue: string) => {
        setSelectedFocuses(prev =>
            prev.includes(focusValue)
                ? prev.filter(f => f !== focusValue)
                : [...prev, focusValue]
        );
    };

    // Generate Director summary
    const generateSummary = async () => {
        setIsLoadingSummary(true);

        try {
            const combinedFocus = [
                ...selectedFocuses,
                customInput.trim()
            ].filter(Boolean).join('. ');

            const soundscapeInfo = soundscapes.map(s => ({
                id: s.id,
                name: s.name,
                mood: s.metadata?.mood
            }));

            const result = await generateSessionSummary(
                selectedTheme?.label || 'General',
                selectedDuration,
                combinedFocus,
                undefined,
                soundscapeInfo
            );

            setSummary({
                ...result,
            });
        } catch (error) {
            console.error('Failed to generate summary:', error);
            // Fallback
            setSummary({
                title: `${selectedTheme?.label || 'Mindful'} Session`,
                methodology: 'NSDR',
                focus: selectedFocuses.join('. '),
                soundscapeId: soundscapes[0]?.id || 'default',
                preview: `A ${selectedDuration}-minute session focused on ${selectedTheme?.label?.toLowerCase() || 'mindfulness'}.`
            });
        } finally {
            setIsLoadingSummary(false);
        }
    };

    // Handle refinement
    const handleRefine = async () => {
        if (!refinementText.trim()) return;

        setIsLoadingSummary(true);

        try {
            const soundscapeInfo = soundscapes.map(s => ({
                id: s.id,
                name: s.name,
                mood: s.metadata?.mood
            }));

            const result = await generateSessionSummary(
                selectedTheme?.label || 'General',
                selectedDuration,
                selectedFocuses.join('. '),
                refinementText,
                soundscapeInfo
            );

            setSummary(result);
            setRefinementText('');
            setShowRefinement(false);
        } catch (error) {
            console.error('Refinement failed:', error);
        } finally {
            setIsLoadingSummary(false);
        }
    };

    // Handle methodology change
    const handleMethodologyChange = async (newMethodology: MethodologyType) => {
        if (!summary) return;

        setShowMethodologyPicker(false);
        setIsLoadingSummary(true);

        try {
            const soundscapeInfo = soundscapes.map(s => ({
                id: s.id,
                name: s.name,
                mood: s.metadata?.mood
            }));

            const result = await generateSessionSummary(
                selectedTheme?.label || 'General',
                selectedDuration,
                selectedFocuses.join('. '),
                `Use ${newMethodology} methodology`,
                soundscapeInfo
            );

            setSummary({
                ...result,
                methodology: newMethodology
            });
        } catch (error) {
            setSummary(prev => prev ? { ...prev, methodology: newMethodology } : null);
        } finally {
            setIsLoadingSummary(false);
        }
    };

    // Start session
    const handleStart = async () => {
        if (!summary) return;

        setPendingMeditationConfig({
            focus: summary.focus,
            methodology: summary.methodology,
            intensity: 'MODERATE',
            duration: selectedDuration,
            soundscapeId: summary.soundscapeId
        });

        setView(ViewState.LOADING);
        await finalizeMeditationGeneration();
    };

    // Can proceed to next step?
    const canProceed = () => {
        switch (currentStep) {
            case 'THEME': return !!selectedTheme;
            case 'FOCUS': return selectedFocuses.length > 0 || customInput.trim().length > 0;
            case 'DURATION': return true;
            case 'SUMMARY': return !!summary && !isLoadingSummary;
        }
    };

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background-dark font-display max-w-md mx-auto">
            {/* Background glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Header with back button */}
            <header className="relative z-10 flex items-center justify-between px-6 pt-8 pb-4 shrink-0">
                <button
                    onClick={goBack}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                        Step {getStepNumber()} of 4
                    </span>
                </div>
                <div className="w-10" />
            </header>

            {/* Main Content - Step by Step */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 pb-48">
                <AnimatePresence mode="wait">
                    {/* STEP 1: Theme Selection */}
                    {currentStep === 'THEME' && (
                        <motion.div
                            key="theme"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="w-full max-w-sm space-y-6"
                        >
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-white mb-2">What do you need?</h2>
                                <p className="text-sm text-white/50">Choose what feels right today</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {THEME_CATEGORIES.map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => {
                                            setSelectedTheme(theme);
                                            setSelectedFocuses([]);
                                        }}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all",
                                            selectedTheme?.id === theme.id
                                                ? theme.color
                                                : 'bg-surface/30 border-white/10 hover:border-white/20'
                                        )}
                                    >
                                        <span className="text-3xl">{theme.emoji}</span>
                                        <span className={cn(
                                            "text-sm font-bold",
                                            selectedTheme?.id === theme.id ? 'text-white' : 'text-white/70'
                                        )}>
                                            {theme.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: Focus Selection (multi-select) */}
                    {currentStep === 'FOCUS' && selectedTheme && (
                        <motion.div
                            key="focus"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="w-full max-w-sm space-y-6"
                        >
                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{selectedTheme.emoji}</span>
                                    <h2 className="text-2xl font-bold text-white">{selectedTheme.label}</h2>
                                </div>
                                <p className="text-sm text-white/50">Select one or more focuses</p>
                            </div>

                            {/* Past themes from history */}
                            {userHistory && userHistory.frequentThemes.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <History className="w-3 h-3 text-primary/60" />
                                        <span className="text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
                                            From your history
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {userHistory.frequentThemes.slice(0, 3).map(theme => (
                                            <button
                                                key={theme}
                                                onClick={() => toggleFocus(theme)}
                                                className={cn(
                                                    "px-3 py-2 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
                                                    selectedFocuses.includes(theme)
                                                        ? 'bg-primary/20 border-primary text-primary'
                                                        : 'bg-surface/50 border-white/10 text-white/70 hover:border-white/20'
                                                )}
                                            >
                                                {selectedFocuses.includes(theme) && <Check className="w-3 h-3" />}
                                                {theme}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Theme-specific focus options */}
                            <div className="space-y-2">
                                {selectedTheme.focusOptions.map(focus => (
                                    <button
                                        key={focus.value}
                                        onClick={() => toggleFocus(focus.value)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                                            selectedFocuses.includes(focus.value)
                                                ? 'bg-primary/15 border-primary'
                                                : 'bg-surface/30 border-white/10 hover:border-white/20'
                                        )}
                                    >
                                        <span className={cn(
                                            "text-sm",
                                            selectedFocuses.includes(focus.value) ? 'text-white font-medium' : 'text-white/70'
                                        )}>
                                            {focus.label}
                                        </span>
                                        {selectedFocuses.includes(focus.value) && (
                                            <Check className="w-4 h-4 text-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Custom input */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="w-3 h-3 text-white/40" />
                                    <span className="text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase">
                                        Or add your own
                                    </span>
                                </div>
                                <textarea
                                    value={customInput}
                                    onChange={(e) => setCustomInput(e.target.value)}
                                    placeholder="What's on your mind..."
                                    rows={2}
                                    className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:outline-none resize-none"
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: Duration Selection */}
                    {currentStep === 'DURATION' && (
                        <motion.div
                            key="duration"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="w-full max-w-sm space-y-6"
                        >
                            <div className="text-center">
                                <Clock className="w-10 h-10 text-primary/60 mx-auto mb-3" />
                                <h2 className="text-2xl font-bold text-white mb-2">How long?</h2>
                                <p className="text-sm text-white/50">Choose your session duration</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {DURATION_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSelectedDuration(opt.value)}
                                        className={cn(
                                            "flex flex-col items-center py-5 rounded-2xl border-2 transition-all",
                                            selectedDuration === opt.value
                                                ? 'bg-primary/20 border-primary'
                                                : 'bg-surface/30 border-white/10 hover:border-white/20'
                                        )}
                                    >
                                        <span className={cn(
                                            "text-2xl font-bold",
                                            selectedDuration === opt.value ? 'text-white' : 'text-white/70'
                                        )}>
                                            {opt.label}
                                        </span>
                                        <span className="text-[10px] text-white/40 mt-1">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: Summary & Refinement */}
                    {currentStep === 'SUMMARY' && (
                        <motion.div
                            key="summary"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="w-full max-w-sm space-y-6"
                        >
                            {isLoadingSummary && !summary ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-10 h-10 text-primary/60 animate-spin mb-4" />
                                    <p className="text-sm text-white/50">Designing your session...</p>
                                </div>
                            ) : summary ? (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <Sparkles className="w-8 h-8 text-primary/60 mx-auto mb-2" />
                                        <h3 className="text-xl font-bold text-white">{summary.title}</h3>
                                        <p className="text-sm text-primary/80 mt-1">{summary.focus}</p>
                                    </div>

                                    {/* Methodology badge with picker */}
                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => setShowMethodologyPicker(!showMethodologyPicker)}
                                            className="px-4 py-2 rounded-full bg-surface/50 border border-white/10 text-sm text-white/70 flex items-center gap-2 hover:border-white/20 transition-colors"
                                        >
                                            {METHODOLOGY_INFO[summary.methodology]?.label || summary.methodology}
                                            <ChevronRight className={cn("w-4 h-4 transition-transform", showMethodologyPicker && "rotate-90")} />
                                        </button>
                                    </div>

                                    {showMethodologyPicker && (
                                        <div className="grid grid-cols-2 gap-2 animate-in fade-in">
                                            {Object.entries(METHODOLOGY_INFO).map(([key, info]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => handleMethodologyChange(key as MethodologyType)}
                                                    className={cn(
                                                        "p-3 rounded-xl border text-left transition-all",
                                                        summary.methodology === key
                                                            ? 'bg-primary/20 border-primary'
                                                            : 'bg-surface/50 border-white/10 hover:border-white/20'
                                                    )}
                                                >
                                                    <span className="text-sm font-bold text-white">{info.label}</span>
                                                    <p className="text-[10px] text-white/50">{info.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Preview */}
                                    <div className="bg-surface/30 rounded-xl p-4 border border-white/5">
                                        <p className="text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase mb-2">
                                            What to expect
                                        </p>
                                        <p className="text-sm text-white/70 leading-relaxed">{summary.preview}</p>
                                    </div>

                                    {/* Refinement */}
                                    {showRefinement ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={refinementText}
                                                onChange={(e) => setRefinementText(e.target.value)}
                                                placeholder="e.g. 'more visual', 'add body awareness'..."
                                                rows={2}
                                                className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:outline-none resize-none"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowRefinement(false)}
                                                    className="flex-1 py-2 rounded-lg bg-surface/50 text-white/60 text-sm"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleRefine}
                                                    disabled={!refinementText.trim() || isLoadingSummary}
                                                    className="flex-1 py-2 rounded-lg bg-primary text-black font-bold text-sm disabled:opacity-50"
                                                >
                                                    {isLoadingSummary ? 'Refining...' : 'Apply'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowRefinement(true)}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary/70 hover:text-primary transition-colors"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Refine with your words
                                        </button>
                                    )}
                                </div>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer with Progress Ring START Button */}
            <footer className="absolute bottom-0 left-0 right-0 p-6 flex justify-center">
                <ProgressRing progress={progress} size={160} strokeWidth={4}>
                    <button
                        onClick={currentStep === 'SUMMARY' && summary ? handleStart : goNext}
                        disabled={!canProceed()}
                        className={cn(
                            "w-[140px] h-[140px] rounded-full flex flex-col items-center justify-center transition-all duration-300",
                            canProceed()
                                ? "bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                                : "bg-surface/30 text-white/30 cursor-not-allowed"
                        )}
                    >
                        {isLoadingSummary ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <span className="text-xl font-bold">
                                    {currentStep === 'SUMMARY' && summary ? 'START' : 'NEXT'}
                                </span>
                                <span className="text-[10px] opacity-60 mt-1">
                                    {Math.round(progress)}%
                                </span>
                            </>
                        )}
                    </button>
                </ProgressRing>
            </footer>
        </div>
    );
};

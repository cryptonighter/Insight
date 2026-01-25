import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';
import { Settings, History, ChevronRight, Zap, Activity, ArrowLeft, Check, MessageSquare, Clock, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { ViewState, MethodologyType } from '../../types';
import { ProgressRing } from '../ui/ProgressRing';
import { generateSessionSummary } from '../../services/geminiService';
import { fetchSessionHistory, SessionHistorySummary } from '../../services/userHistoryService';
import { cn } from '@/utils';

// Setup step types
type SetupStep = 'HOME' | 'FOCUS' | 'DURATION' | 'SUMMARY';

interface ThemeCategory {
    id: string;
    label: string;
    emoji: string;
    focusOptions: { label: string; value: string }[];
}

// Theme categories with relevant focus options
const THEME_CATEGORIES: ThemeCategory[] = [
    {
        id: 'calm', label: 'Calm', emoji: '🧘',
        focusOptions: [
            { label: 'Release racing thoughts', value: 'Quieting the mind and releasing racing thoughts' },
            { label: 'Find inner peace', value: 'Connecting with deep inner peace and stillness' },
            { label: 'Body relaxation', value: 'Progressive relaxation through the body' },
        ]
    },
    {
        id: 'energy', label: 'Energy', emoji: '⚡',
        focusOptions: [
            { label: 'Morning activation', value: 'Energizing start to the day' },
            { label: 'Overcome fatigue', value: 'Breaking through mental and physical fatigue' },
            { label: 'Boost motivation', value: 'Rekindling inner motivation and drive' },
        ]
    },
    {
        id: 'sleep', label: 'Sleep', emoji: '🌙',
        focusOptions: [
            { label: 'Fall asleep faster', value: 'Transitioning into deep restful sleep' },
            { label: 'Quiet the mind', value: 'Releasing the day and quieting mental chatter' },
            { label: 'Deep rest', value: 'Progressive body relaxation for sleep' },
        ]
    },
    {
        id: 'focus', label: 'Focus', emoji: '🎯',
        focusOptions: [
            { label: 'Clear mental fog', value: 'Cutting through mental fog for clarity' },
            { label: 'Deep concentration', value: 'Cultivating single-pointed attention' },
            { label: 'Creative flow', value: 'Entering a state of creative flow' },
        ]
    },
    {
        id: 'stress', label: 'Stress', emoji: '💨',
        focusOptions: [
            { label: 'Release tension', value: 'Letting go of held tension and stress' },
            { label: 'Anxiety relief', value: 'Calming anxious thoughts and feelings' },
            { label: 'Reset nervous system', value: 'Resetting the nervous system to calm' },
        ]
    },
    {
        id: 'growth', label: 'Growth', emoji: '🌱',
        focusOptions: [
            { label: 'Self-discovery', value: 'Exploring inner landscape and patterns' },
            { label: 'Build confidence', value: 'Strengthening self-belief and confidence' },
            { label: 'Set intentions', value: 'Clarifying and setting meaningful intentions' },
        ]
    },
];

const DURATION_OPTIONS = [
    { label: '5m', value: 5 },
    { label: '10m', value: 10 },
    { label: '15m', value: 15 },
    { label: '20m', value: 20 },
];

const METHODOLOGY_INFO: Record<string, { label: string; desc: string }> = {
    'NSDR': { label: 'NSDR', desc: 'Deep Rest' },
    'SOMATIC_AGENCY': { label: 'Somatic', desc: 'Body Release' },
    'IFS': { label: 'IFS', desc: 'Parts Work' },
    'GENERAL': { label: 'Mindful', desc: 'Awareness' },
};

export const DashboardV2: React.FC = () => {
    const { userEconomy, activeResolution, startMorningSession, setView, todaysEntry, isLoading, setPendingMeditationConfig, soundscapes, finalizeMeditationGeneration, user } = useApp();

    // Setup flow state
    const [currentStep, setCurrentStep] = useState<SetupStep>('HOME');
    const [selectedTheme, setSelectedTheme] = useState<ThemeCategory | null>(null);
    const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);
    const [customInput, setCustomInput] = useState('');
    const [selectedDuration, setSelectedDuration] = useState<number>(5);

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

    // History state
    const [userHistory, setUserHistory] = useState<SessionHistorySummary | null>(null);

    // Fetch history
    useEffect(() => {
        if (user?.supabaseId) {
            fetchSessionHistory(user.supabaseId).then(h => {
                if (h.totalSessions > 0) setUserHistory(h);
            }).catch(console.error);
        }
    }, [user?.supabaseId]);

    const daysProgress = useMemo(() => {
        if (!activeResolution?.createdAt) return 0;
        const now = Date.now();
        const start = new Date(activeResolution.createdAt).getTime();
        const diff = now - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }, [activeResolution?.createdAt]);

    // Calculate progress (0-100)
    const progress = useMemo(() => {
        let p = 0;
        if (selectedTheme) p += 33;
        if (selectedFocuses.length > 0 || customInput) p += 33;
        if (summary) p += 34;
        return p;
    }, [selectedTheme, selectedFocuses, customInput, summary]);

    // FIRST RUN: If no active resolution, force flow to creation
    useEffect(() => {
        if (!isLoading && !activeResolution) {
            if (!userEconomy.lastDailyGrant) {
                setView(ViewState.ONBOARDING);
            } else {
                setView(ViewState.NEW_RESOLUTION);
            }
        }
    }, [activeResolution, setView, userEconomy, isLoading]);

    // Handle theme selection - auto advance
    const handleThemeSelect = (theme: ThemeCategory) => {
        setSelectedTheme(theme);
        setSelectedFocuses([]);
        setCustomInput('');
        setSummary(null);
        setCurrentStep('FOCUS');
    };

    // Toggle focus multi-select
    const toggleFocus = (value: string) => {
        setSelectedFocuses(prev =>
            prev.includes(value) ? prev.filter(f => f !== value) : [...prev, value]
        );
    };

    // Advance from FOCUS to DURATION
    const handleFocusContinue = () => {
        if (selectedFocuses.length > 0 || customInput.trim()) {
            setCurrentStep('DURATION');
        }
    };

    // Generate summary
    const handleDurationContinue = async () => {
        setCurrentStep('SUMMARY');
        setIsLoadingSummary(true);

        try {
            const combinedFocus = [...selectedFocuses, customInput.trim()].filter(Boolean).join('. ');
            const soundscapeInfo = soundscapes.map(s => ({ id: s.id, name: s.name, mood: s.metadata?.mood }));

            const result = await generateSessionSummary(
                selectedTheme?.label || 'General',
                selectedDuration,
                combinedFocus,
                undefined,
                soundscapeInfo
            );

            setSummary(result);
        } catch (error) {
            console.error('Summary generation failed:', error);
            setSummary({
                title: `${selectedTheme?.label || 'Mindful'} Session`,
                methodology: 'NSDR',
                focus: selectedFocuses.join('. '),
                soundscapeId: soundscapes[0]?.id || 'default',
                preview: `A ${selectedDuration}-minute session for ${selectedTheme?.label?.toLowerCase() || 'mindfulness'}.`
            });
        } finally {
            setIsLoadingSummary(false);
        }
    };

    // Refine summary
    const handleRefine = async () => {
        if (!refinementText.trim()) return;
        setIsLoadingSummary(true);

        try {
            const soundscapeInfo = soundscapes.map(s => ({ id: s.id, name: s.name, mood: s.metadata?.mood }));
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
            console.error('Refine failed:', error);
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

    // Go back
    const goBack = () => {
        switch (currentStep) {
            case 'FOCUS':
                setCurrentStep('HOME');
                setSelectedTheme(null);
                break;
            case 'DURATION':
                setCurrentStep('FOCUS');
                break;
            case 'SUMMARY':
                setCurrentStep('DURATION');
                setSummary(null);
                break;
        }
    };

    // Reset to home
    const resetToHome = () => {
        setCurrentStep('HOME');
        setSelectedTheme(null);
        setSelectedFocuses([]);
        setCustomInput('');
        setSummary(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-dark text-primary">
                <Activity className="animate-spin w-8 h-8" />
            </div>
        );
    }

    const isInSetupFlow = currentStep !== 'HOME';
    const canStartSession = summary && !isLoadingSummary;

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-y-auto overflow-x-hidden bg-background-light dark:bg-background-dark transition-colors duration-300">
            {/* Background Effects */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-30"></div>

            <header className="relative z-10 flex items-center justify-between px-6 pt-12 pb-2 w-full shrink-0">
                {isInSetupFlow ? (
                    <button
                        onClick={goBack}
                        className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                ) : (
                    <button
                        onClick={() => setView(ViewState.TRIAGE)}
                        className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <Settings className="w-6 h-6" />
                    </button>
                )}
                <div className="flex flex-col items-center">
                    <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 uppercase">
                        {isInSetupFlow ? `Step ${currentStep === 'FOCUS' ? 2 : currentStep === 'DURATION' ? 3 : 4} of 4` : 'Available Capital'}
                    </h2>
                    {!isInSetupFlow && (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-primary tracking-widest">{userEconomy.balance} TOKENS</span>
                            <div className="w-1 h-1 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#4ade80]"></div>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setView(ViewState.ADMIN)}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <History className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 w-full max-w-md mx-auto">
                <AnimatePresence mode="wait">
                    {/* HOME: Show resolution + theme selection */}
                    {currentStep === 'HOME' && (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="flex flex-col items-center text-center w-full"
                        >
                            {activeResolution && (
                                <div className="mb-8 animate-in fade-in">
                                    <div className="flex items-center gap-2 mb-3 opacity-60 justify-center">
                                        <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                                        <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">Current Directive</span>
                                        <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                                    </div>
                                    <h1 className="text-xl md:text-2xl font-bold text-white/90 tracking-tight leading-normal max-w-xs text-glow-sm">
                                        {activeResolution.statement}
                                    </h1>
                                </div>
                            )}

                            {/* Theme Selection */}
                            <div className="w-full max-w-sm">
                                <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-3 text-center">
                                    What do you need today?
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {THEME_CATEGORIES.map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => handleThemeSelect(theme)}
                                            className={cn(
                                                "flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-all",
                                                selectedTheme?.id === theme.id
                                                    ? 'bg-primary/15 border-primary text-white'
                                                    : 'bg-surface/30 border-white/10 text-white/70 hover:border-white/30'
                                            )}
                                        >
                                            <span className="text-xl">{theme.emoji}</span>
                                            <span className="text-xs font-medium">{theme.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* FOCUS: Multi-select focus options */}
                    {currentStep === 'FOCUS' && selectedTheme && (
                        <motion.div
                            key="focus"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="w-full max-w-sm space-y-4"
                        >
                            <div className="text-center">
                                <span className="text-3xl">{selectedTheme.emoji}</span>
                                <h2 className="text-xl font-bold text-white mt-2">{selectedTheme.label}</h2>
                                <p className="text-sm text-white/50 mt-1">Select one or more</p>
                            </div>

                            {/* History themes */}
                            {userHistory && userHistory.frequentThemes.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold tracking-[0.15em] text-white/30 uppercase">From your history</span>
                                    <div className="flex flex-wrap gap-2">
                                        {userHistory.frequentThemes.slice(0, 3).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => toggleFocus(t)}
                                                className={cn(
                                                    "px-3 py-2 rounded-lg text-xs border flex items-center gap-1.5 transition-all",
                                                    selectedFocuses.includes(t)
                                                        ? 'bg-primary/20 border-primary text-primary'
                                                        : 'bg-surface/50 border-white/10 text-white/60 hover:border-white/20'
                                                )}
                                            >
                                                {selectedFocuses.includes(t) && <Check className="w-3 h-3" />}
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Theme-specific options */}
                            <div className="space-y-2">
                                {selectedTheme.focusOptions.map(f => (
                                    <button
                                        key={f.value}
                                        onClick={() => toggleFocus(f.value)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                                            selectedFocuses.includes(f.value)
                                                ? 'bg-primary/15 border-primary'
                                                : 'bg-surface/30 border-white/10 hover:border-white/20'
                                        )}
                                    >
                                        <span className={cn("text-sm", selectedFocuses.includes(f.value) ? 'text-white' : 'text-white/70')}>
                                            {f.label}
                                        </span>
                                        {selectedFocuses.includes(f.value) && <Check className="w-4 h-4 text-primary" />}
                                    </button>
                                ))}
                            </div>

                            {/* Custom input */}
                            <textarea
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                placeholder="Or add your own..."
                                rows={2}
                                className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:outline-none resize-none"
                            />
                        </motion.div>
                    )}

                    {/* DURATION */}
                    {currentStep === 'DURATION' && (
                        <motion.div
                            key="duration"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="w-full max-w-sm space-y-6"
                        >
                            <div className="text-center">
                                <Clock className="w-10 h-10 text-primary/60 mx-auto mb-2" />
                                <h2 className="text-xl font-bold text-white">How long?</h2>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {DURATION_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSelectedDuration(opt.value)}
                                        className={cn(
                                            "py-4 rounded-xl border-2 text-center transition-all",
                                            selectedDuration === opt.value
                                                ? 'bg-primary/20 border-primary text-white font-bold'
                                                : 'bg-surface/30 border-white/10 text-white/60 hover:border-white/20'
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* SUMMARY */}
                    {currentStep === 'SUMMARY' && (
                        <motion.div
                            key="summary"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="w-full max-w-sm space-y-4"
                        >
                            {isLoadingSummary && !summary ? (
                                <div className="flex flex-col items-center py-12">
                                    <Loader2 className="w-10 h-10 text-primary/60 animate-spin mb-3" />
                                    <p className="text-sm text-white/50">Designing your session...</p>
                                </div>
                            ) : summary ? (
                                <>
                                    <div className="text-center">
                                        <Sparkles className="w-8 h-8 text-primary/60 mx-auto mb-2" />
                                        <h3 className="text-xl font-bold text-white">{summary.title}</h3>
                                        <p className="text-sm text-primary/80 mt-1">{summary.focus}</p>
                                        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-surface/50 text-xs text-white/60">
                                            {METHODOLOGY_INFO[summary.methodology]?.label || summary.methodology}
                                        </span>
                                    </div>

                                    <div className="bg-surface/30 rounded-xl p-4 border border-white/5">
                                        <p className="text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase mb-2">What to expect</p>
                                        <p className="text-sm text-white/70 leading-relaxed">{summary.preview}</p>
                                    </div>

                                    {showRefinement ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={refinementText}
                                                onChange={(e) => setRefinementText(e.target.value)}
                                                placeholder="e.g. 'more visual', 'add body focus'..."
                                                rows={2}
                                                className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:outline-none resize-none"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowRefinement(false)} className="flex-1 py-2 rounded-lg bg-surface/50 text-white/60 text-sm">Cancel</button>
                                                <button onClick={handleRefine} disabled={!refinementText.trim() || isLoadingSummary} className="flex-1 py-2 rounded-lg bg-primary text-black font-bold text-sm disabled:opacity-50">
                                                    {isLoadingSummary ? 'Refining...' : 'Apply'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setShowRefinement(true)} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary/70 hover:text-primary">
                                            <RefreshCw className="w-4 h-4" /> Refine
                                        </button>
                                    )}
                                </>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer with START button - same position, just add progress ring */}
            <footer className="relative z-10 w-full px-6 pb-8 pt-2 bg-gradient-to-t from-background-dark via-background-dark to-transparent shrink-0">
                <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
                    {/* Progress Ring around START button */}
                    <ProgressRing progress={progress} size={280} strokeWidth={4}>
                        <motion.button
                            onClick={() => {
                                if (todaysEntry?.morningGenerated && !todaysEntry?.eveningCompleted) {
                                    setView(ViewState.EVENING_REFLECTION);
                                } else if (currentStep === 'HOME') {
                                    // No action - user must select theme first
                                } else if (currentStep === 'FOCUS') {
                                    handleFocusContinue();
                                } else if (currentStep === 'DURATION') {
                                    handleDurationContinue();
                                } else if (currentStep === 'SUMMARY' && canStartSession) {
                                    handleStart();
                                }
                            }}
                            animate={{ scale: [1, 1.02, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className={cn(
                                "relative group w-64 h-64 rounded-full transition-all duration-500 overflow-hidden flex flex-col items-center justify-center bg-surface border shadow-[0_0_20px_rgba(74,222,128,0.1)] hover:shadow-[0_0_40px_rgba(74,222,128,0.2)] cursor-pointer",
                                canStartSession ? 'border-primary/60 hover:border-primary' : 'border-primary/30 hover:border-primary/60'
                            )}
                        >
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="absolute inset-0 rounded-full border border-white/5 scale-95 pointer-events-none"></div>

                            <div className="flex flex-col items-center justify-center z-10">
                                {isLoadingSummary ? (
                                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                ) : (
                                    <>
                                        <span className={cn(
                                            "text-5xl font-bold tracking-tight transition-colors duration-300 leading-none",
                                            canStartSession ? 'text-primary' : 'text-white group-hover:text-primary'
                                        )}>
                                            {currentStep === 'HOME' ? 'START' : currentStep === 'SUMMARY' && canStartSession ? 'BEGIN' : 'NEXT'}
                                        </span>
                                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 group-hover:text-white/80 transition-colors mt-3 max-w-[140px] text-center leading-relaxed">
                                            {currentStep === 'HOME'
                                                ? (todaysEntry?.morningGenerated ? "Evening\nReflection" : "Select theme\nabove")
                                                : currentStep === 'FOCUS'
                                                    ? "Continue"
                                                    : currentStep === 'DURATION'
                                                        ? "Generate"
                                                        : "Session"
                                            }
                                        </span>
                                    </>
                                )}
                            </div>
                        </motion.button>
                    </ProgressRing>

                    <div className="flex items-center justify-center gap-4 mt-2">
                        <div className="flex items-center gap-2 opacity-60">
                            <Zap className="w-4 h-4 text-primary" />
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">
                                {todaysEntry?.morningGenerated ? "Earn: 1 Token" : "Cost: 1 Token"}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
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

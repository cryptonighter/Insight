/**
 * DashboardV2 - Simplified Home Screen
 * Centered button that animates to bottom, step-by-step setup flow
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';
import { Menu, Coins, Plus, Check, Clock, Sparkles, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { ViewState, MethodologyType } from '../../types';
import { MainButton, ButtonPosition, ButtonState } from '../MainButton';
import { InsightsContextOverlay } from '../InsightsContextOverlay';
import { generateSessionSummary } from '../../services/geminiService';
import { fetchSessionHistory, SessionHistorySummary } from '../../services/userHistoryService';
import { cn } from '@/utils';

// Setup step types
type SetupStep = 'HOME' | 'THEME' | 'FOCUS' | 'DURATION' | 'SUMMARY';

interface ThemeCategory {
    id: string;
    label: string;
    emoji: string;
    focusOptions: { label: string; value: string }[];
}

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

const METHODOLOGY_INFO: Record<string, { label: string }> = {
    'NSDR': { label: 'NSDR' },
    'SOMATIC_AGENCY': { label: 'Somatic' },
    'IFS': { label: 'IFS' },
    'GENERAL': { label: 'Mindful' },
};

export const DashboardV2: React.FC = () => {
    const { userEconomy, activeResolution, setView, isLoading, setPendingMeditationConfig, soundscapes, finalizeMeditationGeneration, user } = useApp();

    // UI state
    const [showContextOverlay, setShowContextOverlay] = useState(false);
    const [currentStep, setCurrentStep] = useState<SetupStep>('HOME');

    // Selection state
    const [selectedTheme, setSelectedTheme] = useState<ThemeCategory | null>(null);
    const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);
    const [customInput, setCustomInput] = useState('');
    const [selectedDuration, setSelectedDuration] = useState<number>(10);

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

    // History
    const [userHistory, setUserHistory] = useState<SessionHistorySummary | null>(null);

    useEffect(() => {
        if (user?.supabaseId) {
            fetchSessionHistory(user.supabaseId).then(h => {
                if (h.totalSessions > 0) setUserHistory(h);
            }).catch(console.error);
        }
    }, [user?.supabaseId]);

    // Redirect if no resolution
    useEffect(() => {
        if (!isLoading && !activeResolution) {
            if (!userEconomy.lastDailyGrant) {
                setView(ViewState.ONBOARDING);
            } else {
                setView(ViewState.NEW_RESOLUTION);
            }
        }
    }, [activeResolution, setView, userEconomy, isLoading]);

    // Calculate progress (0-100)
    const progress = useMemo(() => {
        let p = 0;
        if (selectedTheme) p += 25;
        if (selectedFocuses.length > 0 || customInput) p += 25;
        if (selectedDuration) p += 25;
        if (summary) p += 25;
        return p;
    }, [selectedTheme, selectedFocuses, customInput, selectedDuration, summary]);

    // Button position and state
    const buttonPosition: ButtonPosition = currentStep === 'HOME' ? 'center' : 'bottom';
    const buttonState: ButtonState = currentStep === 'HOME' ? 'idle' : 'setup';

    // Handle button click
    const handleButtonClick = () => {
        switch (currentStep) {
            case 'HOME':
                setCurrentStep('THEME');
                break;
            case 'THEME':
                if (selectedTheme) setCurrentStep('FOCUS');
                break;
            case 'FOCUS':
                if (selectedFocuses.length > 0 || customInput.trim()) setCurrentStep('DURATION');
                break;
            case 'DURATION':
                setCurrentStep('SUMMARY');
                generateSummaryContent();
                break;
            case 'SUMMARY':
                if (summary) handleStartSession();
                break;
        }
    };

    // Handle theme selection
    const handleThemeSelect = (theme: ThemeCategory) => {
        setSelectedTheme(theme);
        setSelectedFocuses([]);
        setSummary(null);
        // Auto-advance after short delay
        setTimeout(() => setCurrentStep('FOCUS'), 200);
    };

    // Toggle focus
    const toggleFocus = (value: string) => {
        setSelectedFocuses(prev =>
            prev.includes(value) ? prev.filter(f => f !== value) : [...prev, value]
        );
    };

    // Generate summary
    const generateSummaryContent = async () => {
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
            console.error('Summary failed:', error);
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

    // Refine
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
    const handleStartSession = async () => {
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
            case 'THEME': setCurrentStep('HOME'); break;
            case 'FOCUS': setCurrentStep('THEME'); break;
            case 'DURATION': setCurrentStep('FOCUS'); break;
            case 'SUMMARY': setCurrentStep('DURATION'); setSummary(null); break;
        }
    };

    // Button label/sublabel
    const getButtonLabel = () => {
        if (currentStep === 'HOME') return 'START';
        if (currentStep === 'SUMMARY' && summary) return 'BEGIN';
        return 'NEXT';
    };

    const getSubLabel = () => {
        if (currentStep === 'HOME') return 'Tap to begin';
        if (currentStep === 'THEME') return 'Select theme';
        if (currentStep === 'FOCUS') return selectedFocuses.length > 0 ? 'Continue' : 'Select focus';
        if (currentStep === 'DURATION') return 'Generate session';
        if (currentStep === 'SUMMARY') return summary ? 'Start session' : 'Loading...';
        return '';
    };

    const canProceed = () => {
        switch (currentStep) {
            case 'HOME': return true;
            case 'THEME': return !!selectedTheme;
            case 'FOCUS': return selectedFocuses.length > 0 || customInput.trim().length > 0;
            case 'DURATION': return true;
            case 'SUMMARY': return !!summary && !isLoadingSummary;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-dark">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    const isInSetup = currentStep !== 'HOME';

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background-dark">
            {/* Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header - minimal */}
            <header className="relative z-10 flex items-center justify-between px-6 pt-6 shrink-0">
                <button
                    onClick={() => isInSetup ? goBack() : setShowContextOverlay(true)}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-surface/50 border border-white/10 hover:border-white/20 transition-colors"
                >
                    {isInSetup ? (
                        <ChevronDown className="w-5 h-5 text-white/60 rotate-90" />
                    ) : (
                        <Menu className="w-5 h-5 text-white/60" />
                    )}
                </button>

                {/* Tokens */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/50 border border-white/10">
                        <Coins className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-white">{userEconomy.balance}</span>
                    </div>
                    <button className="w-8 h-8 flex items-center justify-center rounded-full bg-surface/50 border border-white/10 hover:border-primary/50 transition-colors">
                        <Plus className="w-4 h-4 text-white/60" />
                    </button>
                </div>
            </header>

            {/* Step indicator */}
            {isInSetup && (
                <div className="relative z-10 flex justify-center mt-2">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
                        Step {['THEME', 'FOCUS', 'DURATION', 'SUMMARY'].indexOf(currentStep) + 1} of 4
                    </span>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative z-10">
                <AnimatePresence mode="wait">
                    {/* HOME: Empty, just button */}
                    {currentStep === 'HOME' && (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex items-center justify-center"
                        >
                            {/* Button will be positioned here via absolute */}
                        </motion.div>
                    )}

                    {/* THEME Selection */}
                    {currentStep === 'THEME' && (
                        <motion.div
                            key="theme"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col items-center justify-center px-6"
                        >
                            <h2 className="text-xl font-bold text-white mb-6">What do you need?</h2>
                            <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                                {THEME_CATEGORIES.map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => handleThemeSelect(theme)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                            selectedTheme?.id === theme.id
                                                ? 'bg-primary/20 border-primary'
                                                : 'bg-surface/30 border-white/10 hover:border-white/20'
                                        )}
                                    >
                                        <span className="text-2xl">{theme.emoji}</span>
                                        <span className="text-xs font-medium text-white/80">{theme.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* FOCUS Selection */}
                    {currentStep === 'FOCUS' && selectedTheme && (
                        <motion.div
                            key="focus"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 overflow-y-auto px-6 py-4"
                        >
                            <div className="max-w-sm mx-auto space-y-4">
                                <div className="text-center mb-4">
                                    <span className="text-3xl">{selectedTheme.emoji}</span>
                                    <h2 className="text-lg font-bold text-white mt-2">{selectedTheme.label}</h2>
                                    <p className="text-xs text-white/50">Select one or more</p>
                                </div>

                                {/* History themes */}
                                {userHistory && userHistory.frequentThemes.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold tracking-[0.15em] text-white/30 uppercase">From history</span>
                                        <div className="flex flex-wrap gap-2">
                                            {userHistory.frequentThemes.slice(0, 3).map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => toggleFocus(t)}
                                                    className={cn(
                                                        "px-3 py-2 rounded-lg text-xs border flex items-center gap-1.5",
                                                        selectedFocuses.includes(t)
                                                            ? 'bg-primary/20 border-primary text-primary'
                                                            : 'bg-surface/50 border-white/10 text-white/60'
                                                    )}
                                                >
                                                    {selectedFocuses.includes(t) && <Check className="w-3 h-3" />}
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Focus options */}
                                <div className="space-y-2">
                                    {selectedTheme.focusOptions.map(f => (
                                        <button
                                            key={f.value}
                                            onClick={() => toggleFocus(f.value)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                                                selectedFocuses.includes(f.value)
                                                    ? 'bg-primary/15 border-primary'
                                                    : 'bg-surface/30 border-white/10'
                                            )}
                                        >
                                            <span className="text-sm text-white/80">{f.label}</span>
                                            {selectedFocuses.includes(f.value) && <Check className="w-4 h-4 text-primary" />}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom */}
                                <textarea
                                    value={customInput}
                                    onChange={(e) => setCustomInput(e.target.value)}
                                    placeholder="Or add your own..."
                                    rows={2}
                                    className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 resize-none"
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* DURATION */}
                    {currentStep === 'DURATION' && (
                        <motion.div
                            key="duration"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col items-center justify-center px-6"
                        >
                            <Clock className="w-12 h-12 text-primary/60 mb-4" />
                            <h2 className="text-xl font-bold text-white mb-6">How long?</h2>
                            <div className="grid grid-cols-4 gap-3 w-full max-w-xs">
                                {DURATION_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSelectedDuration(opt.value)}
                                        className={cn(
                                            "py-4 rounded-xl border-2 text-center transition-all",
                                            selectedDuration === opt.value
                                                ? 'bg-primary/20 border-primary text-white font-bold'
                                                : 'bg-surface/30 border-white/10 text-white/60'
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
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col items-center justify-center px-6"
                        >
                            {isLoadingSummary && !summary ? (
                                <div className="text-center">
                                    <Loader2 className="w-10 h-10 text-primary/60 animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-white/50">Designing your session...</p>
                                </div>
                            ) : summary ? (
                                <div className="w-full max-w-sm space-y-4">
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
                                                className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none resize-none"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowRefinement(false)} className="flex-1 py-2 rounded-lg bg-surface/50 text-white/60 text-sm">Cancel</button>
                                                <button onClick={handleRefine} disabled={!refinementText.trim()} className="flex-1 py-2 rounded-lg bg-primary text-black font-bold text-sm disabled:opacity-50">Apply</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setShowRefinement(true)} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary/70">
                                            <RefreshCw className="w-4 h-4" /> Refine
                                        </button>
                                    )}
                                </div>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Button Container */}
            <div className={cn(
                "relative z-20 flex justify-center transition-all duration-500",
                currentStep === 'HOME'
                    ? 'absolute inset-0 items-center'
                    : 'pb-8'
            )}>
                <MainButton
                    position={buttonPosition}
                    state={buttonState}
                    progress={progress}
                    isLoading={isLoadingSummary}
                    label={getButtonLabel()}
                    subLabel={getSubLabel()}
                    onClick={handleButtonClick}
                    disabled={!canProceed()}
                    size={currentStep === 'HOME' ? 'large' : 'normal'}
                />
            </div>

            {/* Context Overlay */}
            <InsightsContextOverlay
                isOpen={showContextOverlay}
                onClose={() => setShowContextOverlay(false)}
            />
        </div>
    );
};

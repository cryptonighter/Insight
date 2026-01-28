/**
 * DashboardV2 - Fixed Layout with Auto-Advancing Layers
 * Research-backed themes and categories
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { Menu, Coins, Plus, Check, Clock, Sparkles, Loader2, RefreshCw, ChevronLeft, User } from 'lucide-react';
import { ViewState, MethodologyType } from '../../types';
import { MainButton, ButtonPosition, ButtonState } from '../MainButton';
import { InsightsContextOverlay } from '../InsightsContextOverlay';
import { generateSessionSummary } from '../../services/geminiService';
import { THEMES, ThemeConfig, filterInsightsByTheme, fetchUserInsights, UserInsight, updateUserPreferences } from '../../services/insightService';
import { cn } from '@/utils';

// Steps in the flow
type SetupStep = 'HOME' | 'THEME' | 'INSIGHTS' | 'DURATION' | 'VOICE' | 'SUMMARY';

const DURATION_OPTIONS = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '20 min', value: 20 },
];

export const DashboardV2: React.FC = () => {
    const { userEconomy, activeResolution, setView, isLoading, setPendingMeditationConfig, soundscapes, finalizeMeditationGeneration, user } = useApp();

    // UI state
    const [showContextOverlay, setShowContextOverlay] = useState(false);
    const [currentStep, setCurrentStep] = useState<SetupStep>('HOME');

    // Selection state
    const [selectedTheme, setSelectedTheme] = useState<ThemeConfig | null>(null);
    const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
    const [customInput, setCustomInput] = useState('');
    const [selectedDuration, setSelectedDuration] = useState<number>(10);
    const [selectedVoice, setSelectedVoice] = useState<'male' | 'female'>('female');

    // Insights from DB
    const [userInsights, setUserInsights] = useState<UserInsight[]>([]);
    const [filteredInsights, setFilteredInsights] = useState<UserInsight[]>([]);

    // Summary state
    const [summary, setSummary] = useState<{
        title: string;
        methodology: MethodologyType;
        focus: string;
        soundscapeId: string;
        preview: string;
    } | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);

    // Load user insights
    useEffect(() => {
        if (user?.supabaseId) {
            fetchUserInsights(user.supabaseId).then(insights => {
                setUserInsights(insights);
            }).catch(console.error);
        }
    }, [user?.supabaseId]);

    // Filter insights when theme changes
    useEffect(() => {
        if (selectedTheme && userInsights.length > 0) {
            const filtered = filterInsightsByTheme(userInsights, selectedTheme.id);
            setFilteredInsights(filtered);
        }
    }, [selectedTheme, userInsights]);

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

    // Progress calculation (5 steps: theme, insights, duration, voice, summary)
    const progress = useMemo(() => {
        let p = 0;
        if (selectedTheme) p += 20;
        if (selectedInsights.length > 0 || customInput) p += 20;
        if (selectedDuration) p += 20;
        // Voice always has a default
        p += 20;
        if (summary) p += 20;
        return p;
    }, [selectedTheme, selectedInsights, customInput, selectedDuration, summary]);

    // Handle theme selection - auto advance to INSIGHTS
    const handleThemeSelect = (theme: ThemeConfig) => {
        setSelectedTheme(theme);
        setSelectedInsights([]);
        setSummary(null);
        setCurrentStep('INSIGHTS');
    };



    // Toggle insight selection
    const toggleInsight = (text: string) => {
        setSelectedInsights(prev =>
            prev.includes(text) ? prev.filter(i => i !== text) : [...prev, text]
        );
    };

    // Generate summary
    const generateSummaryContent = async () => {
        setIsLoadingSummary(true);
        try {
            const combinedFocus = [...selectedInsights, customInput.trim()].filter(Boolean).join('. ');
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
                focus: selectedInsights.join('. '),
                soundscapeId: soundscapes[0]?.id || 'default',
                preview: `A ${selectedDuration}-minute session for ${selectedTheme?.label?.toLowerCase() || 'mindfulness'}.`
            });
        } finally {
            setIsLoadingSummary(false);
        }
    };

    // Start session
    const handleStartSession = async () => {
        if (!summary) return;

        // Save preferences
        if (user?.supabaseId) {
            updateUserPreferences(user.supabaseId, {
                voice: selectedVoice,
                lastTheme: selectedTheme?.id,
                lastDuration: selectedDuration
            });
        }

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

    // Button handlers
    const handleButtonClick = () => {
        switch (currentStep) {
            case 'HOME':
                setCurrentStep('THEME');
                break;
            case 'THEME':
                // Theme selection auto-advances
                break;
            // CATEGORY step removed - simpler flow
            case 'INSIGHTS':
                if (selectedInsights.length > 0 || customInput.trim()) {
                    setCurrentStep('DURATION');
                }
                break;
            case 'DURATION':
                setCurrentStep('VOICE');
                break;
            case 'VOICE':
                setCurrentStep('SUMMARY');
                generateSummaryContent();
                break;
            case 'SUMMARY':
                if (summary) handleStartSession();
                break;
        }
    };

    // Go back
    const goBack = () => {
        switch (currentStep) {
            case 'THEME': setCurrentStep('HOME'); break;
            case 'INSIGHTS': setCurrentStep('THEME'); setSelectedTheme(null); break;
            case 'DURATION': setCurrentStep('INSIGHTS'); break;
            case 'VOICE': setCurrentStep('DURATION'); break;
            case 'SUMMARY': setCurrentStep('VOICE'); setSummary(null); break;
        }
    };

    // Button label
    const getButtonLabel = () => {
        if (currentStep === 'HOME') return 'START';
        if (currentStep === 'SUMMARY' && summary) return 'BEGIN';
        if (currentStep === 'THEME') return 'SELECT';
        return 'NEXT';
    };

    const canProceed = () => {
        switch (currentStep) {
            case 'HOME': return true;
            case 'THEME': return !!selectedTheme;
            case 'INSIGHTS': return selectedInsights.length > 0 || customInput.trim().length > 0;
            case 'DURATION': return true;
            case 'VOICE': return true;
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
    const stepNumber = ['THEME', 'INSIGHTS', 'DURATION', 'VOICE', 'SUMMARY'].indexOf(currentStep) + 1;

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background-dark">
            {/* Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
                <button
                    onClick={() => isInSetup ? goBack() : setShowContextOverlay(true)}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-surface/50 border border-white/10 hover:border-white/20 transition-colors"
                >
                    {isInSetup ? <ChevronLeft className="w-5 h-5 text-white/60" /> : <Menu className="w-5 h-5 text-white/60" />}
                </button>

                {isInSetup && (
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
                        Step {stepNumber} of 5
                    </span>
                )}

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/50 border border-white/10">
                        <Coins className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-white">{userEconomy.balance}</span>
                    </div>
                    <button className="w-8 h-8 flex items-center justify-center rounded-full bg-surface/50 border border-white/10">
                        <Plus className="w-4 h-4 text-white/60" />
                    </button>
                </div>
            </header>

            {/* FIXED Content Area - key change for layout */}
            <main className="flex-1 flex flex-col relative z-10 min-h-0">
                {/* Scrollable content with max height */}
                <div className="flex-1 overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(100dvh - 220px)' }}>
                    {/* Fade gradient at top */}
                    <div className="sticky top-0 h-4 bg-gradient-to-b from-background-dark to-transparent pointer-events-none -mt-4 -mx-6 px-6" />

                    <AnimatePresence mode="wait">
                        {/* HOME */}
                        {currentStep === 'HOME' && (
                            <motion.div
                                key="home"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex items-center justify-center min-h-[300px]"
                            >
                                {activeResolution && (
                                    <div className="text-center">
                                        <div className="flex items-center gap-2 mb-3 justify-center opacity-60">
                                            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                            <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">Current Directive</span>
                                        </div>
                                        <p className="text-lg text-white/80 max-w-xs mx-auto">{activeResolution.statement}</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* THEME Selection */}
                        {currentStep === 'THEME' && (
                            <motion.div
                                key="theme"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-4 max-w-sm mx-auto"
                            >
                                <h2 className="text-lg font-bold text-white text-center mb-4">What do you need?</h2>
                                {THEMES.map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => handleThemeSelect(theme)}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                                            selectedTheme?.id === theme.id
                                                ? 'bg-primary/20 border-primary'
                                                : 'bg-surface/30 border-white/10 hover:border-white/20'
                                        )}
                                    >
                                        <span className="text-3xl">{theme.emoji}</span>
                                        <div>
                                            <span className="text-sm font-medium text-white">{theme.uxLabel}</span>
                                            <p className="text-xs text-white/40 mt-0.5">{theme.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}

                        {/* INSIGHTS Selection - now shows all theme-relevant insights */}
                        {currentStep === 'INSIGHTS' && (
                            <motion.div
                                key="insights"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-4 max-w-sm mx-auto"
                            >
                                <div className="text-center mb-2">
                                    <span className="text-2xl">{selectedTheme?.emoji}</span>
                                    <h2 className="text-lg font-bold text-white mt-2">What feels relevant?</h2>
                                    <p className="text-xs text-white/40 mt-1">Select from your history or describe below</p>
                                </div>

                                {/* Insights from DB */}
                                {filteredInsights.length > 0 ? (
                                    <div className="space-y-2">
                                        {filteredInsights.slice(0, 6).map(insight => (
                                            <button
                                                key={insight.id}
                                                onClick={() => toggleInsight(insight.text)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                                                    selectedInsights.includes(insight.text)
                                                        ? 'bg-primary/15 border-primary'
                                                        : 'bg-surface/30 border-white/10'
                                                )}
                                            >
                                                <span className="text-sm text-white/80 line-clamp-2">{insight.text}</span>
                                                {selectedInsights.includes(insight.text) && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}

                                {/* Custom input - agency-focused prompt */}
                                <textarea
                                    value={customInput}
                                    onChange={(e) => setCustomInput(e.target.value)}
                                    placeholder="What would feel like progress today?"
                                    rows={3}
                                    className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 resize-none"
                                />
                            </motion.div>
                        )}

                        {/* DURATION */}
                        {currentStep === 'DURATION' && (
                            <motion.div
                                key="duration"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6 max-w-sm mx-auto text-center"
                            >
                                <Clock className="w-12 h-12 text-primary/60 mx-auto" />
                                <h2 className="text-lg font-bold text-white">How long?</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {DURATION_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSelectedDuration(opt.value)}
                                            className={cn(
                                                "py-4 rounded-xl border-2 transition-all",
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

                        {/* VOICE Selection */}
                        {currentStep === 'VOICE' && (
                            <motion.div
                                key="voice"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6 max-w-sm mx-auto text-center"
                            >
                                <User className="w-12 h-12 text-primary/60 mx-auto" />
                                <h2 className="text-lg font-bold text-white">Voice preference</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setSelectedVoice('female')}
                                        className={cn(
                                            "py-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                            selectedVoice === 'female'
                                                ? 'bg-primary/20 border-primary'
                                                : 'bg-surface/30 border-white/10'
                                        )}
                                    >
                                        <span className="text-2xl">👩</span>
                                        <span className="text-sm text-white">Female</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedVoice('male')}
                                        className={cn(
                                            "py-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                            selectedVoice === 'male'
                                                ? 'bg-primary/20 border-primary'
                                                : 'bg-surface/30 border-white/10'
                                        )}
                                    >
                                        <span className="text-2xl">👨</span>
                                        <span className="text-sm text-white">Male</span>
                                    </button>
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
                                className="space-y-4 max-w-sm mx-auto"
                            >
                                {isLoadingSummary && !summary ? (
                                    <div className="text-center py-12">
                                        <Loader2 className="w-10 h-10 text-primary/60 animate-spin mx-auto mb-3" />
                                        <p className="text-sm text-white/50">Designing your session...</p>
                                    </div>
                                ) : summary ? (
                                    <>
                                        <div className="text-center space-y-3">
                                            <Sparkles className="w-10 h-10 text-primary/60 mx-auto" />
                                            <h3 className="text-2xl font-bold text-white">{summary.title}</h3>
                                            <p className="text-sm text-white/60">{summary.focus}</p>
                                        </div>
                                    </>
                                ) : null}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Fade gradient at bottom */}
                    <div className="sticky bottom-0 h-4 bg-gradient-to-t from-background-dark to-transparent pointer-events-none -mb-4 -mx-6 px-6" />
                </div>
            </main>

            {/* FIXED Button at bottom */}
            <footer className="relative z-20 flex justify-center pb-8 pt-4 shrink-0">
                <MainButton
                    position={currentStep === 'HOME' ? 'center' : 'bottom'}
                    state={currentStep === 'HOME' ? 'idle' : 'setup'}
                    progress={progress}
                    isLoading={isLoadingSummary}
                    label={getButtonLabel()}
                    onClick={handleButtonClick}
                    disabled={!canProceed()}
                    size={currentStep === 'HOME' ? 'large' : 'normal'}
                />
            </footer>

            {/* Context Overlay */}
            <InsightsContextOverlay
                isOpen={showContextOverlay}
                onClose={() => setShowContextOverlay(false)}
            />
        </div>
    );
};

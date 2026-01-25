/**
 * SessionPrep - Unified Setup UX
 * Single screen with progress ring, Director summary, and freeform refinement
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { ViewState, MethodologyType, SessionSummaryPreview } from '../../types';
import { ArrowLeft, Sparkles, Clock, MessageSquare, RefreshCw, ChevronDown, Loader2 } from 'lucide-react';
import { generateSessionSummary } from '../../services/geminiService';
import { ProgressRing } from '../ui/ProgressRing';
import { cn } from '@/utils';
import { CLINICAL_PROTOCOLS } from '../../server/protocols';

interface ThemeOption {
    label: string;
    emoji: string;
    value: string;
}

const PRESET_THEMES: ThemeOption[] = [
    { label: 'Calm', emoji: '🧘', value: 'Finding inner calm and peace' },
    { label: 'Energy', emoji: '⚡', value: 'Boosting energy and motivation' },
    { label: 'Sleep', emoji: '🌙', value: 'Better sleep and deep rest' },
    { label: 'Focus', emoji: '🎯', value: 'Sharp focus and mental clarity' },
    { label: 'Stress', emoji: '💨', value: 'Releasing stress and tension' },
    { label: 'Growth', emoji: '🌱', value: 'Personal growth and self-discovery' },
];

const DURATION_OPTIONS = [
    { label: '5m', value: 5 },
    { label: '10m', value: 10 },
    { label: '15m', value: 15 },
    { label: '20m', value: 20 },
];

const METHODOLOGY_INFO: Record<string, { label: string; desc: string }> = {
    'NSDR': { label: 'NSDR', desc: 'Non-Sleep Deep Rest' },
    'SOMATIC_AGENCY': { label: 'Somatic', desc: 'Body-based release' },
    'IFS': { label: 'IFS', desc: 'Parts work & inner dialogue' },
    'GENERAL': { label: 'Mindfulness', desc: 'Breath & awareness' },
};

export const SessionPrep: React.FC = () => {
    const { setView, soundscapes, pendingMeditationConfig, setPendingMeditationConfig, finalizeMeditationGeneration } = useApp();

    // Alignment state
    const [selectedTheme, setSelectedTheme] = useState<string>('');
    const [selectedDuration, setSelectedDuration] = useState<number>(5);
    const [customContext, setCustomContext] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    // Director summary state
    const [summary, setSummary] = useState<SessionSummaryPreview | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    // Refinement state
    const [showRefinement, setShowRefinement] = useState(false);
    const [refinementText, setRefinementText] = useState('');
    const [showMethodologyPicker, setShowMethodologyPicker] = useState(false);

    // Calculate progress (0-100)
    const calculateProgress = useCallback(() => {
        let progress = 0;
        if (selectedTheme) progress += 40;
        if (selectedDuration) progress += 30;
        if (summary) progress += 30;
        return progress;
    }, [selectedTheme, selectedDuration, summary]);

    const progress = calculateProgress();
    const isReady = progress >= 100;

    // Generate Director summary when theme + duration are set
    useEffect(() => {
        if (!selectedTheme || summary || isLoadingSummary) return;

        const generateSummary = async () => {
            setIsLoadingSummary(true);
            setSummaryError(null);

            try {
                const soundscapeInfo = soundscapes.map(s => ({
                    id: s.id,
                    name: s.name,
                    mood: s.metadata?.mood
                }));

                const result = await generateSessionSummary(
                    selectedTheme,
                    selectedDuration,
                    customContext || undefined,
                    undefined,
                    soundscapeInfo
                );

                setSummary({
                    ...result,
                    duration: selectedDuration
                });
            } catch (error) {
                console.error('Failed to generate summary:', error);
                setSummaryError('Failed to generate session preview');
            } finally {
                setIsLoadingSummary(false);
            }
        };

        // Small delay for smooth UX
        const timer = setTimeout(generateSummary, 500);
        return () => clearTimeout(timer);
    }, [selectedTheme, selectedDuration, customContext, soundscapes]);

    // Handle refinement submission
    const handleRefine = async () => {
        if (!refinementText.trim() || !summary) return;

        setIsLoadingSummary(true);
        setSummaryError(null);

        try {
            const soundscapeInfo = soundscapes.map(s => ({
                id: s.id,
                name: s.name,
                mood: s.metadata?.mood
            }));

            const result = await generateSessionSummary(
                selectedTheme,
                selectedDuration,
                customContext || undefined,
                refinementText,
                soundscapeInfo
            );

            setSummary({
                ...result,
                duration: selectedDuration
            });
            setRefinementText('');
            setShowRefinement(false);
        } catch (error) {
            console.error('Failed to refine summary:', error);
            setSummaryError('Failed to refine session');
        } finally {
            setIsLoadingSummary(false);
        }
    };

    // Handle methodology swap
    const handleMethodologyChange = async (newMethodology: MethodologyType) => {
        if (!summary) return;

        setSummary(prev => prev ? { ...prev, methodology: newMethodology } : null);
        setShowMethodologyPicker(false);

        // Regenerate with new methodology
        setIsLoadingSummary(true);
        try {
            const soundscapeInfo = soundscapes.map(s => ({
                id: s.id,
                name: s.name,
                mood: s.metadata?.mood
            }));

            const result = await generateSessionSummary(
                selectedTheme,
                selectedDuration,
                customContext || undefined,
                `Use ${newMethodology} methodology specifically`,
                soundscapeInfo
            );

            setSummary({
                ...result,
                methodology: newMethodology,
                duration: selectedDuration
            });
        } catch (error) {
            console.error('Failed to regenerate with new methodology:', error);
        } finally {
            setIsLoadingSummary(false);
        }
    };

    // Handle session start
    const handleStart = async () => {
        if (!summary) return;

        // Set pending config
        setPendingMeditationConfig({
            focus: summary.focus,
            methodology: summary.methodology,
            intensity: 'MODERATE',
            duration: summary.duration,
            soundscapeId: summary.soundscapeId
        });

        // Navigate to loading/generation screen
        setView(ViewState.LOADING);

        // Start generation
        await finalizeMeditationGeneration();
    };

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background-dark font-display max-w-md mx-auto">
            {/* Background glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 pt-8 pb-4 shrink-0">
                <button
                    onClick={() => setView(ViewState.DASHBOARD)}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-lg font-bold text-white tracking-wide">Align</h1>
                    <span className="text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase">
                        {progress < 100 ? 'Configure' : 'Ready'}
                    </span>
                </div>
                <div className="w-10" />
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto px-6 pb-48 space-y-6">

                {/* Progress Ring with START */}
                <div className="flex justify-center py-4">
                    <ProgressRing progress={progress} size={180} strokeWidth={4}>
                        <button
                            onClick={isReady ? handleStart : undefined}
                            disabled={!isReady || isLoadingSummary}
                            className={cn(
                                "w-[160px] h-[160px] rounded-full flex flex-col items-center justify-center transition-all duration-300",
                                isReady
                                    ? "bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                                    : "bg-surface/30 text-white/40 cursor-default"
                            )}
                        >
                            {isLoadingSummary ? (
                                <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
                            ) : (
                                <>
                                    <span className="text-2xl font-bold">{isReady ? 'START' : 'ALIGN'}</span>
                                    <span className="text-xs opacity-60 mt-1">{Math.round(progress)}%</span>
                                </>
                            )}
                        </button>
                    </ProgressRing>
                </div>

                {/* Theme Selection */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary/60" />
                        <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">What do you need?</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {PRESET_THEMES.map(theme => (
                            <button
                                key={theme.value}
                                onClick={() => {
                                    setSelectedTheme(theme.value);
                                    setSummary(null); // Reset summary to trigger regeneration
                                }}
                                className={cn(
                                    "flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-center transition-all border",
                                    selectedTheme === theme.value
                                        ? 'bg-primary/15 border-primary text-white'
                                        : 'bg-surface/30 border-white/5 text-white/70 hover:border-white/20'
                                )}
                            >
                                <span className="text-xl">{theme.emoji}</span>
                                <span className="text-xs font-medium">{theme.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration Selection */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary/60" />
                        <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">Duration</span>
                    </div>
                    <div className="flex gap-2">
                        {DURATION_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    setSelectedDuration(opt.value);
                                    if (summary) setSummary(prev => prev ? { ...prev, duration: opt.value } : null);
                                }}
                                className={cn(
                                    "flex-1 py-3 rounded-xl border transition-all text-center",
                                    selectedDuration === opt.value
                                        ? 'bg-primary/15 border-primary text-white font-bold'
                                        : 'bg-surface/30 border-white/10 text-white/60 hover:border-white/20'
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Context Input */}
                <div>
                    <button
                        onClick={() => setShowCustomInput(!showCustomInput)}
                        className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                            showCustomInput
                                ? 'bg-primary/10 border-primary/50'
                                : 'bg-surface/30 border-white/10 hover:border-white/20'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <MessageSquare className={cn("w-4 h-4", showCustomInput ? 'text-primary' : 'text-white/50')} />
                            <span className={cn("text-sm", showCustomInput ? 'text-white' : 'text-white/60')}>
                                Add more context
                            </span>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 transition-transform text-white/30", showCustomInput && 'rotate-180')} />
                    </button>

                    {showCustomInput && (
                        <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                            <textarea
                                value={customContext}
                                onChange={(e) => {
                                    setCustomContext(e.target.value);
                                    setSummary(null); // Will regenerate
                                }}
                                placeholder="I'm feeling... I want to work on... I need help with..."
                                rows={3}
                                className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:outline-none resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Director Summary Card */}
                {summary && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 bg-surface/40 border border-white/10 rounded-2xl p-5 space-y-4">
                        {/* Title & Methodology */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">{summary.title}</h3>
                                <p className="text-sm text-primary/80">{summary.focus}</p>
                            </div>
                            <button
                                onClick={() => setShowMethodologyPicker(!showMethodologyPicker)}
                                className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-primary/30 transition-colors"
                            >
                                {METHODOLOGY_INFO[summary.methodology]?.label || summary.methodology}
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Methodology Picker */}
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
                                        <p className="text-[10px] text-white/50 mt-0.5">{info.desc}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Preview */}
                        <div className="border-t border-white/10 pt-4">
                            <p className="text-[10px] font-bold tracking-[0.15em] text-white/40 uppercase mb-2">What to Expect</p>
                            <p className="text-sm text-white/70 leading-relaxed">{summary.preview}</p>
                        </div>

                        {/* Refinement */}
                        {showRefinement ? (
                            <div className="space-y-3 animate-in fade-in">
                                <textarea
                                    value={refinementText}
                                    onChange={(e) => setRefinementText(e.target.value)}
                                    placeholder="e.g. 'make it more visual', 'add a practical challenge', 'use more symbolism'"
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
                                className="flex items-center gap-2 text-sm text-primary/70 hover:text-primary transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refine with your words
                            </button>
                        )}
                    </div>
                )}

                {/* Loading state */}
                {isLoadingSummary && !summary && (
                    <div className="flex flex-col items-center justify-center py-8 animate-in fade-in">
                        <Loader2 className="w-8 h-8 text-primary/60 animate-spin mb-3" />
                        <p className="text-sm text-white/50">Designing your session...</p>
                    </div>
                )}

                {/* Error state */}
                {summaryError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                        <p className="text-sm text-red-400">{summaryError}</p>
                        <button
                            onClick={() => {
                                setSummaryError(null);
                                setSummary(null);
                            }}
                            className="text-xs text-red-300 underline mt-2"
                        >
                            Try again
                        </button>
                    </div>
                )}
            </main>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent pointer-events-none"></div>
        </div>
    );
};

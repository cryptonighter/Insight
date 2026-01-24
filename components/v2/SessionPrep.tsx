/**
 * SessionPrep - Pre-session context gathering screen
 * Collects user intention before starting meditation session
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ViewState } from '../../types';
import { ArrowLeft, Mic, Sparkles, Clock, ChevronRight, CheckCircle, MessageSquare, History } from 'lucide-react';
import { fetchSessionHistory, SessionHistorySummary } from '../../services/userHistoryService';
import { cn } from '@/utils';

interface ThemeOption {
    label: string;
    emoji: string;
    value: string;
}

const PRESET_THEMES: ThemeOption[] = [
    { label: 'Calm', emoji: '🧘', value: 'Finding inner calm and peace' },
    { label: 'Energy', emoji: '💪', value: 'Boosting energy and motivation' },
    { label: 'Sleep', emoji: '😴', value: 'Better sleep and deep rest' },
    { label: 'Focus', emoji: '🎯', value: 'Sharp focus and mental clarity' },
    { label: 'Stress', emoji: '💭', value: 'Releasing stress and tension' },
    { label: 'Gratitude', emoji: '🙏', value: 'Cultivating gratitude and appreciation' },
];

const DURATION_OPTIONS = [
    { label: '5 min', value: 5, desc: 'Quick reset' },
    { label: '10 min', value: 10, desc: 'Standard' },
    { label: '15 min', value: 15, desc: 'Deep dive' },
    { label: '20 min', value: 20, desc: 'Extended' },
];

export const SessionPrep: React.FC = () => {
    const { setView, startMorningSession, user, activeResolution, setPendingMeditationConfig, pendingMeditationConfig } = useApp();

    // State
    const [selectedTheme, setSelectedTheme] = useState<string>('');
    const [customInput, setCustomInput] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [selectedDuration, setSelectedDuration] = useState(10);
    const [userHistory, setUserHistory] = useState<SessionHistorySummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch user history for personalized suggestions
    useEffect(() => {
        if (user?.supabaseId) {
            fetchSessionHistory(user.supabaseId).then(history => {
                if (history.totalSessions > 0) {
                    setUserHistory(history);
                }
            }).catch(console.error);
        }
    }, [user?.supabaseId]);

    const handleStartSession = async () => {
        if (isLoading) return;
        setIsLoading(true);

        const focus = showCustom && customInput.trim()
            ? customInput.trim()
            : selectedTheme || 'Finding calm and clarity';

        try {
            await startMorningSession(focus);
        } catch (error) {
            console.error('Failed to start session:', error);
            setIsLoading(false);
        }
    };

    const getEffectiveFocus = () => {
        if (showCustom && customInput.trim()) return customInput.trim();
        if (selectedTheme) return selectedTheme;
        return null;
    };

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background-dark font-display max-w-md mx-auto">
            {/* Background */}
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
                    <h1 className="text-lg font-bold text-white tracking-wide">Session Setup</h1>
                    <span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">Step 1 of 1</span>
                </div>
                <div className="w-10" />
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto px-6 pb-32">

                {/* User History Quick Picks */}
                {userHistory && userHistory.frequentThemes.length > 0 && (
                    <div className="mb-8 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-3">
                            <History className="w-4 h-4 text-primary/60" />
                            <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">Your Frequent Themes</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {userHistory.frequentThemes.slice(0, 3).map(theme => (
                                <button
                                    key={theme}
                                    onClick={() => {
                                        setSelectedTheme(theme);
                                        setShowCustom(false);
                                    }}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                                        selectedTheme === theme
                                            ? 'bg-primary/20 border-primary text-primary'
                                            : 'bg-surface/50 border-white/10 text-white/70 hover:border-white/20'
                                    )}
                                >
                                    <CheckCircle className={cn("w-3 h-3 inline mr-1.5", selectedTheme === theme ? 'opacity-100' : 'opacity-0')} />
                                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Theme Selection */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-primary/60" />
                        <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">What do you need today?</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {PRESET_THEMES.map(theme => (
                            <button
                                key={theme.value}
                                onClick={() => {
                                    setSelectedTheme(theme.value);
                                    setShowCustom(false);
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 rounded-xl text-left transition-all border",
                                    selectedTheme === theme.value && !showCustom
                                        ? 'bg-primary/15 border-primary text-white'
                                        : 'bg-surface/50 border-white/5 text-white/70 hover:border-white/20'
                                )}
                            >
                                <span className="text-lg">{theme.emoji}</span>
                                <span className="text-sm font-medium">{theme.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Input Toggle */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowCustom(!showCustom)}
                        className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                            showCustom
                                ? 'bg-primary/15 border-primary'
                                : 'bg-surface/30 border-white/10 hover:border-white/20'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <MessageSquare className={cn("w-4 h-4", showCustom ? 'text-primary' : 'text-white/50')} />
                            <span className={cn("text-sm font-medium", showCustom ? 'text-white' : 'text-white/70')}>
                                Share what's on your mind
                            </span>
                        </div>
                        <ChevronRight className={cn("w-4 h-4 transition-transform text-white/30", showCustom && 'rotate-90')} />
                    </button>

                    {showCustom && (
                        <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                            <textarea
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                placeholder="I'm feeling... I want to work on... I need help with..."
                                rows={3}
                                className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:outline-none resize-none"
                            />
                            <p className="text-[10px] text-white/30 mt-2 text-center">
                                This helps personalize your session
                            </p>
                        </div>
                    )}
                </div>

                {/* Duration Selection */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-primary/60" />
                        <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">Session Length</span>
                    </div>
                    <div className="flex gap-2">
                        {DURATION_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setSelectedDuration(opt.value)}
                                className={cn(
                                    "flex-1 flex flex-col items-center py-3 rounded-xl border transition-all",
                                    selectedDuration === opt.value
                                        ? 'bg-primary/15 border-primary'
                                        : 'bg-surface/30 border-white/10 hover:border-white/20'
                                )}
                            >
                                <span className={cn("text-sm font-bold", selectedDuration === opt.value ? 'text-white' : 'text-white/70')}>
                                    {opt.label}
                                </span>
                                <span className="text-[9px] text-white/40 mt-0.5">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* Start Button */}
            <footer className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent">
                <button
                    onClick={handleStartSession}
                    disabled={isLoading}
                    className={cn(
                        "w-full py-4 rounded-2xl font-bold text-lg transition-all",
                        getEffectiveFocus()
                            ? 'bg-primary text-black hover:bg-primary/90 shadow-[0_0_30px_rgba(74,222,128,0.3)]'
                            : 'bg-primary/30 text-white/50',
                        isLoading && 'opacity-50 cursor-wait'
                    )}
                >
                    {isLoading ? 'Starting Session...' : 'Begin Session'}
                </button>
                {!getEffectiveFocus() && (
                    <p className="text-center text-[10px] text-white/30 mt-2">Select a theme or share what's on your mind</p>
                )}
            </footer>
        </div>
    );
};

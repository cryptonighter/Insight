
import React from 'react';
import { useApp } from '../../context/AppContext';
import { ViewState } from '../../types';
import { ChevronRight, Brain, Bookmark, CheckCircle, RotateCcw, Share2, MessageSquare, Bot } from 'lucide-react';
import { cn } from '@/utils';

export const SessionSummaryV2: React.FC = () => {
    const { setView, lastSessionData } = useApp();

    if (!lastSessionData) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-dark text-white">
                <p>No session data available.</p>
                <button onClick={() => setView(ViewState.DASHBOARD)} className="ml-4 underline">Return Home</button>
            </div>
        );
    }

    // Parse transcript to primitive chat bubble format
    // Format is "Speaker: Text" or similar from the service
    const transcriptLines = lastSessionData.transcript.split('\n').filter(line => line.trim() !== '');

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background-dark font-display max-w-md mx-auto shadow-2xl">
            {/* Header */}
            <header className="relative z-20 flex flex-col bg-background-dark/95 backdrop-blur-sm border-b border-white/5 pt-8 pb-4 px-6 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={() => setView(ViewState.DASHBOARD)} className="text-white/50 hover:text-white transition-colors">
                        <ChevronRight className="rotate-180 w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-center">
                        <h2 className="text-white text-lg font-bold leading-none tracking-tight">SESSION COMPLETE</h2>
                        <span className="text-primary text-[10px] tracking-[0.2em] font-medium mt-1 uppercase text-emerald-400">
                            {lastSessionData.methodology || 'Alignment'} Protocol
                        </span>
                    </div>
                    <div className="w-6 h-6" /> {/* Spacer */}
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto w-full px-6 pt-6 pb-32">
                {/* Session Focus */}
                {lastSessionData.focus && (
                    <div className="flex justify-center mb-6">
                        <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 text-center">
                            <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase block mb-1">Today's Focus</span>
                            <span className="text-sm text-white font-medium">{lastSessionData.focus}</span>
                        </div>
                    </div>
                )}

                {/* Timestamp Pill */}
                <div className="flex justify-center mb-8">
                    <span className="bg-surface border border-white/5 text-white/40 text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-bold">
                        Today, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* Core Takeaways Module */}
                <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-surface shadow-[0_0_20px_rgba(13,242,89,0.05)] p-5 mb-8 group">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500 pointer-events-none"></div>

                    <div className="relative flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-primary text-[10px] font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5">
                                    <Brain className="w-3 h-3" />
                                    Session Intel
                                </p>
                                <h3 className="text-white text-xl md:text-2xl font-bold leading-tight">
                                    {lastSessionData.summary ? 'KEY INSIGHTS' : 'SESSION SUMMARY'}
                                </h3>
                            </div>
                            <div className="bg-black/30 px-2 py-1 rounded border border-white/10">
                                <Bookmark className="w-4 h-4 text-primary" />
                            </div>
                        </div>

                        {/* AI Summary Text */}
                        <div className="text-white/80 text-sm leading-relaxed border-l-2 border-primary/50 pl-4 py-1">
                            {lastSessionData.summary || `You completed a ${lastSessionData.methodology || 'focus'} session${lastSessionData.focus ? ` on "${lastSessionData.focus}"` : ''}. Take a moment to reflect on how you feel.`}
                        </div>

                        {/* User's Own Insights */}
                        {lastSessionData.userInsights && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-primary text-[10px] font-bold tracking-widest uppercase mb-2 flex items-center gap-1.5">
                                    <MessageSquare className="w-3 h-3" />
                                    Your Reflection
                                </p>
                                <p className="text-white/70 text-sm italic">"{lastSessionData.userInsights}"</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transcript Header */}
                <div className="flex items-center gap-4 mb-6 opacity-50">
                    <div className="h-[1px] flex-1 bg-white/20"></div>
                    <h3 className="text-white text-[10px] font-bold tracking-widest uppercase">Transcript Log</h3>
                    <div className="h-[1px] flex-1 bg-white/20"></div>
                </div>

                {/* Chat Stream */}
                <div className="flex flex-col gap-6">
                    {transcriptLines.map((line, i) => {
                        const isAI = line.startsWith('Advisor:') || line.includes('Insight AI');
                        const text = line.replace(/^(Advisor:|Explorer:|Insight AI:|You:)/i, '').trim();

                        if (!text) return null;

                        return (
                            <div key={i} className={cn("flex gap-3", !isAI && "flex-row-reverse")}>
                                <div className={cn(
                                    "mt-1 size-8 rounded-full border border-white/10 flex items-center justify-center shrink-0 shadow-lg",
                                    isAI ? "bg-gradient-to-br from-surface to-black" : "bg-white/10"
                                )}>
                                    {isAI ? <Bot className="w-4 h-4 text-primary" /> : <div className="w-4 h-4 bg-white/50 rounded-full" />}
                                </div>
                                <div className={cn("flex flex-col gap-1 max-w-[85%]", !isAI && "items-end")}>
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-[10px] uppercase tracking-wider font-bold", isAI ? "text-primary" : "text-white")}>
                                            {isAI ? "Insight AI" : "You"}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "p-3 rounded-xl border text-sm leading-relaxed shadow-sm",
                                        isAI ? "bg-surface border-white/5 text-white/90 rounded-tl-none" : "bg-transparent border-white/20 text-white rounded-tr-none"
                                    )}>
                                        {text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Sticky Footer Actions */}
            <footer className="absolute bottom-0 w-full z-30 bg-background-dark/95 backdrop-blur-xl border-t border-white/10 p-5 pb-8">
                {/* Visual Token Reward */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-black border border-primary/30 text-primary px-3 py-1 rounded-full text-[10px] font-bold shadow-[0_0_10px_rgba(74,222,128,0.2)] flex items-center gap-1 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        1 Token Earned
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-1">
                    <button className="h-12 w-12 rounded-xl bg-surface border border-white/10 text-white/50 hover:text-white flex items-center justify-center hover:bg-white/5 transition-colors">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button className="h-12 w-12 rounded-xl bg-surface border border-white/10 text-white/50 hover:text-white flex items-center justify-center hover:bg-white/5 transition-colors">
                        <Share2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setView(ViewState.DASHBOARD)}
                        className="flex-1 h-12 rounded-xl bg-primary text-background-dark font-bold text-sm tracking-wide uppercase hover:bg-primary-dim transition-all shadow-[0_0_15px_rgba(74,222,128,0.3)] flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Confirm & Exit
                    </button>
                </div>
            </footer>
        </div>
    );
};

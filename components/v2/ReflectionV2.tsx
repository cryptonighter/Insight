
import React, { useEffect, useState } from 'react';
import { useVoiceReflection } from '../../services/useVoiceReflection';
import { ViewState } from '../../types';
import { useApp } from '../../context/AppContext';
import { Mic, Square, ChevronDown, Settings, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/utils';
import { ReflectionOrb } from './ReflectionOrb';

export const ReflectionV2: React.FC = () => {
    const { setView } = useApp();
    const {
        isConnected,
        isTalking,
        isWrappingUp,
        currentQuestion,
        connect,
        disconnect,
        handleEndSession
    } = useVoiceReflection();

    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        // Cleanup on unmount
        return () => disconnect();
    }, []);

    const handleStart = () => {
        setHasStarted(true);
        connect();
    };

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-dark font-display">
            {/* Background Ambience */}
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[100%] bg-primary/5 blur-[120px] rounded-full opacity-20 animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[100px] rounded-full opacity-20" />
            </div>

            {/* Header / Top Bar */}
            <header className="relative z-20 flex items-center justify-between p-6 pt-8 w-full max-w-md mx-auto">
                <button
                    onClick={() => { disconnect(); setView(ViewState.DASHBOARD); }}
                    className="flex size-10 items-center justify-center rounded-full bg-surface/50 border border-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                    <ChevronDown className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase">Reflection Mode</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full transition-colors",
                            !hasStarted ? "bg-white/20" :
                                isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 animate-pulse")}></div>
                        <span className={cn("text-[10px] tracking-wider font-medium uppercase transition-colors",
                            !hasStarted ? "text-white/30" :
                                isConnected ? "text-emerald-400" : "text-amber-400")}>
                            {
                                !hasStarted ? "Ready" :
                                    isConnected ? "Live Uplink" : "Connecting..."
                            }
                        </span>
                    </div>
                </div>

                <button className="flex size-10 items-center justify-center rounded-full bg-surface/50 border border-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all opacity-50 hover:opacity-100">
                    <Settings className="w-4 h-4" />
                </button>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-6 relative z-10 -mt-10">

                {/* Visualizer Orb or Start Button */}
                <div className="mb-12">
                    {!hasStarted ? (
                        <button
                            onClick={handleStart}
                            className="group relative flex items-center justify-center w-40 h-40 rounded-full bg-surface border border-white/10 hover:border-primary/50 transition-all duration-500 hover:scale-105"
                        >
                            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex flex-col items-center gap-2 relative z-10 text-white/50 group-hover:text-white transition-colors">
                                <Sparkles className="w-8 h-8" />
                                <span className="text-xs uppercase tracking-widest font-bold">Begin</span>
                            </div>
                        </button>
                    ) : (
                        <ReflectionOrb isConnected={isConnected} isTalking={isTalking} />
                    )}
                </div>

                {/* Text Output / Captions */}
                <div className="w-full text-center space-y-4 min-h-[120px] flex flex-col justify-start items-center">
                    {currentQuestion ? (
                        <h1 className="text-xl md:text-2xl text-white/90 font-light leading-relaxed animate-fade-in transition-all">
                            "{currentQuestion}"
                        </h1>
                    ) : (
                        <div className="flex flex-col items-center gap-2 opacity-50">
                            <Loader2 className="w-4 h-4 animate-spin text-primary/50" />
                            <span className="text-xs uppercase tracking-widest text-primary/50">{isConnected ? "Listening..." : "Initializing..."}</span>
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Controls */}
            <div className="relative z-20 pb-12 px-6 w-full max-w-md mx-auto">
                {/* Control Bar */}
                <div className="glass-panel rounded-3xl p-2 flex items-center justify-between shadow-2xl border-white/5">

                    {/* Mute/Listening Indicator (Left) */}
                    <div className="w-16 flex justify-center">
                        <div className={cn(
                            "flex flex-col items-center gap-1 transition-opacity duration-300",
                            isTalking ? "opacity-100" : "opacity-30"
                        )}>
                            <div className="flex gap-0.5 items-end h-4">
                                <div className="w-0.5 bg-primary h-2 animate-pulse" />
                                <div className="w-0.5 bg-primary h-4 animate-pulse delay-75" />
                                <div className="w-0.5 bg-primary h-3 animate-pulse delay-150" />
                            </div>
                        </div>
                    </div>

                    {/* Main Action Button (Center) */}
                    <div className="relative -top-6">
                        <div className={cn("absolute inset-0 rounded-full bg-primary/20 blur-xl transition-opacity duration-500", isTalking ? "opacity-100" : "opacity-0")} />
                        <button
                            className={cn(
                                "relative size-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 border-4 border-background-dark",
                                isTalking ? "bg-white text-black scale-105" : "bg-surface text-white border-white/10 hover:bg-primary hover:text-black hover:border-transparent"
                            )}
                            disabled // Always active in this mode, technically used for visual anchor
                        >
                            <Mic className={cn("w-8 h-8 transition-transform", isTalking ? "scale-110" : "scale-100")} />
                        </button>
                    </div>

                    {/* End Session (Right) */}
                    <div className="w-16 flex justify-center">
                        <button
                            onClick={handleEndSession}
                            disabled={isWrappingUp}
                            className={cn(
                                "group size-10 rounded-full flex items-center justify-center transition-all bg-white/5 hover:bg-red-500/20",
                                isWrappingUp ? "cursor-wait opacity-50" : "hover:scale-105"
                            )}
                        >
                            {isWrappingUp ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                            ) : (
                                <Square className="w-4 h-4 text-white/50 group-hover:text-red-400 fill-current" />
                            )}
                        </button>
                    </div>

                </div>
                <div className="mt-4 text-center">
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Insight Session Active</p>
                </div>
            </div>
        </div>
    );
};

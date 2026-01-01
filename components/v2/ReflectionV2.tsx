import React, { useEffect, useState } from 'react';
import { useVoiceReflection } from '../../services/useVoiceReflection';
import { ViewState } from '../../types';
import { useApp } from '../../context/AppContext';
import { Mic, Square, Keyboard, ChevronDown, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/utils';

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
        // Auto-connect on mount for "Live" feel? Or wait for user?
        // Stitch UI implies "Live Session" immediately. 
        // Let's auto-connect.
        connect();
        setHasStarted(true);
        return () => disconnect();
    }, []);

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden max-w-md mx-auto shadow-2xl bg-background-dark font-display transition-colors duration-500">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-surface/50 to-transparent pointer-events-none"></div>

            <header className="absolute top-0 left-0 right-0 z-20 flex flex-col bg-transparent">
                <div className="flex items-center p-4 pb-2 justify-between">
                    <button
                        onClick={() => { disconnect(); setView(ViewState.DASHBOARD); }}
                        className="text-white/50 hover:text-white flex size-10 items-center justify-center rounded-full hover:bg-white/5 transition-colors"
                    >
                        <ChevronDown className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-center">
                        <h2 className="text-white text-sm font-bold leading-none tracking-tight opacity-90">EVENING REFLECTION</h2>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-primary text-[10px] tracking-[0.2em] font-medium uppercase">
                                {isConnected ? "Live Session" : "Connecting..."}
                            </span>
                        </div>
                    </div>
                    <button className="flex items-center justify-center size-10 text-white/50 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full pt-10">
                {/* Visualizer Orb */}
                <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center mb-8 animate-float">
                    <div className={`absolute inset-0 bg-primary/5 blur-[60px] rounded-full transition-opacity duration-500 ${isTalking ? 'opacity-100 scale-110' : 'opacity-50 scale-100'}`}></div>

                    {/* Rings */}
                    <div className={`absolute inset-0 border border-primary/10 rounded-full transition-all duration-1000 ${isTalking ? 'scale-[1.3] animate-pulse-slow' : 'scale-100'}`}></div>
                    <div className="absolute inset-0 border border-primary/20 rounded-full scale-[1.15]"></div>

                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#122418] to-black border border-white/5 flex items-center justify-center shadow-[0_0_50px_-10px_rgba(13,242,89,0.15)] overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(13,242,89,0.15),transparent_60%)]"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(20,80,40,0.5),transparent_60%)]"></div>

                        {/* Center Core */}
                        <div className="w-32 h-32 bg-black/40 backdrop-blur-md rounded-full border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(13,242,89,0.2)] relative group">
                            {isTalking && <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse"></div>}
                            <Sparkles className={`w-12 h-12 text-primary transition-opacity duration-300 ${isTalking ? 'opacity-100' : 'opacity-60'}`} />
                        </div>
                    </div>
                </div>

                {/* AI Text Output */}
                <div className="w-full px-6 text-center space-y-4 max-w-sm mx-auto z-20 min-h-[120px] flex flex-col justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/20 border border-white/10 mb-2 w-fit mx-auto backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-white/60 text-[10px] uppercase tracking-widest font-bold">Insight AI</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl text-white font-display font-medium leading-tight transition-all duration-300">
                        "{currentQuestion || "Initializing neural link..."}"
                    </h1>
                </div>
            </main>

            {/* Bottom Controls */}
            <div className="relative w-full bg-gradient-to-t from-black via-background-dark to-transparent pt-10 pb-8 px-6 z-30">
                {/* Visualizer Bars (Decorative for now) */}
                <div aria-hidden="true" className="h-16 flex items-center justify-center gap-2 mb-8 opacity-50">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className={`w-1.5 bg-primary/40 rounded-full transition-all duration-100 ${isTalking ? 'animate-pulse h-8' : 'h-2'}`} style={{ height: isTalking ? Math.random() * 40 + 10 : 8 }}></div>
                    ))}
                </div>

                <div className="flex items-center justify-between max-w-xs mx-auto">
                    <button className="group flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                        <div className="size-12 rounded-full bg-surface border border-white/10 text-white/50 group-hover:text-white group-hover:border-white/30 flex items-center justify-center transition-all">
                            <Keyboard className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-white/30 group-hover:text-white/50 transition-colors">Type</span>
                    </button>

                    <div className="relative -top-2">
                        <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full"></div>
                        <button className="relative size-20 rounded-full bg-primary text-background-dark shadow-[0_0_30px_rgba(13,242,89,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                            <Mic className="w-8 h-8 text-background-dark" />
                        </button>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-primary animate-pulse">
                                {isTalking ? "Speaking..." : "Listening..."}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleEndSession}
                        disabled={isWrappingUp}
                        className="group flex flex-col items-center gap-2"
                    >
                        <div className="size-12 rounded-full bg-surface border border-white/10 text-white/50 group-hover:text-red-400 group-hover:border-red-400/30 flex items-center justify-center transition-all">
                            <Square className="w-4 h-4 fill-current" />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-white/30 group-hover:text-red-400/50 transition-colors">
                            {isWrappingUp ? "Saving..." : "End"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

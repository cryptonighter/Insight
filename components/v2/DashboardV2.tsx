import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, History, ChevronRight, Zap, Activity } from 'lucide-react';
import { ViewState } from '../../types';

export const DashboardV2: React.FC = () => {
    const { userEconomy, activeResolution, startMorningSession, setView, todaysEntry } = useApp();

    const daysProgress = useMemo(() => {
        if (!activeResolution?.createdAt) return 0;
        const now = Date.now();
        const start = new Date(activeResolution.createdAt).getTime();
        const diff = now - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }, [activeResolution?.createdAt]);

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-y-auto overflow-x-hidden bg-background-light dark:bg-background-dark transition-colors duration-300">
            {/* Background Effects */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-30"></div>

            <header className="relative z-10 flex items-center justify-between px-6 pt-12 pb-2 w-full shrink-0">
                <button
                    onClick={() => setView(ViewState.TRIAGE)} // Placeholder for settings
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <Settings className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 uppercase">Available Capital</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-primary tracking-widest">{userEconomy.balance} TOKENS</span>
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#4ade80]"></div>
                    </div>
                </div>
                <button
                    onClick={() => setView(ViewState.ADMIN)} // Placeholder for history
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <History className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 flex flex-col items-center relative z-10 px-6 w-full max-w-md mx-auto pt-4 pb-4">
                <div className="relative w-full flex flex-col items-center text-center mb-6 group glass-panel rounded-2xl p-6 border border-white/10 shadow-lg hover:bg-white/5 transition-all duration-300">
                    <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-3 opacity-80">Current Directive</p>
                    <div className="w-full bg-white/5 border border-white/5 rounded-xl py-5 px-4 mb-4 backdrop-blur-sm relative overflow-hidden transition-colors group-hover:border-white/10">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight text-glow relative z-10 break-words line-clamp-3">
                            {activeResolution?.statement || "No Active Goal"}
                        </h1>
                    </div>
                    {activeResolution ? (
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/40 bg-white/5 hover:bg-white/10 hover:border-primary/60 transition-all group/protocol w-fit mx-auto cursor-pointer shadow-[0_0_15px_rgba(74,222,128,0.05)]">
                            <span className="text-white/80 text-xs font-medium tracking-wide group-hover/protocol:text-white transition-colors">
                                Protocol: {activeResolution.methodology || "General"}
                            </span>
                            <ChevronRight className="w-4 h-4 text-primary/70 group-hover/protocol:text-primary transition-colors" />
                        </button>
                    ) : (
                        <button
                            onClick={() => setView(ViewState.NEW_RESOLUTION)}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-background-dark font-bold text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)]"
                        >
                            Initialize Objective
                        </button>
                    )}
                </div>

                <div className="glass-panel w-full rounded-xl p-5 mb-4 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5">
                        <div className="h-full bg-primary/40 shadow-[0_0_10px_#4ade80] transition-all duration-1000" style={{ width: `${Math.min(100, (daysProgress / 90) * 100)}%` }}></div>
                    </div>
                    <div className="flex flex-col items-center z-10">
                        <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Timeline Progress</span>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-xl font-bold text-white tracking-tighter text-glow">DAY {daysProgress}</h2>
                            <span className="text-white/30 text-base font-light tracking-wide">/ 90</span>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="relative z-10 w-full px-6 pb-8 pt-2 bg-gradient-to-t from-background-dark via-background-dark to-transparent shrink-0">
                <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
                    <button
                        onClick={() => {
                            if (todaysEntry?.morningGenerated && !todaysEntry?.eveningCompleted) {
                                setView(ViewState.EVENING_REFLECTION);
                            } else {
                                startMorningSession();
                            }
                        }}
                        className="relative group w-64 h-64 rounded-full transition-all duration-500 overflow-hidden flex flex-col items-center justify-center bg-surface border border-primary/30 hover:border-primary/60 shadow-[0_0_20px_rgba(74,222,128,0.1)] hover:shadow-[0_0_40px_rgba(74,222,128,0.2)]"
                    >
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute inset-0 rounded-full border border-white/5 scale-95 pointer-events-none"></div>
                        <div className="flex flex-col items-center justify-center translate-y-[-4px]">
                            <span className="text-5xl font-bold tracking-tight relative z-10 text-white group-hover:text-primary transition-colors duration-300 leading-none">START</span>
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 group-hover:text-white/80 transition-colors z-10 max-w-[140px] text-center mt-2 leading-relaxed">
                                {todaysEntry?.morningGenerated ? "Evening\nReflection" : "Alignment\nSession"}
                            </span>
                        </div>
                    </button>
                    <div className="flex items-center justify-center gap-2 opacity-50">
                        <Zap className="w-4 h-4 text-primary" />
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">
                            {todaysEntry?.morningGenerated ? "Earn: 1 Token" : "Cost: 1 Token"}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';
import { Sparkles, Moon, Sun, Lock, Unlock, Zap, Loader2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const {
        setView,
        userEconomy,
        activeResolution,
        todaysEntry,
        startMorningSession,
        user
    } = useApp();

    const [isRedirecting, setIsRedirecting] = useState(false);

    // Redirect to Onboarding if no active resolution found after sync
    useEffect(() => {
        if (user.supabaseId && activeResolution === null) {
            // Small delay to allow sync to complete to avoid flash
            const timer = setTimeout(() => {
                // Double check
                if (activeResolution === null) {
                    setIsRedirecting(true);
                    setView(ViewState.ONBOARDING);
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [activeResolution, user.supabaseId, setView]);

    const currentHour = new Date().getHours();
    const isMorning = currentHour < 12;

    // Derived States from real data
    const isMorningCompleted = todaysEntry?.morningGenerated || false;
    const isEveningCompleted = todaysEntry?.eveningCompleted || false;

    if (isRedirecting) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>;

    if (!activeResolution) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={20} />
                <span>Syncing Reality...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center bg-gradient-liquid app-text-primary p-6 relative overflow-hidden">

            {/* Header / Economy */}
            <div className="w-full max-w-md flex justify-between items-center z-10 mb-8">
                <div className="flex items-center gap-2 bg-white/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 shadow-sm">
                    <Zap size={16} className="text-amber-500 fill-amber-500" />
                    <span className="font-bold text-slate-800">{userEconomy.balance} Tokens</span>
                </div>
                <button className="p-2 opacity-50 hover:opacity-100 transition-opacity">
                    S
                </button>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-md flex-1 flex flex-col gap-6 z-10 animate-fade-in">

                {/* Goal Card */}
                <div className="glass-card p-6 rounded-2xl border-l-4 border-indigo-500">
                    <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-semibold">Current Resolution</h3>
                    <p className="text-lg font-medium text-slate-800 leading-snug">"{activeResolution.statement}"</p>
                    <p className="text-sm text-slate-500 italic mt-2">because {activeResolution.rootMotivation}</p>
                </div>

                {/* The Action Loop */}
                <div className="flex flex-col gap-4 mt-4">

                    {/* Morning Tile */}
                    <div className={`relative p-6 rounded-2xl border transition-all ${isMorning ? 'bg-white/60 border-indigo-200 shadow-xl scale-105 ring-2 ring-indigo-400/20' : 'bg-white/20 border-white/40 grayscale opacity-80'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                                <Sun size={24} />
                            </div>
                            {isMorningCompleted && <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">Completed</div>}
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800">Morning Alignment</h2>
                        <p className="text-sm text-slate-500 mt-1">Visualize the path. 1 Token.</p>

                        <button
                            onClick={startMorningSession}
                            disabled={isMorningCompleted || (!isMorning && !isMorningCompleted)}
                            className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                        >
                            {isMorningCompleted ? "Completed" : "Start Session (-1 Token)"}
                        </button>
                    </div>

                    {/* Evening Tile */}
                    <div className={`relative p-6 rounded-2xl border transition-all ${!isMorning ? 'bg-white/60 border-indigo-200 shadow-xl scale-105 ring-2 ring-indigo-400/20' : 'bg-white/20 border-white/40 grayscale opacity-80'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                                <Moon size={24} />
                            </div>
                            {isEveningCompleted ?
                                <Unlock size={20} className="text-green-500" /> :
                                <Lock size={20} className="text-slate-400" />
                            }
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800">Evening Reflection</h2>
                        <p className="text-sm text-slate-500 mt-1">Log your progress. Earn 1 Token.</p>

                        <button
                            onClick={() => setView(ViewState.EVENING_REFLECTION)}
                            disabled={isEveningCompleted}
                            className="w-full mt-4 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors"
                        >
                            {isEveningCompleted ? "Logged" : "Begin Reflection"}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
